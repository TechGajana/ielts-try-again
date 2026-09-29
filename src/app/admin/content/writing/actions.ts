'use server';

import { revalidatePath } from 'next/cache';
import { adminDb } from '@/lib/firebase-admin';
import { getUploadUrl } from '@/lib/r2-presign';
import { WRITING_CATEGORIES, WRITING_PARTS, type WritingPart } from '@/lib/writing-config';

export async function getWritingImageUploadUrl(fileName: string, contentType: string) {
  const key = `writing/${Date.now()}-${fileName}`;
  const uploadUrl = await getUploadUrl(key, contentType);
  return { uploadUrl, key };
}

export async function createWritingPrompt(formData: FormData) {
  const taskPart = formData.get('taskPart') as WritingPart;
  const category = formData.get('category') as string;
  const questionNumber = Number(formData.get('questionNumber'));
  const prompt = ((formData.get('prompt') as string) ?? '').trim();
  const imageKey = ((formData.get('imageKey') as string) ?? '') || undefined;
  const timerMinutes = Number(formData.get('timerMinutes')) || WRITING_PARTS[taskPart]?.timerMinutes;

  const part = WRITING_PARTS[taskPart];
  if (!part) throw new Error('Choose Task 1 or Task 2.');
  if (!WRITING_CATEGORIES.some((c) => c.part === taskPart && c.name === category)) {
    throw new Error('That category does not belong to the selected task.');
  }
  if (!Number.isInteger(questionNumber) || questionNumber < 1 || questionNumber > part.perCategory) {
    throw new Error(`Question number must be between 1 and ${part.perCategory}.`);
  }
  if (!prompt) throw new Error('The question text is required.');
  if (taskPart === 'task1' && !imageKey) throw new Error('Task 1 needs a chart, map or diagram image.');

  const dupe = await adminDb
    .collection('writingPrompts')
    .where('taskPart', '==', taskPart)
    .where('category', '==', category)
    .where('questionNumber', '==', questionNumber)
    .limit(1)
    .get();
  if (!dupe.empty) throw new Error(`${category} already has a question ${questionNumber}.`);

  await adminDb.collection('writingPrompts').add({
    taskPart,
    category,
    questionNumber,
    prompt,
    ...(imageKey ? { imageKey } : {}),
    timerMinutes,
  });

  revalidatePath('/admin/content/writing');
}

export async function deleteWritingPrompt(promptId: string) {
  await adminDb.collection('writingPrompts').doc(promptId).delete();
  revalidatePath('/admin/content/writing');
}