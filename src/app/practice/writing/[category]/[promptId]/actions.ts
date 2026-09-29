'use server';

import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase-admin';
import {
  retryAttemptEvaluation,
  saveDraftText,
  startAttempt,
  submitAttemptText,
} from '@/lib/writing';

async function getStudentId() {
  const sessionCookie = (await cookies()).get('session')?.value!;
  const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
  return decoded.uid;
}

export async function startWritingAttempt(promptId: string) {
  return startAttempt(await getStudentId(), promptId);
}

export async function saveDraft(attemptId: string, text: string) {
  await saveDraftText(await getStudentId(), attemptId, text);
}

export async function submitWritingAttempt(attemptId: string, text: string) {
  return submitAttemptText(await getStudentId(), attemptId, text);
}

export async function retryEvaluation(attemptId: string) {
  return retryAttemptEvaluation(await getStudentId(), attemptId);
}