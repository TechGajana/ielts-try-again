'use server';

import { cookies } from 'next/headers';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { startAttemptShared } from '@/lib/attempts';

async function getStudentId() {
  const session = (await cookies()).get('session')?.value;
  if (!session) throw new Error('Your session has expired. Please sign in again.');
  const decoded = await adminAuth.verifySessionCookie(session, true);
  return decoded.uid;
}

export async function startAttempt(taskId: string) {
  const studentId = await getStudentId();
  const taskDoc = await adminDb.collection('readingTasks').doc(taskId).get();
  if (!taskDoc.exists || taskDoc.get('status') === 'Draft') throw new Error('This reading task is not available.');

  return startAttemptShared({
    studentId,
    module: 'reading',
    taskId,
    questionType: taskDoc.get('questionType') as string,
    timerSeconds: (Number(taskDoc.get('timerMinutes')) || 10) * 60,
    maxAttempts: 3,
  });
}

function normalizeAnswer(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

export async function submitAttempt(attemptId: string, taskId: string, answers: Record<string, string>) {
  const studentId = await getStudentId();
  const [taskDoc, attemptRef] = await Promise.all([
    adminDb.collection('readingTasks').doc(taskId).get(),
    adminDb.collection('attempts').doc(attemptId).get(),
  ]);
  if (!taskDoc.exists) throw new Error('Reading task not found.');
  if (!attemptRef.exists) throw new Error('Attempt not found.');

  const attempt = attemptRef.data()!;
  if (attempt.studentId !== studentId || attempt.taskId !== taskId || attempt.module !== 'reading') {
    throw new Error('This attempt does not belong to your account.');
  }
  if (attempt.status !== 'in_progress') throw new Error('This attempt has already been submitted.');

  const task = taskDoc.data()!;
  const correctAnswers = (task.correctAnswers ?? {}) as Record<string, string>;
  const questions = (task.questions ?? []) as { id: string; alternativeAnswers?: string[]; explanation?: string }[];
  const acceptedAnswers: Record<string, string[]> = {};
  const explanations: Record<string, string> = {};

  for (const question of questions) {
    const correct = correctAnswers[question.id];
    acceptedAnswers[question.id] = [correct, ...(question.alternativeAnswers ?? [])].filter(Boolean);
    if (question.explanation) explanations[question.id] = question.explanation;
  }

  let score = 0;
  for (const [questionId, correct] of Object.entries(correctAnswers)) {
    const accepted = acceptedAnswers[questionId] ?? [correct];
    if (accepted.some((answer) => normalizeAnswer(answer) === normalizeAnswer(answers[questionId] ?? ''))) {
      score += 1;
    }
  }

  await adminDb.collection('attempts').doc(attemptId).update({
    status: 'completed',
    submissionTime: new Date().toISOString(),
    studentAnswers: answers,
    correctAnswers,
    acceptedAnswers,
    explanations,
    total: Object.keys(correctAnswers).length,
    score,
  });

  return {
    score,
    total: Object.keys(correctAnswers).length,
    correctAnswers,
    acceptedAnswers,
    explanations,
  };
}
