'use server';

import { randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { getPlaybackUrl, getUploadUrl } from '@/lib/r2-presign';
import { READING_QUESTION_TYPES } from '@/lib/question-types';
import type { ReadingCompletionType, ReadingDifficulty, ReadingQuestion, ReadingTaskStatus } from '@/lib/reading-content';

type EditorQuestion = ReadingQuestion & {
  answer: string;
};

const IMAGE_CONTENT_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']);
const DEFAULT_OPTIONS: Record<string, string[]> = {
  'Identifying Information': ['TRUE', 'FALSE', 'NOT GIVEN'],
  "Identifying Writer's Views": ['YES', 'NO', 'NOT GIVEN'],
};

async function requireAdmin() {
  const session = (await cookies()).get('session')?.value;
  if (!session) throw new Error('You must be signed in as an administrator.');

  const decoded = await adminAuth.verifySessionCookie(session, true);
  if (decoded.role !== 'admin') throw new Error('Administrator access is required.');
}

function formString(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

function validateQuestion(question: EditorQuestion, index: number, questionType: string) {
  if (!question.text) throw new Error(`Question ${index + 1} is required.`);
  if (!question.answer) throw new Error(`Add a correct answer for question ${index + 1}.`);

  const normalizedOptions = (question.options ?? []).map((option) => option.toLocaleLowerCase());
  if (questionType === 'Multiple Choice') {
    if (normalizedOptions.length < 2) throw new Error(`Multiple-choice question ${index + 1} needs at least two options.`);
    if (!normalizedOptions.includes(question.answer.toLocaleLowerCase())) {
      throw new Error(`Choose one of the listed options as the answer to question ${index + 1}.`);
    }
  }
  if (questionType === 'Identifying Information' && !['TRUE', 'FALSE', 'NOT GIVEN'].includes(question.answer.toLocaleUpperCase())) {
    throw new Error(`Question ${index + 1} must be answered TRUE, FALSE or NOT GIVEN.`);
  }
  if (questionType === "Identifying Writer's Views" && !['YES', 'NO', 'NOT GIVEN'].includes(question.answer.toLocaleUpperCase())) {
    throw new Error(`Question ${index + 1} must be answered YES, NO or NOT GIVEN.`);
  }
  if (['Matching Information', 'Matching Headings', 'Matching Features', 'Matching Sentence Endings'].includes(questionType)) {
    if (normalizedOptions.length < 2) throw new Error(`Add at least two matching choices for question ${index + 1}.`);
    if (!normalizedOptions.includes(question.answer.toLocaleLowerCase())) {
      throw new Error(`The correct answer for question ${index + 1} must match one of its choices.`);
    }
  }
}

function parseQuestions(formData: FormData, questionType: string): EditorQuestion[] {
  const raw = formString(formData, 'questionsJson');
  if (raw) {
    let values: unknown;
    try {
      values = JSON.parse(raw);
    } catch {
      throw new Error('Questions could not be read. Please check the question fields and try again.');
    }
    if (!Array.isArray(values)) throw new Error('Questions must be provided as a list.');
    if (values.length > 100) throw new Error('A practice task can contain at most 100 questions.');

    return values.map((item, index) => {
      if (!item || typeof item !== 'object') throw new Error(`Question ${index + 1} is invalid.`);
      const value = item as Record<string, unknown>;
      const text = typeof value.text === 'string' ? value.text.trim() : '';
      const answer = typeof value.answer === 'string' ? value.answer.trim() : '';
      const options = Array.isArray(value.options)
        ? value.options.filter((option): option is string => typeof option === 'string').map((option) => option.trim()).filter(Boolean)
        : [...(DEFAULT_OPTIONS[questionType] ?? [])];
      const alternativeAnswers = Array.isArray(value.alternativeAnswers)
        ? value.alternativeAnswers.filter((answer): answer is string => typeof answer === 'string').map((answer) => answer.trim()).filter(Boolean)
        : [];
      const explanation = typeof value.explanation === 'string' ? value.explanation.trim() : '';
      const wordLimit = Number(value.wordLimit);

      const question: EditorQuestion = {
        id: `q${index + 1}`,
        text,
        answer,
        ...((options.length || DEFAULT_OPTIONS[questionType]) ? { options: options.length ? options : DEFAULT_OPTIONS[questionType] } : {}),
        ...(alternativeAnswers.length ? { alternativeAnswers } : {}),
        ...(explanation ? { explanation } : {}),
        ...(Number.isInteger(wordLimit) && wordLimit > 0 ? { wordLimit } : {}),
      };
      validateQuestion(question, index, questionType);
      return question;
    });
  }

  const questions: EditorQuestion[] = [];
  for (let index = 1; index <= 10; index++) {
    const text = formString(formData, `q${index}_text`);
    if (!text) continue;
    const options = formString(formData, `q${index}_options`)
      .split(',')
      .map((option) => option.trim())
      .filter(Boolean);
    const question: EditorQuestion = {
      id: `q${index}`,
      text,
      answer: formString(formData, `q${index}_answer`),
      ...(options.length ? { options } : {}),
    };
    validateQuestion(question, questions.length, questionType);
    questions.push(question);
  }
  return questions;
}

function parseTask(formData: FormData) {
  const questionType = formString(formData, 'questionType');
  const taskNumber = Number(formString(formData, 'taskNumber'));
  const timerMinutes = Number(formString(formData, 'timerMinutes'));
  const passage = formString(formData, 'passage');
  const instructions = formString(formData, 'instructions');
  const difficulty = formString(formData, 'difficulty') as ReadingDifficulty;
  const status = formString(formData, 'status') as ReadingTaskStatus;
  const completionType = formString(formData, 'completionType') as ReadingCompletionType;
  const title = formString(formData, 'title');
  const description = formString(formData, 'description');
  const diagramKey = formString(formData, 'diagramKey');
  const questions = parseQuestions(formData, questionType);

  if (!READING_QUESTION_TYPES.includes(questionType as (typeof READING_QUESTION_TYPES)[number])) {
    throw new Error('Choose a valid reading question type.');
  }
  if (!Number.isInteger(taskNumber) || taskNumber < 1) throw new Error('Task number must be a positive whole number.');
  if (!passage) throw new Error('Passage is required.');
  if (!title) throw new Error('Practice set title is required.');
  if (!instructions) throw new Error('Instructions are required.');
  if (!Number.isInteger(timerMinutes) || timerMinutes < 1 || timerMinutes > 240) {
    throw new Error('Estimated time must be between 1 and 240 minutes.');
  }
  if (!['Easy', 'Medium', 'Hard'].includes(difficulty)) throw new Error('Choose a difficulty.');
  if (!['Draft', 'Published'].includes(status)) throw new Error('Choose a publishing status.');
  if (
    questionType === 'Summary/Note/Table/Flow-Chart Completion' &&
    !['Summary', 'Note', 'Table', 'Flow Chart'].includes(completionType)
  ) {
    throw new Error('Choose a completion format.');
  }
  if (questions.length === 0) throw new Error('Add at least one question.');
  if (questionType === 'Diagram Label Completion' && !diagramKey) {
    throw new Error('Upload a diagram for Diagram Label Completion tasks.');
  }

  const correctAnswers = Object.fromEntries(questions.map((question) => [question.id, question.answer]));
  const storedQuestions: ReadingQuestion[] = questions.map(
    ({ id, text, options, alternativeAnswers, explanation, wordLimit }) => ({
      id,
      text,
      ...(options?.length ? { options } : {}),
      ...(alternativeAnswers?.length ? { alternativeAnswers } : {}),
      ...(explanation ? { explanation } : {}),
      ...(wordLimit ? { wordLimit } : {}),
    }),
  );

  return {
    questionType,
    taskNumber,
    title,
    description,
    passage,
    passageFormat: 'markdown' as const,
    instructions,
    timerMinutes,
    difficulty,
    status,
    ...(diagramKey ? { diagramKey } : {}),
    ...(questionType === 'Summary/Note/Table/Flow-Chart Completion' ? { completionType } : {}),
    questions: storedQuestions,
    correctAnswers,
  };
}

async function getDiagramKeyUploadUrl(fileName: string, contentType: string) {
  await requireAdmin();
  if (!IMAGE_CONTENT_TYPES.has(contentType)) throw new Error('Choose a PNG, JPG, WEBP or SVG image.');
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120) || 'diagram';
  const key = `reading/diagrams/${randomUUID()}-${safeName}`;
  return { uploadUrl: await getUploadUrl(key, contentType), key };
}

async function getDiagramPreviewUrl(key: string) {
  await requireAdmin();
  if (!key.startsWith('reading/diagrams/')) throw new Error('Invalid diagram reference.');
  return getPlaybackUrl(key);
}

export async function createReadingTask(formData: FormData) {
  await requireAdmin();
  const task = parseTask(formData);
  const duplicate = await adminDb
    .collection('readingTasks')
    .where('questionType', '==', task.questionType)
    .where('taskNumber', '==', task.taskNumber)
    .limit(1)
    .get();
  if (!duplicate.empty) throw new Error(`${task.questionType} already has task ${task.taskNumber}.`);

  await adminDb.collection('readingTasks').add(task);
  revalidatePath('/admin/content/reading');
  revalidatePath('/practice/reading');
}

export async function deleteReadingTask(taskId: string) {
  await requireAdmin();
  await adminDb.collection('readingTasks').doc(taskId).delete();
  revalidatePath('/admin/content/reading');
  revalidatePath('/practice/reading');
}

export async function duplicateReadingTask(taskId: string) {
  await requireAdmin();
  const source = await adminDb.collection('readingTasks').doc(taskId).get();
  if (!source.exists) throw new Error('Task not found.');

  const data = source.data()!;
  const sameType = await adminDb.collection('readingTasks').where('questionType', '==', data.questionType).get();
  const nextTaskNumber = sameType.docs.reduce(
    (largest, doc) => Math.max(largest, Number(doc.get('taskNumber')) || 0),
    0,
  ) + 1;

  await adminDb.collection('readingTasks').add({
    ...data,
    taskNumber: nextTaskNumber,
    title: data.title ? `${data.title} (copy)` : '',
    status: 'Draft',
  });
  revalidatePath('/admin/content/reading');
}

/** Full task document, used to pre-fill the edit form. */
export async function getReadingTask(taskId: string) {
  await requireAdmin();
  const doc = await adminDb.collection('readingTasks').doc(taskId).get();
  if (!doc.exists) throw new Error('Task not found.');

  const data = doc.data()!;
  return {
    id: doc.id,
    questionType: data.questionType as string,
    taskNumber: Number(data.taskNumber) || 1,
    title: (data.title as string) ?? '',
    description: (data.description as string) ?? '',
    passage: (data.passage as string) ?? '',
    passageFormat: (data.passageFormat as 'markdown' | undefined) ?? undefined,
    completionType: (data.completionType as ReadingCompletionType | undefined) ?? 'Summary',
    instructions: (data.instructions as string) ?? '',
    timerMinutes: Number(data.timerMinutes) || 10,
    difficulty: (data.difficulty as ReadingDifficulty) ?? 'Medium',
    status: (data.status as ReadingTaskStatus) ?? 'Published',
    diagramKey: (data.diagramKey as string) ?? '',
    questions: (data.questions ?? []) as ReadingQuestion[],
    correctAnswers: (data.correctAnswers ?? {}) as Record<string, string>,
  };
}

export async function updateReadingTask(taskId: string, formData: FormData) {
  await requireAdmin();
  const taskRef = adminDb.collection('readingTasks').doc(taskId);
  const existing = await taskRef.get();
  if (!existing.exists) throw new Error('Task not found.');

  const task = parseTask(formData);
  const duplicate = await adminDb
    .collection('readingTasks')
    .where('questionType', '==', task.questionType)
    .where('taskNumber', '==', task.taskNumber)
    .get();
  if (duplicate.docs.some((doc) => doc.id !== taskId)) {
    throw new Error(`${task.questionType} already has task ${task.taskNumber}.`);
  }

  await taskRef.update(task);
  revalidatePath('/admin/content/reading');
  revalidatePath('/practice/reading');
}

export { getDiagramKeyUploadUrl, getDiagramPreviewUrl };
