import { cookies } from 'next/headers';
import { adminAuth, adminDb } from './firebase-admin';
import { getPlaybackUrl } from './r2-presign';
import { evaluateWriting } from './writing-eval';
import { countWords } from './writing-config';
import {
  MOCK_SECTIONS,
  RESUME_GRACE_SECONDS,
  SECTION_MINUTES,
  estimateBand,
  writingBand,
  type MockListItem,
  type MockLoad,
  type MockResultView,
  type MockSection,
  type ObjectiveResult,
  type ReviewItem,
  type RunnerResult,
  type RunnerState,
  type SaveOutcome,
  type SectionPayload,
  type WritingTaskResult,
} from './mock-config';

type AttemptData = { [key: string]: any };
type CloseReason = 'submitted' | 'timeout' | 'left';

const REISSUE_WINDOW_MS = 30 * 1000; // lets a failed audio load be retried
const EVAL_STALE_MS = 3 * 60 * 1000;

export async function getSessionStudentId() {
  const sessionCookie = (await cookies()).get('session')?.value;
  if (!sessionCookie) throw new Error('Please sign in again.');
  const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
  return decoded.uid;
}

// One fixed document per student and mock: this is what makes "attempt once" airtight
const attemptRef = (studentId: string, mockId: string) =>
  adminDb.collection('mockAttempts').doc(`${studentId}__${mockId}`);

const sectionEnd = (a: AttemptData, section: MockSection) => {
  const start = a.sectionStartedAt?.[section] as number | undefined;
  return start ? start + SECTION_MINUTES[section] * 60 * 1000 : null;
};

/* ───────── Grading ───────── */

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

function gradeObjective(
  section: 'listening' | 'reading',
  parts: AttemptData[],
  answers: { [key: string]: string },
): ObjectiveResult {
  let raw = 0;
  let total = 0;
  let number = 0;
  const review: ReviewItem[] = [];

  parts.forEach((part, i) => {
    for (const q of part.questions ?? []) {
      number += 1;
      const expected = String(part.correctAnswers?.[q.id] ?? '').trim();
      const given = String(answers?.[`p${i}_${q.id}`] ?? '').trim();
      const correct = !!expected && norm(given) === norm(expected);
      if (expected) total += 1;
      if (correct) raw += 1;
      review.push({
        partTitle: part.title,
        number,
        text: q.text,
        yourAnswer: given,
        correct,
        correctAnswer: correct ? null : expected || null,
      });
    }
  });

  return { raw, total, band: estimateBand(section, raw, total), review };
}

async function buildResult(mock: AttemptData, a: AttemptData) {
  const listening = gradeObjective('listening', mock.listening ?? [], a.answers?.listening ?? {});
  const reading = gradeObjective('reading', mock.reading ?? [], a.answers?.reading ?? {});
  const written = a.answers?.writing ?? {};

  const writingTask = async (key: 'task1' | 'task2') => {
    const response = String(written[key] ?? '');
    if (response.trim()) {
      return { status: 'pending', response, wordCount: countWords(response), evaluation: null };
    }
    // An empty response scores 0 without calling the AI
    const evaluation = await evaluateWriting({ part: key, prompt: mock.writing?.[key]?.prompt ?? '', response: '' });
    return { status: 'done', response, wordCount: 0, evaluation };
  };

  return { listening, reading, writing: { task1: await writingTask('task1'), task2: await writingTask('task2') } };
}

/* ───────── Attempt lifecycle ───────── */

async function closeAttempt(studentId: string, mockId: string, reason: CloseReason, endedAt = Date.now()) {
  const ref = attemptRef(studentId, mockId);
  const snap = await ref.get();
  if (!snap.exists || snap.get('status') !== 'active') return;

  const mockDoc = await adminDb.collection('mockTests').doc(mockId).get();
  const mock = mockDoc.data();
  if (!mock) throw new Error('This mock test is no longer available.');

  const result = await buildResult(mock, snap.data()!);

  await adminDb.runTransaction(async (tx) => {
    const fresh = await tx.get(ref);
    if (fresh.get('status') !== 'active') return; // someone else closed it first
    tx.update(ref, { status: 'closed', closeReason: reason, closedAt: endedAt, result });
  });
}

