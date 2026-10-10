'use server';

import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';
import { getPlaybackUrl } from '@/lib/r2-presign';
import { startAttemptShared, submitAutoScoredAttempt } from '@/lib/attempts';

async function getStudentId() {
  const sessionCookie = (await cookies()).get('session')?.value;
  if (!sessionCookie) throw new Error('You must be signed in to take a Listening practice set.');
  const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
  return decoded.uid;
}

export async function startAttempt(taskId: string, questionType: string) {
  const studentId = await getStudentId();
  const taskDoc = await adminDb.collection('listeningTasks').doc(taskId).get();
  if (!taskDoc.exists) throw new Error('Listening practice set not found.');
  const data = taskDoc.data()!;
  if (data.status === 'Draft') throw new Error('This Listening practice set is not published.');
  if (data.questionType !== questionType) throw new Error('This Listening practice set does not match the selected question type.');
  const timerMinutes = Number(data.timerMinutes) || 8;

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
  const audioUrl = data.audioKey
    ? await getPlaybackUrl(data.audioKey as string)
    : typeof data.audioUrl === 'string' && ['http:', 'https:'].includes(new URL(data.audioUrl).protocol)
      ? data.audioUrl
      : '';
  if (!audioUrl) throw new Error('This Listening practice set has no playable audio.');

  return { attemptId, startTime, audioUrl };
}

export async function submitAttempt(attemptId: string, taskId: string, answers: Record<string, string>) {
  const studentId = await getStudentId();
  const taskDoc = await adminDb.collection('listeningTasks').doc(taskId).get();
  if (!taskDoc.exists || taskDoc.get('status') === 'Draft') throw new Error('Listening practice set not found.');
  const attemptDoc = await adminDb.collection('attempts').doc(attemptId).get();
  if (
    !attemptDoc.exists ||
    attemptDoc.get('studentId') !== studentId ||
    attemptDoc.get('taskId') !== taskId ||
    attemptDoc.get('module') !== 'listening' ||
    attemptDoc.get('status') === 'completed'
  ) {
    throw new Error('This Listening attempt could not be found.');
  }
  const data = taskDoc.data()!;
  const correctAnswers = data.correctAnswers as Record<string, string>;
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) throw new Error('Answers must be provided as a question map.');
  if (Object.entries(answers).some(([id, answer]) =>
    !Object.hasOwn(correctAnswers, id) || typeof answer !== 'string' || answer.length > 2000)) {
    throw new Error('One or more submitted answers are invalid.');
  }
  const questions = (Array.isArray(data.questions) ? data.questions : []) as {
    id: string;
    answerMode?: 'single' | 'multiple';
    alternativeAnswers?: string[];
    explanation?: string;
    wordLimit?: number;
  }[];
  const alternatives = Object.fromEntries(
    questions.filter((question): question is typeof question & { alternativeAnswers: string[] } =>
      Array.isArray(question.alternativeAnswers))
      .map((question) => [question.id, question.alternativeAnswers ?? []]),
  );
  const explanations = Object.fromEntries(
    questions.filter((question): question is typeof question & { explanation: string } =>
      typeof question.explanation === 'string' && Boolean(question.explanation))
      .map((question) => [question.id, question.explanation]),
  );
  const multipleAnswerIds = questions
    .filter((question) => question.answerMode === 'multiple')
    .map((question) => question.id);
  const wordLimits = Object.fromEntries(
    questions.filter((question): question is typeof question & { wordLimit: number } =>
      Number.isInteger(question.wordLimit) && Number(question.wordLimit) > 0)
      .map((question) => [question.id, question.wordLimit]),
  );
  const result = await submitAutoScoredAttempt(attemptId, correctAnswers, answers, alternatives, multipleAnswerIds, wordLimits);
  return { ...result, explanations };
}