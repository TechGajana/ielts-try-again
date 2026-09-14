'use server';

import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';

async function getStudentId() {
  const sessionCookie = (await cookies()).get('session')?.value!;
  const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
  return decoded.uid;
}

export async function startAttempt(taskId: string, questionType: string) {
  const studentId = await getStudentId();

  // Check attempt count
  const existing = await adminDb
    .collection('attempts')
    .where('studentId', '==', studentId)
    .where('taskId', '==', taskId)
    .get();

  if (existing.size >= 3) {
    throw new Error('Maximum attempts reached for this task.');
  }

  // Check for an already-in-progress attempt (avoid duplicate starts on refresh)
  const inProgress = existing.docs.find((d) => d.data().status === 'in_progress');
  if (inProgress) {
    return { attemptId: inProgress.id, startTime: inProgress.data().startTime };
  }

  const startTime = new Date().toISOString();
  const attemptRef = await adminDb.collection('attempts').add({
    studentId,
    module: 'reading',
    questionType,
    taskId,
    attemptNumber: existing.size + 1,
    status: 'in_progress',
    startTime,
    studentAnswers: {},
  });

  return { attemptId: attemptRef.id, startTime };
}

export async function submitAttempt(attemptId: string, taskId: string, answers: Record<string, string>) {
  const taskDoc = await adminDb.collection('readingTasks').doc(taskId).get();
  const { correctAnswers } = taskDoc.data()!;

  let score = 0;
  const total = Object.keys(correctAnswers).length;
  Object.entries(correctAnswers).forEach(([qId, correct]) => {
    if (answers[qId] === correct) score++;
  });

  await adminDb.collection('attempts').doc(attemptId).update({
    status: 'completed',
    submissionTime: new Date().toISOString(),
    studentAnswers: answers,
    correctAnswers,
    score,
  });

  return { score, total };
}