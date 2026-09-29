'use server';

import { revalidatePath } from 'next/cache';
import { adminDb } from '@/lib/firebase-admin';
import { DIFFICULTIES, TOTAL_CARDS, type Difficulty } from '@/lib/speaking-config';

export async function createSpeakingPrompt(formData: FormData) {
  const cardNumber = Number(formData.get('cardNumber'));
  const difficulty = formData.get('difficulty') as Difficulty;
  const topic = ((formData.get('topic') as string) ?? '').trim();
  const bullets = ((formData.get('bullets') as string) ?? '')
    .split('\n')
    .map((b) => b.trim())
    .filter(Boolean);

  if (!Number.isInteger(cardNumber) || cardNumber < 1 || cardNumber > TOTAL_CARDS) {
    throw new Error(`Card number must be between 1 and ${TOTAL_CARDS}.`);
  }
  if (!DIFFICULTIES.some((d) => d.key === difficulty)) throw new Error('Choose a difficulty.');
  if (!topic) throw new Error('The topic is required.');
  if (bullets.length === 0) throw new Error('Add at least one bullet prompt.');

  const dupe = await adminDb.collection('speakingPrompts').where('cardNumber', '==', cardNumber).limit(1).get();
  if (!dupe.empty) throw new Error(`Cue card ${cardNumber} already exists.`);

  await adminDb.collection('speakingPrompts').add({ cardNumber, difficulty, topic, bullets });
  revalidatePath('/admin/content/speaking');
}

export async function deleteSpeakingPrompt(promptId: string) {
  await adminDb.collection('speakingPrompts').doc(promptId).delete();
  revalidatePath('/admin/content/speaking');
}