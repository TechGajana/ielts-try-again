'use server';

import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';
import { startAttemptShared, submitAutoScoredAttempt } from '@/lib/attempts';

async function getStudentId() {
  const sessionCookie = (await cookies()).get('session')?.value!;
  const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
  return decoded.uid;
}

export async function startAttempt(taskId: string, questionType: string) {
  const studentId = await getStudentId();
  const taskDoc = await adminDb.collection('readingTasks').doc(taskId).get();
  const timerMinutes = taskDoc.data()?.timerMinutes ?? 10;

  return startAttemptShared({
    studentId,
    module: 'reading',
    taskId,
    questionType,
    timerSeconds: timerMinutes * 60,
    maxAttempts: 3,
  });
}

export async function submitAttempt(attemptId: string, taskId: string, answers: Record<string, string>) {
  const taskDoc = await adminDb.collection('readingTasks').doc(taskId).get();
  const { correctAnswers } = taskDoc.data()!;
  return submitAutoScoredAttempt(attemptId, correctAnswers, answers);
}