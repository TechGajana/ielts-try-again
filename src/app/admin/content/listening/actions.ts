'use server';

import { adminDb } from '@/lib/firebase-admin';
import { getUploadUrl } from '@/lib/r2-presign';
import { revalidatePath } from 'next/cache';

export async function getAudioUploadUrl(fileName: string, contentType: string) {
  const key = `listening/${Date.now()}-${fileName}`;
  const uploadUrl = await getUploadUrl(key, contentType);
  return { uploadUrl, key };
}

export async function createListeningTask(formData: FormData) {
  const questionType = formData.get('questionType') as string;
  const taskNumber = Number(formData.get('taskNumber'));
  const audioKey = formData.get('audioKey') as string;
  const instructions = formData.get('instructions') as string;
  const timerMinutes = Number(formData.get('timerMinutes'));

  const questions = [];
  const correctAnswers: Record<string, string> = {};

  for (let i = 1; i <= 10; i++) {
    const qText = formData.get(`q${i}_text`) as string;
    const qOptions = formData.get(`q${i}_options`) as string;
    const qAnswer = formData.get(`q${i}_answer`) as string;

    if (qText) {
      questions.push({
        id: `q${i}`,
        text: qText,
        options: qOptions ? qOptions.split(',').map((o) => o.trim()) : [],
      });
      correctAnswers[`q${i}`] = qAnswer;
    }
  }

  await adminDb.collection('listeningTasks').add({
    questionType, taskNumber, audioKey, instructions, questions, correctAnswers, timerMinutes,
  });

  revalidatePath('/admin/content/listening');
}

export async function deleteListeningTask(taskId: string) {
  await adminDb.collection('listeningTasks').doc(taskId).delete();
  revalidatePath('/admin/content/listening');
}