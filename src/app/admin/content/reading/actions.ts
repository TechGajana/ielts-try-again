'use server';

import { adminDb } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';

function parseQuestions(formData: FormData) {
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

  return { questions, correctAnswers };
}

export async function createReadingTask(formData: FormData) {
  const questionType = formData.get('questionType') as string;
  const taskNumber = Number(formData.get('taskNumber'));
  const passage = formData.get('passage') as string;
  const instructions = formData.get('instructions') as string;
  const timerMinutes = Number(formData.get('timerMinutes'));
  const { questions, correctAnswers } = parseQuestions(formData);

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

/** Full task document, used to pre-fill the edit form. */
export async function getReadingTask(taskId: string) {
  const doc = await adminDb.collection('readingTasks').doc(taskId).get();
  if (!doc.exists) throw new Error('Task not found.');

  const data = doc.data()!;
  return {
    id: doc.id,
    questionType: data.questionType as string,
    taskNumber: data.taskNumber as number,
    passage: data.passage as string,
    instructions: data.instructions as string,
    timerMinutes: data.timerMinutes as number,
    questions: (data.questions ?? []) as { id: string; text: string; options?: string[] }[],
    correctAnswers: (data.correctAnswers ?? {}) as Record<string, string>,
  };
}

export async function updateReadingTask(taskId: string, formData: FormData) {
  const questionType = formData.get('questionType') as string;
  const taskNumber = Number(formData.get('taskNumber'));
  const passage = formData.get('passage') as string;
  const instructions = formData.get('instructions') as string;
  const timerMinutes = Number(formData.get('timerMinutes'));

  if (!questionType) throw new Error('Question type is required.');
  if (!passage) throw new Error('Passage is required.');
  if (!instructions) throw new Error('Instructions are required.');
  if (!Number.isFinite(taskNumber) || taskNumber < 1) throw new Error('Task number must be a positive number.');

  const { questions, correctAnswers } = parseQuestions(formData);
  if (questions.length === 0) throw new Error('At least one question is required.');

  await adminDb.collection('readingTasks').doc(taskId).update({
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