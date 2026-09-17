'use server';

import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';
import { getPlaybackUrl } from '@/lib/r2-presign';
import { startAttemptShared, submitAutoScoredAttempt } from '@/lib/attempts';

async function getStudentId() {
  const sessionCookie = (await cookies()).get('session')?.value!;
  const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
  return decoded.uid;
}

export async function startListeningAttempt(taskId: string, questionType: string, audioKey: string) {
  const studentId = await getStudentId();
  const taskDoc = await adminDb.collection('listeningTasks').doc(taskId).get();
  const timerMinutes = taskDoc.data()?.timerMinutes ?? 8;

  const { attemptId, startTime } = await startAttemptShared({
    studentId,
    module: 'listening',
    taskId,
    questionType,
    timerSeconds: timerMinutes * 60,
    maxAttempts: 3,
  });

  const audioUrl = await getPlaybackUrl(audioKey);
  return { attemptId, startTime, audioUrl };
}

export async function submitListeningAttempt(
  attemptId: string,
  taskId: string,
  answers: Record<string, string>
) {
  const taskDoc = await adminDb.collection('listeningTasks').doc(taskId).get();
  const { correctAnswers } = taskDoc.data()!;
  return submitAutoScoredAttempt(attemptId, correctAnswers, answers);
}