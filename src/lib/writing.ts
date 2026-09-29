import { FieldValue, type DocumentSnapshot } from 'firebase-admin/firestore';
import { adminDb } from './firebase-admin';
import { getPlaybackUrl } from './r2-presign';
import { evaluateWriting } from './writing-eval';
import {
  MAX_WRITING_ATTEMPTS,
  WRITING_PARTS,
  countWords,
  type AttemptResult,
  type WritingPart,
} from './writing-config';

const attempts = () => adminDb.collection('attempts');

export function toResult(doc: DocumentSnapshot): AttemptResult {
  const d = doc.data()!;
  return {
    id: doc.id,
    attemptNumber: d.attemptNumber as number,
    wordCount: (d.wordCount ?? 0) as number,
    response: (d.response ?? '') as string,
    status: (d.evaluationStatus ?? 'pending') as AttemptResult['status'],
    evaluation: (d.evaluation ?? null) as AttemptResult['evaluation'],
  };
}

export async function listSubmittedResults(studentId: string, promptId: string) {
  const snap = await attempts()
    .where('studentId', '==', studentId)
    .where('module', '==', 'writing')
    .where('taskId', '==', promptId)
    .get();

  return snap.docs
    .filter((d) => d.get('submittedAt'))
    .map(toResult)
    .sort((a, b) => a.attemptNumber - b.attemptNumber);
}

async function getOwnedAttempt(studentId: string, attemptId: string) {
  const ref = attempts().doc(attemptId);
  const snap = await ref.get();
  if (!snap.exists || snap.get('studentId') !== studentId || snap.get('module') !== 'writing') {
    throw new Error('Attempt not found.');
  }
  return { ref, snap };
}

async function runEvaluation(attemptId: string): Promise<AttemptResult> {
  const ref = attempts().doc(attemptId);
  const a = (await ref.get()).data()!;
  const p = (await adminDb.collection('writingPrompts').doc(a.taskId).get()).data()!;

  try {
    const imageUrl = p.imageKey ? await getPlaybackUrl(p.imageKey as string) : undefined;
    const evaluation = await evaluateWriting({
      part: p.taskPart as WritingPart,
      prompt: p.prompt as string,
      response: a.response as string,
      imageUrl,
    });
    await ref.update({ evaluation, bandScore: evaluation.overall, evaluationStatus: 'done' });
  } catch (err) {
    console.error('Writing evaluation failed:', err);
    await ref.update({ evaluationStatus: 'failed' });
  }

  return toResult(await ref.get());
}

async function finalizeAttempt(studentId: string, attemptId: string, text: string) {
  const { ref, snap } = await getOwnedAttempt(studentId, attemptId);
  if (snap.get('submittedAt')) return toResult(snap); // already submitted, never evaluate twice

  const response = text.slice(0, 20000);
  await ref.update({
    response,
    wordCount: countWords(response),
    submittedAt: Date.now(),
    evaluationStatus: 'pending',
  });
  return runEvaluation(attemptId);
}

export async function startAttempt(studentId: string, promptId: string) {
  const promptDoc = await adminDb.collection('writingPrompts').doc(promptId).get();
  if (!promptDoc.exists) throw new Error('Question not found.');
  const prompt = promptDoc.data()!;
  const part = prompt.taskPart as WritingPart;
  const timerSeconds = ((prompt.timerMinutes as number | undefined) ?? WRITING_PARTS[part].timerMinutes) * 60;

  const snap = await attempts()
    .where('studentId', '==', studentId)
    .where('module', '==', 'writing')
    .where('taskId', '==', promptId)
    .get();
  const docs = snap.docs.sort((a, b) => a.get('attemptNumber') - b.get('attemptNumber'));

  // Resume an attempt that was left open and still has time
  const open = docs.find((d) => !d.get('submittedAt'));
  if (open) {
    const startTime = open.get('startTime') as number;
    if (Date.now() < startTime + timerSeconds * 1000 + 5000) {
      return {
        attemptId: open.id,
        attemptNumber: open.get('attemptNumber') as number,
        startTime,
        timerSeconds,
        draft: (open.get('draft') ?? '') as string,
      };
    }
    // Time ran out while away: submit what was saved
    await finalizeAttempt(studentId, open.id, (open.get('draft') ?? '') as string);
  }

  if (docs.length >= MAX_WRITING_ATTEMPTS) throw new Error('You have used all 3 attempts for this question.');

  const startTime = Date.now();
  const ref = await attempts().add({
    studentId,
    module: 'writing',
    taskId: promptId,
    questionType: prompt.category,
    attemptNumber: docs.length + 1,
    startTime,
    timerSeconds,
    draft: '',
    createdAt: FieldValue.serverTimestamp(),
  });

  return { attemptId: ref.id, attemptNumber: docs.length + 1, startTime, timerSeconds, draft: '' };
}

export async function saveDraftText(studentId: string, attemptId: string, text: string) {
  const { ref, snap } = await getOwnedAttempt(studentId, attemptId);
  if (snap.get('submittedAt')) return;
  await ref.update({ draft: text.slice(0, 20000) });
}

export const submitAttemptText = finalizeAttempt;

export async function retryAttemptEvaluation(studentId: string, attemptId: string) {
  const { snap } = await getOwnedAttempt(studentId, attemptId);
  if (!snap.get('submittedAt')) throw new Error('This attempt has not been submitted.');
  if (snap.get('evaluationStatus') === 'done') return toResult(snap);
  return runEvaluation(attemptId);
}