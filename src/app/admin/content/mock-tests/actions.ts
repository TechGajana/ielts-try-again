'use server';

import { revalidatePath } from 'next/cache';
import { adminDb } from '@/lib/firebase-admin';
import { MAX_LISTENING_PARTS, MAX_READING_PARTS, TOTAL_MOCKS } from '@/lib/mock-config';

// Returns errors instead of throwing, so the message survives in production
export async function createMockTest(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  try {
    const mockNumber = Number(formData.get('mockNumber'));
    if (!Number.isInteger(mockNumber) || mockNumber < 1 || mockNumber > TOTAL_MOCKS) {
      throw new Error(`Mock number must be between 1 and ${TOTAL_MOCKS}.`);
    }
    const title = String(formData.get('title') ?? '').trim() || `Mock Test ${mockNumber}`;

    const dupe = await adminDb.collection('mockTests').where('mockNumber', '==', mockNumber).limit(1).get();
    if (!dupe.empty) throw new Error(`Mock Test ${mockNumber} already exists.`);

    const pick = (prefix: string, count: number) =>
      Array.from({ length: count }, (_, i) => String(formData.get(`${prefix}${i}`) ?? '')).filter(Boolean);

    const listeningIds = pick('l', MAX_LISTENING_PARTS);
    const readingIds = pick('r', MAX_READING_PARTS);
    const w1 = String(formData.get('w1') ?? '');
    const w2 = String(formData.get('w2') ?? '');
    if (listeningIds.length === 0) throw new Error('Pick at least one listening task.');
    if (readingIds.length === 0) throw new Error('Pick at least one reading task.');
    if (!w1 || !w2) throw new Error('Pick a Task 1 prompt and a Task 2 prompt.');

    // Content is copied, so later edits or deletes of the practice tasks never change this mock
    const listening = await Promise.all(
      listeningIds.map(async (id, i) => {
        const d = await adminDb.collection('listeningTasks').doc(id).get();
        if (!d.exists) throw new Error('A selected listening task no longer exists.');
        const x = d.data()!;
        if (!x.audioKey) throw new Error('A selected listening task has no audio.');
        return {
          title: `Part ${i + 1}`,
          sourceId: id,
          questionType: x.questionType as string,
          audioKey: x.audioKey as string,
          ...(x.diagramKey ? { diagramKey: x.diagramKey as string } : {}),
          instructions: (x.instructions ?? '') as string,
          questions: x.questions ?? [],
          correctAnswers: x.correctAnswers ?? {},
        };
      }),
    );

    const reading = await Promise.all(
      readingIds.map(async (id, i) => {
        const d = await adminDb.collection('readingTasks').doc(id).get();
        if (!d.exists) throw new Error('A selected reading task no longer exists.');
        const x = d.data()!;
        return {
          title: `Passage ${i + 1}`,
          sourceId: id,
          questionType: x.questionType as string,
          passage: x.passage as string,
          instructions: (x.instructions ?? '') as string,
          questions: x.questions ?? [],
          correctAnswers: x.correctAnswers ?? {},
        };
      }),
    );

    const [p1, p2] = await Promise.all([
      adminDb.collection('writingPrompts').doc(w1).get(),
      adminDb.collection('writingPrompts').doc(w2).get(),
    ]);
    if (!p1.exists || p1.get('taskPart') !== 'task1') throw new Error('Choose a Task 1 prompt for Writing Task 1.');
    if (!p2.exists || p2.get('taskPart') !== 'task2') throw new Error('Choose a Task 2 prompt for Writing Task 2.');

    await adminDb.collection('mockTests').add({
      mockNumber,
      title,
      listening,
      reading,
      writing: {
        task1: {
          sourceId: w1,
          category: p1.get('category') as string,
          prompt: p1.get('prompt') as string,
          ...(p1.get('imageKey') ? { imageKey: p1.get('imageKey') as string } : {}),
        },
        task2: { sourceId: w2, category: p2.get('category') as string, prompt: p2.get('prompt') as string },
      },
      createdAt: Date.now(),
    });

    revalidatePath('/admin/content/mock-tests');
    revalidatePath('/mock-tests');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Could not create the mock test.' };
  }
}

export async function deleteMockTest(mockId: string) {
  await adminDb.collection('mockTests').doc(mockId).delete();
  revalidatePath('/admin/content/mock-tests');
  revalidatePath('/mock-tests');
}