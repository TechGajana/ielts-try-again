'use server';

import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase-admin';
import { createUploadTarget, retryAttemptEvaluation, startAttempt, submitAttempt } from '@/lib/speaking';

async function getStudentId() {
  const sessionCookie = (await cookies()).get('session')?.value!;
  const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
  return decoded.uid;
}

export async function startSpeakingAttempt(promptId: string) {
  return startAttempt(await getStudentId(), promptId);
}

export async function getSpeakingUploadTarget(attemptId: string, contentType: string) {
  return createUploadTarget(await getStudentId(), attemptId, contentType);
}

export async function submitSpeakingAttempt(attemptId: string, durationSeconds: number) {
  return submitAttempt(await getStudentId(), attemptId, durationSeconds);
}

export async function retrySpeakingEvaluation(attemptId: string) {
  return retryAttemptEvaluation(await getStudentId(), attemptId);
}