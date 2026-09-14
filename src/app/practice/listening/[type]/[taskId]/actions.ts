'use server';

import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';
import { getPlaybackUrl } from '@/lib/r2-presign';

async function getStudentId() {
  const sessionCookie = (await cookies()).get('session')?.value!;
  const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
  return decoded.uid;
}

export async function startListeningAttempt(taskId: string, questionType: string, audioKey: string) {
  const studentId = await getStudentId();

  const existing = await adminDb
    .collection('attempts')
    .where('studentId', '==', studentId)
    .where('taskId', '==', taskId)
    .get();

  const completedCount = existing.docs.filter((d) => d.data().status === 'completed').length;

  if (completedCount >= 3) {
    throw new Error('Maximum attempts reached for this task.');
  }

  const inProgress = existing.docs.find((d) => d.data().status === 'in_progress');

  let attemptId: string;
  let startTime: string;

  // Get task's timer length to check if an in-progress attempt is actually still valid
  const taskDoc = await adminDb.collection('listeningTasks').doc(taskId).get();
  const timerMinutes = taskDoc.data()?.timerMinutes ?? 8;

  if (inProgress) {
    const existingStart = new Date(inProgress.data().startTime).getTime();
    const elapsedSeconds = (Date.now() - existingStart) / 1000;

    if (elapsedSeconds < timerMinutes * 60) {
      // Still genuinely within time — resume it
      attemptId = inProgress.id;
      startTime = inProgress.data().startTime;
    } else {
      // Stale/expired — mark it completed with a zero score and start fresh
      await inProgress.ref.update({
        status: 'completed',
        submissionTime: new Date().toISOString(),
        studentAnswers: {},
        score: 0,
        note: 'Auto-expired stale in-progress attempt',
      });

      if (completedCount + 1 >= 3) {
        throw new Error('Maximum attempts reached for this task.');
      }

      startTime = new Date().toISOString();
      const attemptRef = await adminDb.collection('attempts').add({
        studentId,
        module: 'listening',
        questionType,
        taskId,
        attemptNumber: completedCount + 2,
        status: 'in_progress',
        startTime,
        studentAnswers: {},
      });
      attemptId = attemptRef.id;
    }
  } else {
    startTime = new Date().toISOString();
    const attemptRef = await adminDb.collection('attempts').add({
      studentId,
      module: 'listening',
      questionType,
      taskId,
      attemptNumber: completedCount + 1,
      status: 'in_progress',
      startTime,
      studentAnswers: {},
    });
    attemptId = attemptRef.id;
  }

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