/**
 * Brings an attempt up to date: closes it if the student has been gone too long,
 * and moves it on (or closes it) when a section's time has run out.
 */
async function syncAttempt(studentId: string, mockId: string, graceMs: number, touch = false) {
  const ref = attemptRef(studentId, mockId);
  const snap = await ref.get();
  if (!snap.exists) return { status: 'none' as const, ref, a: null };

  let a: AttemptData = snap.data()!;
  if (a.status !== 'active') return { status: 'closed' as const, ref, a };

  const now = Date.now();
  const lastSeen = (a.lastSeenAt ?? a.startedAt) as number;
  if (now - lastSeen > RESUME_GRACE_SECONDS * 1000) {
    await closeAttempt(studentId, mockId, 'left', lastSeen);
    return { status: 'closed' as const, ref, a };
  }

  for (let i = 0; i < 3; i++) {
    const end = sectionEnd(a, a.section);
    if (end === null || now - graceMs <= end) break;

    if (a.section === 'writing') {
      await closeAttempt(studentId, mockId, 'timeout', end);
      return { status: 'closed' as const, ref, a };
    }
    const next = MOCK_SECTIONS[MOCK_SECTIONS.indexOf(a.section) + 1];
    await ref.update({ section: next, [`sectionStartedAt.${next}`]: end });
    a = { ...a, section: next, sectionStartedAt: { ...a.sectionStartedAt, [next]: end } };
  }

  if (touch) await ref.update({ lastSeenAt: now });
  return { status: 'active' as const, ref, a };
}

async function buildState(mockId: string, a: AttemptData): Promise<RunnerState> {
  const mockDoc = await adminDb.collection('mockTests').doc(mockId).get();
  if (!mockDoc.exists) throw new Error('This mock test is no longer available.');
  const mock = mockDoc.data()!;

  const section = a.section as MockSection;
  const start = a.sectionStartedAt[section] as number;
  const now = Date.now();
  let payload: SectionPayload;

  if (section === 'listening') {
    const parts = await Promise.all(
      (mock.listening ?? []).map(async (p: AttemptData, index: number) => ({
        index,
        title: p.title as string,
        instructions: (p.instructions ?? '') as string,
        hasAudio: !!p.audioKey,
        diagramUrl: p.diagramKey ? await getPlaybackUrl(p.diagramKey as string) : null,
        questions: (p.questions ?? []).map((q: AttemptData) => ({
          id: q.id,
          kind: q.kind,
          text: q.text,
          options: q.options,
          wordLimit: q.wordLimit,
        })),
      })),
    );
    const issued = (a.audioIssued ?? {}) as { [key: string]: number };
    const playedParts = Object.keys(issued)
      .filter((k) => now - issued[k] > REISSUE_WINDOW_MS)
      .map(Number);
    payload = { section, parts, playedParts };
  } else if (section === 'reading') {
    payload = {
      section,
      parts: (mock.reading ?? []).map((p: AttemptData, index: number) => ({
        index,
        title: p.title as string,
        instructions: (p.instructions ?? '') as string,
        passage: p.passage as string,
        questions: (p.questions ?? []).map((q: AttemptData) => ({
          id: q.id,
          text: q.text,
          options: q.options,
        })),
      })),
    };
  } else {
    const t1 = mock.writing?.task1 ?? {};
    payload = {
      section,
      task1: {
        prompt: (t1.prompt ?? '') as string,
        imageUrl: t1.imageKey ? await getPlaybackUrl(t1.imageKey as string) : null,
      },
      task2: { prompt: (mock.writing?.task2?.prompt ?? '') as string },
    };
  }

  return {
    title: a.mockTitle as string,
    mockNumber: a.mockNumber as number,
    section,
    sectionEndsAt: start + SECTION_MINUTES[section] * 60 * 1000,
    serverNow: now,
    answers: (a.answers?.[section] ?? {}) as { [key: string]: string },
    payload,
  };
}

/* ───────── Public API used by pages and actions ───────── */

