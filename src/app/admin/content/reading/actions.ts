'use server';

import { adminDb } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';

export async function createReadingTask(formData: FormData) {
  const questionType = formData.get('questionType') as string;
  const taskNumber = Number(formData.get('taskNumber'));
  const passage = formData.get('passage') as string;
  const instructions = formData.get('instructions') as string;
  const timerMinutes = Number(formData.get('timerMinutes'));

  const questions = [];
  const correctAnswers: Record<string, string> = {};

  for (let i = 1; i <= 10; i++) {
    const qText = formData.get(`q${i}_text`) as string;
    const qOptions = formData.get(`q${i}_options`) as string; // comma-separated
    const qAnswer = formData.get(`q${i}_answer`) as string;

    if (qText) {
      questions.push({
        id: `q${i}`,
        text: qText,
        options: qOptions ? qOptions.split(',').map((o) => o.trim()) : undefined,
      });
      correctAnswers[`q${i}`] = qAnswer;
    }
  }

  await adminDb.collection('readingTasks').add({
    questionType,
    taskNumber,
    passage,
    instructions,
    questions,
    correctAnswers,
    timerMinutes,
  });

  revalidatePath('/admin/content/reading');
}

export async function deleteReadingTask(taskId: string) {
  await adminDb.collection('readingTasks').doc(taskId).delete();
  revalidatePath('/admin/content/reading');
}