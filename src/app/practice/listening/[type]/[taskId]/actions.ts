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

export async function startAttempt(taskId: string, questionType: string) {
  const studentId = await getStudentId();
  const taskDoc = await adminDb.collection('listeningTasks').doc(taskId).get();
  const data = taskDoc.data();
  const timerMinutes = data?.timerMinutes ?? 8;

  const { attemptId, startTime } = await startAttemptShared({
    studentId,
    module: 'listening',
    taskId,
    questionType,
    timerSeconds: timerMinutes * 60,
    maxAttempts: 3,
  });

  // Presigned playback URL is fetched fresh per attempt so it can't be
  // reused after the 10-minute expiry set in r2-presign.ts
  const audioUrl = await getPlaybackUrl(data!.audioKey as string);

  return { attemptId, startTime, audioUrl };
}

export async function submitAttempt(attemptId: string, taskId: string, answers: Record<string, string>) {
  const taskDoc = await adminDb.collection('listeningTasks').doc(taskId).get();
  const { correctAnswers } = taskDoc.data()!;
  return submitAutoScoredAttempt(attemptId, correctAnswers, answers);
}