export async function loadMock(studentId: string, mockId: string): Promise<MockLoad> {
  const mockDoc = await adminDb.collection('mockTests').doc(mockId).get();
  const s = await syncAttempt(studentId, mockId, 0, true);

  if (s.status === 'closed') return { kind: 'closed' };
  if (!mockDoc.exists) return { kind: 'missing' };
  if (s.status === 'none') {
    return {
      kind: 'not_started',
      title: mockDoc.get('title') as string,
      mockNumber: mockDoc.get('mockNumber') as number,
    };
  }
  return { kind: 'active', state: await buildState(mockId, s.a!) };
}

export async function startMock(studentId: string, mockId: string): Promise<RunnerState> {
  const mockDoc = await adminDb.collection('mockTests').doc(mockId).get();
  if (!mockDoc.exists) throw new Error('Mock test not found.');

  const now = Date.now();
  const data = {
    studentId,
    mockId,
    mockNumber: mockDoc.get('mockNumber') as number,
    mockTitle: mockDoc.get('title') as string,
    status: 'active',
    startedAt: now,
    lastSeenAt: now,
    section: 'listening',
    sectionStartedAt: { listening: now },
    answers: { listening: {}, reading: {}, writing: {} },
    audioIssued: {},
  };

  try {
    await attemptRef(studentId, mockId).create(data);
  } catch (err) {
    if ((err as { code?: number }).code === 6) {
      throw new Error('You have already started this mock test. It can only be attempted once.');
    }
    throw err;
  }
  return buildState(mockId, data);
}

function cleanAnswers(input: { [key: string]: string }) {
  const out: { [key: string]: string } = {};
  for (const [k, v] of Object.entries(input ?? {}).slice(0, 200)) {
    if (typeof v === 'string' && /^[\w-]{1,60}$/.test(k)) out[k] = v.slice(0, 20000);
  }
  return out;
}

export async function saveProgress(
  studentId: string,
  mockId: string,
  section: MockSection,
  answers: { [key: string]: string },
): Promise<SaveOutcome> {
  // 8 seconds of grace so the last keystrokes before the buzzer are still kept
  const s = await syncAttempt(studentId, mockId, 8000);
  if (s.status !== 'active') return 'closed';
  if (s.a!.section !== section) return 'moved';

  const now = Date.now();
  const clean = cleanAnswers(answers);
  if (Object.keys(clean).length === 0) {
    await s.ref.update({ lastSeenAt: now }); // heartbeat only
  } else {
    await s.ref.set({ answers: { [section]: clean }, lastSeenAt: now }, { merge: true });
  }
  return 'ok';
}

export async function advanceSection(studentId: string, mockId: string, from: MockSection): Promise<RunnerResult> {
  const s = await syncAttempt(studentId, mockId, 0);
  if (s.status !== 'active') return { closed: true };

  const a = s.a!;
  if (a.section === from) {
    if (from === 'writing') {
      await closeAttempt(studentId, mockId, 'submitted');
      return { closed: true };
    }
    const next = MOCK_SECTIONS[MOCK_SECTIONS.indexOf(from) + 1];
    const now = Date.now();
    await s.ref.update({ section: next, [`sectionStartedAt.${next}`]: now, lastSeenAt: now });
    a.section = next;
    a.sectionStartedAt = { ...a.sectionStartedAt, [next]: now };
  }
  // If the server already moved on (timeout), this just returns the current section
  return { closed: false, state: await buildState(mockId, a) };
}

export async function issueAudio(studentId: string, mockId: string, partIndex: number) {
  const s = await syncAttempt(studentId, mockId, 0);
  if (s.status !== 'active') throw new Error('This mock test is closed.');
  if (s.a!.section !== 'listening') throw new Error('The listening section is over.');

  const mockDoc = await adminDb.collection('mockTests').doc(mockId).get();
  const part = mockDoc.get('listening')?.[partIndex];
  if (!part?.audioKey) throw new Error('This part has no recording.');

  const issued = s.a!.audioIssued?.[String(partIndex)] as number | undefined;
  const now = Date.now();
  if (issued && now - issued > REISSUE_WINDOW_MS) {
    throw new Error('This recording has already been played. It plays only once.');
  }
  if (!issued) await s.ref.update({ [`audioIssued.${partIndex}`]: now });

  return { url: await getPlaybackUrl(part.audioKey as string) };
}

export async function leaveMock(studentId: string, mockId: string) {
  await closeAttempt(studentId, mockId, 'left');
}

