import { FieldValue, type DocumentSnapshot } from 'firebase-admin/firestore';
import { adminDb } from './firebase-admin';
import { getPlaybackUrl, getUploadUrl } from './r2-presign';
import { evaluateSpeaking, transcribeAudio } from './speaking-eval';
import { MAX_SPEAKING_ATTEMPTS, MAX_SPEAK_SECONDS, type SpeakingResult } from './speaking-config';

const attempts = () => adminDb.collection('attempts');

export async function toResult(doc: DocumentSnapshot): Promise<SpeakingResult> {
  const d = doc.data()!;
  return {
    id: doc.id,
    attemptNumber: d.attemptNumber as number,
    status: (d.evaluationStatus ?? 'pending') as SpeakingResult['status'],
    transcript: (d.transcript ?? '') as string,
    durationSeconds: (d.durationSeconds ?? 0) as number,
    audioUrl: d.audioKey ? await getPlaybackUrl(d.audioKey as string) : null,
    evaluation: (d.evaluation ?? null) as SpeakingResult['evaluation'],
  };
}

export async function listSubmittedResults(studentId: string, promptId: string) {
  const snap = await attempts()
    .where('studentId', '==', studentId)
    .where('module', '==', 'speaking')
    .where('taskId', '==', promptId)
    .get();

  const submitted = snap.docs
    .filter((d) => d.get('submittedAt'))
    .sort((a, b) => a.get('attemptNumber') - b.get('attemptNumber'));
  return Promise.all(submitted.map(toResult));
}

async function getOwnedAttempt(studentId: string, attemptId: string) {
  const ref = attempts().doc(attemptId);
  const snap = await ref.get();
  if (!snap.exists || snap.get('studentId') !== studentId || snap.get('module') !== 'speaking') {
    throw new Error('Attempt not found.');
  }
  return { ref, snap };
}

async function runEvaluation(attemptId: string): Promise<SpeakingResult> {
  const ref = attempts().doc(attemptId);
  const a = (await ref.get()).data()!;
  const p = (await adminDb.collection('speakingPrompts').doc(a.taskId).get()).data()!;

  try {
    let transcript = (a.transcript ?? '') as string;

    // Transcribe only once, so a retry after a scoring failure doesn't pay for it twice
    if (!transcript) {
      const res = await fetch(await getPlaybackUrl(a.audioKey as string));
      if (!res.ok) throw new Error(`Could not read the recording (${res.status})`);
      const contentType = (a.audioContentType as string | undefined) ?? 'audio/webm';
      transcript = await transcribeAudio(Buffer.from(await res.arrayBuffer()), contentType);
      await ref.update({ transcript });
    }

    const evaluation = await evaluateSpeaking({
      topic: p.topic as string,
      bullets: (p.bullets ?? []) as string[],
      transcript,
      durationSeconds: (a.durationSeconds ?? 0) as number,
    });
    await ref.update({
      evaluation,
      bandScore: evaluation.overall,
      evaluationStatus: 'done',
      evaluationError: FieldValue.delete(),
    });
  } catch (err) {
    console.error('Speaking evaluation failed:', err);
    await ref.update({
      evaluationStatus: 'failed',
      evaluationError: err instanceof Error ? err.message.slice(0, 300) : 'Unknown error',
    });
  }

  return toResult(await ref.get());
}

/** Only submitted attempts count. An abandoned, unsubmitted attempt is reused. */
export async function startAttempt(studentId: string, promptId: string) {
  const promptDoc = await adminDb.collection('speakingPrompts').doc(promptId).get();
  if (!promptDoc.exists) throw new Error('Cue card not found.');

  const snap = await attempts()
    .where('studentId', '==', studentId)
    .where('module', '==', 'speaking')
    .where('taskId', '==', promptId)
    .get();

  const submitted = snap.docs.filter((d) => d.get('submittedAt'));
  if (submitted.length >= MAX_SPEAKING_ATTEMPTS) {
    throw new Error(`You have used both attempts for this cue card.`);
  }

  const open = snap.docs.find((d) => !d.get('submittedAt'));
  if (open) return { attemptId: open.id, attemptNumber: open.get('attemptNumber') as number };

  const attemptNumber = submitted.length + 1;
  const ref = await attempts().add({
    studentId,
    module: 'speaking',
    taskId: promptId,
    questionType: 'Part 2 Cue Card',
    attemptNumber,
    startTime: Date.now(),
    createdAt: FieldValue.serverTimestamp(),
  });
  return { attemptId: ref.id, attemptNumber };
}

export async function createUploadTarget(studentId: string, attemptId: string, contentType: string) {
  const { ref, snap } = await getOwnedAttempt(studentId, attemptId);
  if (snap.get('submittedAt')) throw new Error('This attempt has already been submitted.');
  if (!contentType.startsWith('audio/')) throw new Error('Unsupported recording format.');

  const ext = contentType.includes('mp4') ? 'mp4' : 'webm';
  const key = `speaking/${studentId}/${attemptId}.${ext}`;
  const uploadUrl = await getUploadUrl(key, contentType);
  await ref.update({ audioKey: key, audioContentType: contentType });
  return { uploadUrl };
}

export async function submitAttempt(studentId: string, attemptId: string, durationSeconds: number) {
  const { ref, snap } = await getOwnedAttempt(studentId, attemptId);
  if (snap.get('submittedAt')) return toResult(snap); // never evaluate twice
  if (!snap.get('audioKey')) throw new Error('No recording was uploaded.');

  await ref.update({
    durationSeconds: Math.min(MAX_SPEAK_SECONDS, Math.max(0, Math.round(durationSeconds))),
    submittedAt: Date.now(),
    evaluationStatus: 'pending',
  });
  return runEvaluation(attemptId);
}

export async function retryAttemptEvaluation(studentId: string, attemptId: string) {
  const { snap } = await getOwnedAttempt(studentId, attemptId);
  if (!snap.get('submittedAt')) throw new Error('This attempt has not been submitted.');
  if (snap.get('evaluationStatus') === 'done') return toResult(snap);
  return runEvaluation(attemptId);
}