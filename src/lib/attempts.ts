import { adminDb } from './firebase-admin';

interface StartAttemptParams {
  studentId: string;
  module: 'reading' | 'listening' | 'writing' | 'speaking';
  taskId: string;
  questionType?: string; // reading/listening use this; writing/speaking may not
  timerSeconds: number;
  maxAttempts: number;
}

interface StartAttemptResult {
  attemptId: string;
  startTime: string;
  attemptNumber: number;
}

/**
 * Starts (or resumes) an attempt for any module. Handles:
 * - Enforcing max attempts based on COMPLETED attempts only
 * - Resuming a genuinely still-active in-progress attempt
 * - Auto-expiring a stale in-progress attempt (past its timer) before starting fresh
 */
export async function startAttemptShared(params: StartAttemptParams): Promise<StartAttemptResult> {
  const { studentId, module, taskId, questionType, timerSeconds, maxAttempts } = params;

  const existing = await adminDb
    .collection('attempts')
    .where('studentId', '==', studentId)
    .where('taskId', '==', taskId)
    .get();

  const completedCount = existing.docs.filter((d) => d.data().status === 'completed').length;

  if (completedCount >= maxAttempts) {
    throw new Error('Maximum attempts reached for this task.');
  }

  const inProgress = existing.docs.find((d) => d.data().status === 'in_progress');

  if (inProgress) {
    const existingStart = new Date(inProgress.data().startTime).getTime();
    const elapsedSeconds = (Date.now() - existingStart) / 1000;

    if (elapsedSeconds < timerSeconds) {
      // Still genuinely active — resume it
      return {
        attemptId: inProgress.id,
        startTime: inProgress.data().startTime,
        attemptNumber: inProgress.data().attemptNumber,
      };
    }

    // Stale — auto-expire it
    await inProgress.ref.update({
      status: 'completed',
      submissionTime: new Date().toISOString(),
      studentAnswers: {},
      score: 0,
      note: 'Auto-expired stale in-progress attempt',
    });

    if (completedCount + 1 >= maxAttempts) {
      throw new Error('Maximum attempts reached for this task.');
    }
  }

  // Create a fresh attempt
  const startTime = new Date().toISOString();
  const attemptNumber = completedCount + (inProgress ? 2 : 1);

  const attemptRef = await adminDb.collection('attempts').add({
    studentId,
    module,
    questionType: questionType ?? null,
    taskId,
    attemptNumber,
    status: 'in_progress',
    startTime,
    studentAnswers: {},
  });

  return { attemptId: attemptRef.id, startTime, attemptNumber };
}

/**
 * Submits an attempt for auto-scored modules (Reading/Listening) —
 * compares studentAnswers against correctAnswers and computes a score.
 */
export async function submitAutoScoredAttempt(
  attemptId: string,
  correctAnswers: Record<string, string>,
  studentAnswers: Record<string, string>
) {
  let score = 0;
  const total = Object.keys(correctAnswers).length;
  Object.entries(correctAnswers).forEach(([qId, correct]) => {
    if (studentAnswers[qId] === correct) score++;
  });

  await adminDb.collection('attempts').doc(attemptId).update({
    status: 'completed',
    submissionTime: new Date().toISOString(),
    studentAnswers,
    correctAnswers,
    score,
  });

  return { score, total };
}

/**
 * Gets how many completed attempts a student has used for a given task.
 * Used by task-list pages to show "X/N attempts used" and lock cards.
 */
export async function getAttemptCounts(
  studentId: string,
  module: string,
  questionType: string
): Promise<Record<string, number>> {
  const snap = await adminDb
    .collection('attempts')
    .where('studentId', '==', studentId)
    .where('module', '==', module)
    .where('questionType', '==', questionType)
    .get();

  const counts: Record<string, number> = {};
  snap.docs.forEach((doc) => {
    const { taskId, status } = doc.data();
    if (status === 'completed') {
      counts[taskId] = (counts[taskId] || 0) + 1;
    }
  });
  return counts;
}