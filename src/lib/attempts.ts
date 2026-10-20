import { adminDb } from './firebase-admin';
import type { QueryDocumentSnapshot } from 'firebase-admin/firestore';

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

export interface AutoScoredAttemptResult {
  id: string;
  attemptNumber: number;
  score: number;
  total: number;
  answers: Record<string, string>;
  correctAnswers: Record<string, string>;
  acceptedAnswers: Record<string, string[]>;
  explanations: Record<string, string>;
}

function stringMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  );
}

function stringArrayMap(value: unknown): Record<string, string[]> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter((entry): entry is [string, unknown[]] => Array.isArray(entry[1]))
      .map(([key, values]) => [key, values.filter((item): item is string => typeof item === 'string')]),
  );
}

export async function listAutoScoredResults(
  studentId: string,
  module: 'reading' | 'listening',
  taskId: string,
  questionFeedback: { id: string; alternativeAnswers?: string[]; explanation?: string }[] = [],
): Promise<AutoScoredAttemptResult[]> {
  const snap = await adminDb
    .collection('attempts')
    .where('studentId', '==', studentId)
    .where('module', '==', module)
    .where('taskId', '==', taskId)
    .get();

  const docs: QueryDocumentSnapshot[] = snap.docs;
  const feedbackByQuestion = new Map(questionFeedback.map((question) => [question.id, question]));
  return docs
    .filter(
      (doc) =>
        doc.get('status') === 'completed' &&
        typeof doc.get('score') === 'number' &&
        Object.keys(stringMap(doc.get('correctAnswers'))).length > 0,
    )
    .map((doc) => {
      const data = doc.data();
      const correctAnswers = stringMap(data.correctAnswers);
      const alternatives = stringArrayMap(data.alternativeAnswers);
      const storedAccepted = stringArrayMap(data.acceptedAnswers);
      const acceptedAnswers = Object.fromEntries(
        Object.entries(correctAnswers).map(([id, answer]) => [
          id,
          storedAccepted[id] ?? [
            answer,
            ...(alternatives[id] ?? feedbackByQuestion.get(id)?.alternativeAnswers ?? []),
          ],
        ]),
      );

      return {
        id: doc.id,
        attemptNumber: Number(data.attemptNumber) || 1,
        score: data.score as number,
        total: Object.keys(correctAnswers).length,
        answers: stringMap(data.studentAnswers),
        correctAnswers,
        acceptedAnswers,
        explanations: Object.fromEntries([
          ...questionFeedback.flatMap((question) =>
            typeof question.explanation === 'string' && question.explanation
              ? [[question.id, question.explanation] as const]
              : [],
          ),
          ...Object.entries(stringMap(data.explanations)),
        ]),
      };
    })
    .sort((a, b) => a.attemptNumber - b.attemptNumber);
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
 * Returns correctAnswers too, so the client can show the review screen
 * without ever holding the answers before submission.
 */
export async function submitAutoScoredAttempt(
  attemptId: string,
  correctAnswers: Record<string, string>,
  studentAnswers: Record<string, string>,
  alternativeAnswers: Record<string, string[]> = {},
  multipleAnswerIds: string[] = [],
  wordLimits: Record<string, number> = {},
  explanations: Record<string, string> = {},
) {
  let score = 0;
  const total = Object.keys(correctAnswers).length;
  const multipleAnswers = new Set(multipleAnswerIds);
  Object.entries(correctAnswers).forEach(([qId, correct]) => {
    const studentAnswer = studentAnswers[qId] ?? '';
    const wordLimit = wordLimits[qId];
    if (wordLimit) {
      const answerCount = multipleAnswers.has(qId)
        ? (() => {
            try {
              const values = JSON.parse(studentAnswer) as unknown;
              return Array.isArray(values) ? values.length : 0;
            } catch {
              return 0;
            }
          })()
        : studentAnswer.trim().split(/\s+/).filter(Boolean).length;
      if (answerCount > wordLimit) return;
    }
    const normalizeText = (answer: string) => answer.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
    const normalizeSet = (answer: string) => {
      const trimmed = answer.trim();
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        if (Array.isArray(parsed) && parsed.every((value) => typeof value === 'string')) {
          return parsed.map((value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase()).sort().join('\u001f');
        }
      } catch {
        return trimmed.replace(/\s+/g, ' ').toLocaleLowerCase();
      }
      return trimmed.replace(/\s+/g, ' ').toLocaleLowerCase();
    };
    if (multipleAnswers.has(qId)) {
      const accepted = [correct, ...(alternativeAnswers[qId] ?? [])].map(normalizeSet);
      if (accepted.includes(normalizeSet(studentAnswer))) score++;
    } else if (alternativeAnswers[qId]?.length) {
      const accepted = [correct, ...alternativeAnswers[qId]].map(normalizeText);
      if (accepted.includes(normalizeText(studentAnswer))) score++;
    } else if (studentAnswer === correct) {
      score++;
    }
  });

  await adminDb.collection('attempts').doc(attemptId).update({
    status: 'completed',
    submissionTime: new Date().toISOString(),
    studentAnswers,
    correctAnswers,
    alternativeAnswers,
    explanations,
    total,
    score,
  });

  return { score, total, correctAnswers, alternativeAnswers };
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