export async function listMocks(studentId: string): Promise<MockListItem[]> {
  const [mocksSnap, attemptsSnap] = await Promise.all([
    adminDb.collection('mockTests').orderBy('mockNumber').select('mockNumber', 'title').get(),
    adminDb.collection('mockAttempts').where('studentId', '==', studentId).select('mockId', 'status').get(),
  ]);

  // Settles any attempt whose student walked away, so it shows as completed
  const status: { [mockId: string]: string } = {};
  await Promise.all(
    attemptsSnap.docs.map(async (d) => {
      const mockId = d.get('mockId') as string;
      status[mockId] =
        d.get('status') === 'active' ? (await syncAttempt(studentId, mockId, 0)).status : 'closed';
    }),
  );

  return mocksSnap.docs.map((d) => ({
    id: d.id,
    mockNumber: d.get('mockNumber') as number,
    title: d.get('title') as string,
    state: !status[d.id] ? 'not_started' : status[d.id] === 'active' ? 'in_progress' : 'completed',
  }));
}

/* ───────── Results ───────── */

function toWritingTask(t: AttemptData): WritingTaskResult {
  return {
    status: t.status,
    response: t.response ?? '',
    wordCount: t.wordCount ?? 0,
    evaluation: t.evaluation ?? null,
  };
}

function toResultView(a: AttemptData): MockResultView {
  const r = a.result;
  const t1 = toWritingTask(r.writing.task1);
  const t2 = toWritingTask(r.writing.task2);
  const band =
    t1.status === 'done' && t2.status === 'done' && t1.evaluation && t2.evaluation
      ? writingBand(t1.evaluation.overall, t2.evaluation.overall)
      : null;

  return {
    mockNumber: a.mockNumber,
    title: a.mockTitle,
    closeReason: a.closeReason,
    listening: r.listening,
    reading: r.reading,
    writing: { task1: t1, task2: t2, band },
  };
}

export async function getResultView(
  studentId: string,
  mockId: string,
): Promise<{ status: 'none' } | { status: 'active' } | { status: 'ready'; view: MockResultView }> {
  const s = await syncAttempt(studentId, mockId, 0);
  if (s.status === 'none') return { status: 'none' };
  if (s.status === 'active') return { status: 'active' };
  const fresh = await s.ref.get();
  return { status: 'ready', view: toResultView(fresh.data()!) };
}

export async function evaluateMockWriting(studentId: string, mockId: string): Promise<MockResultView> {
  const s = await syncAttempt(studentId, mockId, 0);
  if (s.status !== 'closed') throw new Error('Finish the mock test first.');

  const ref = s.ref;
  const mock = (await adminDb.collection('mockTests').doc(mockId).get()).data();
  const keys: ('task1' | 'task2')[] = ['task1', 'task2'];

  await Promise.all(
    keys.map(async (key) => {
      const now = Date.now();
      // Claim the task so two open tabs never evaluate (and pay for) the same answer twice
      const response = await adminDb.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const t = snap.get(`result.writing.${key}`);
        if (!t) return null;
        const stale = t.status === 'running' && now - (t.runningSince ?? 0) > EVAL_STALE_MS;
        if (t.status === 'done' || (t.status === 'running' && !stale)) return null;
        tx.update(ref, {
          [`result.writing.${key}.status`]: 'running',
          [`result.writing.${key}.runningSince`]: now,
        });
        return (t.response ?? '') as string;
      });
      if (response === null) return;

      try {
        if (!mock) throw new Error('Mock test content is no longer available.');
        const w = mock.writing?.[key];
        const imageUrl = key === 'task1' && w?.imageKey ? await getPlaybackUrl(w.imageKey as string) : undefined;
        const evaluation = await evaluateWriting({ part: key, prompt: w?.prompt ?? '', response, imageUrl });
        await ref.update({
          [`result.writing.${key}.status`]: 'done',
          [`result.writing.${key}.evaluation`]: evaluation,
        });
      } catch (err) {
        console.error(`Mock writing evaluation failed (${key}):`, err);
        await ref.update({ [`result.writing.${key}.status`]: 'failed' });
      }
    }),
  );

  return toResultView((await ref.get()).data()!);
}