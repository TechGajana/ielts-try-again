'use server';

import { randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { getPlaybackUrl, getUploadUrl } from '@/lib/r2-presign';
import { LISTENING_QUESTION_TYPES } from '@/lib/question-types';
import type {
  ListeningDifficulty,
  ListeningQuestion,
  ListeningQuestionType,
  ListeningSection,
  ListeningTaskStatus,
} from '@/lib/listening-content';

const AUDIO_TYPES: Record<string, string> = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  ogg: 'audio/ogg',
};
const AUDIO_FORMATS = ['MP3', 'WAV', 'M4A', 'OGG'] as const;
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

function inferAudioFormat(source: string): (typeof AUDIO_FORMATS)[number] | '' {
  const filePath = source.split(/[?#]/, 1)[0];
  const extension = filePath.split('.').pop()?.toUpperCase() ?? '';
  return AUDIO_FORMATS.includes(extension as (typeof AUDIO_FORMATS)[number])
    ? extension as (typeof AUDIO_FORMATS)[number]
    : '';
}

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

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Question data must be an object.');
  }
  return value as Record<string, unknown>;
}

function optionalStringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean)
    : [];
}

function optionalSeconds(value: unknown, label: string): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const seconds = Number(value);
  if (!Number.isInteger(seconds) || seconds < 0) throw new Error(`${label} must be a non-negative whole number of seconds.`);
  return seconds;
}

function parseQuestions(formData: FormData, questionType: ListeningQuestionType, mapKey: string) {
  const questionsJson = formString(formData, 'questionsJson');
  if (Buffer.byteLength(questionsJson, 'utf8') > 500_000) {
    throw new Error('The question content is too large. Reduce the number of long explanations or transcript text.');
  }
  let raw: unknown;
  try {
    raw = JSON.parse(questionsJson);
  } catch {
    throw new Error('Questions could not be read. Check the question fields and try again.');
  }
  if (!Array.isArray(raw) || raw.length === 0) throw new Error('Add at least one question.');
  if (raw.length > 100) throw new Error('A practice set can contain at most 100 questions.');

  const questions: ListeningQuestion[] = [];
  const correctAnswers: Record<string, string> = {};
  const slug = questionType.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  raw.forEach((item, index) => {
    const value = asRecord(item);
    const id = `q${index + 1}`;
    const text = typeof value.text === 'string' ? value.text.trim() : '';
    let answer = typeof value.answer === 'string' ? value.answer.trim() : '';
    const options = optionalStringList(value.options);
    const alternativeAnswers = optionalStringList(value.alternativeAnswers);
    const explanation = typeof value.explanation === 'string' ? value.explanation.trim() : '';
    const wordLimit = Number(value.wordLimit);
    const audioStartTime = optionalSeconds(value.audioStartTime, `Question ${index + 1} audio start`);
    const audioEndTime = optionalSeconds(value.audioEndTime, `Question ${index + 1} audio end`);
    if (!text) throw new Error(`Question ${index + 1} is required.`);
    if (text.length > 2000) throw new Error(`Question ${index + 1} must be 2,000 characters or fewer.`);
    if (!answer) throw new Error(`Add a correct answer for question ${index + 1}.`);
    if (answer.length > 3000) throw new Error(`Question ${index + 1} answer is too long.`);
    if (options.some((option) => option.length > 500)) throw new Error(`Question ${index + 1} options must be 500 characters or fewer.`);
    if (alternativeAnswers.length > 20 || alternativeAnswers.some((alternative) => alternative.length > 500)) {
      throw new Error(`Question ${index + 1} can have up to 20 alternative answers of 500 characters each.`);
    }
    if (explanation.length > 4000) throw new Error(`Question ${index + 1} explanation must be 4,000 characters or fewer.`);
    if (value.wordLimit !== undefined && value.wordLimit !== '' && (!Number.isInteger(wordLimit) || wordLimit < 1 || wordLimit > 100)) {
      throw new Error(`Question ${index + 1} word limit must be between 1 and 100.`);
    }

    const question: ListeningQuestion = { id, type: slug as ListeningQuestion['type'], text };
    if (options.length) question.options = options;
    if (alternativeAnswers.length) question.alternativeAnswers = alternativeAnswers;
    if (explanation) question.explanation = explanation;
    if (Number.isInteger(wordLimit) && wordLimit > 0) question.wordLimit = wordLimit;
    if (audioStartTime !== undefined) question.audioStartTime = audioStartTime;
    if (audioEndTime !== undefined) question.audioEndTime = audioEndTime;
    if (question.audioStartTime !== undefined && question.audioEndTime !== undefined && question.audioEndTime <= question.audioStartTime) {
      throw new Error(`Question ${index + 1} must end after its start time.`);
    }

    if (questionType === 'Multiple Choice') {
      if (options.length < 3 || options.length > 5) {
        throw new Error(`Multiple-choice question ${index + 1} needs 3 to 5 options.`);
      }
      const answerMode = value.answerMode === 'multiple' ? 'multiple' : 'single';
      let acceptedChoices = [answer];
      if (answerMode === 'multiple') {
        try {
          const parsed = JSON.parse(answer) as unknown;
          if (Array.isArray(parsed) && parsed.every((choice) => typeof choice === 'string')) {
            acceptedChoices = parsed.map((choice: string) => choice.trim()).filter(Boolean);
          }
        } catch {
          acceptedChoices = [];
        }
        if (acceptedChoices.length < 2) {
          throw new Error(`Select at least two correct options for question ${index + 1}.`);
        }
        answer = JSON.stringify(acceptedChoices);
      }
      if (acceptedChoices.some((choice) => !options.some((option) => option.toLocaleLowerCase() === choice.toLocaleLowerCase()))) {
        throw new Error(`Choose listed options as the answer to question ${index + 1}.`);
      }
      question.answerMode = answerMode;
    } else if (questionType === 'Matching') {
      const matchingValue = value.matching && typeof value.matching === 'object'
        ? value.matching as Record<string, unknown>
        : {};
      const matchingItem = typeof matchingValue.item === 'string' ? matchingValue.item.trim() : '';
      const choices = optionalStringList(matchingValue.choices);
      if (!matchingItem || matchingItem.length > 500 || choices.length < 2 || choices.length > 50 || choices.some((choice) => choice.length > 500)) {
        throw new Error(`Matching question ${index + 1} needs an item and at least two choices.`);
      }
      if (!choices.some((choice) => choice.toLocaleLowerCase() === answer.toLocaleLowerCase())) {
        throw new Error(`Choose one of the matching choices as the answer to question ${index + 1}.`);
      }
      question.matching = { item: matchingItem, choices };
    } else if (questionType === 'Plan/Map/Diagram Labelling') {
      const mapValue = value.mapLabel && typeof value.mapLabel === 'object'
        ? value.mapLabel as Record<string, unknown>
        : {};
      const label = typeof mapValue.label === 'string' ? mapValue.label.trim() : '';
      if (!mapKey || !label) throw new Error(`Question ${index + 1} needs an uploaded map and a label.`);
      const x = Number(mapValue.x);
      const y = Number(mapValue.y);
      if (label.length > 100) throw new Error(`Question ${index + 1} map label must be 100 characters or fewer.`);
      if (mapValue.x !== undefined && mapValue.x !== '' && (!Number.isFinite(x) || x < 0 || x > 100)) {
        throw new Error(`Question ${index + 1} marker left position must be between 0 and 100.`);
      }
      if (mapValue.y !== undefined && mapValue.y !== '' && (!Number.isFinite(y) || y < 0 || y > 100)) {
        throw new Error(`Question ${index + 1} marker top position must be between 0 and 100.`);
      }
      question.mapLabel = {
        label,
        ...(Number.isFinite(x) && x >= 0 && x <= 100 ? { x } : {}),
        ...(Number.isFinite(y) && y >= 0 && y <= 100 ? { y } : {}),
      };
    } else if (questionType === 'Table Completion') {
      const cell = value.tableCell && typeof value.tableCell === 'object'
        ? value.tableCell as Record<string, unknown>
        : {};
      const row = typeof cell.row === 'string' ? cell.row.trim() : '';
      const column = typeof cell.column === 'string' ? cell.column.trim() : '';
      if (!row || !column || row.length > 200 || column.length > 200) throw new Error(`Question ${index + 1} needs valid table row and column labels.`);
      question.tableCell = { row, column };
    } else if (questionType === 'Flow-Chart Completion') {
      const step = value.flowStep && typeof value.flowStep === 'object'
        ? value.flowStep as Record<string, unknown>
        : {};
      const stepText = typeof step.stepText === 'string' ? step.stepText.trim() : '';
      if (!stepText) throw new Error(`Question ${index + 1} needs a flow-chart step.`);
      question.flowStep = { stepText, position: index + 1 };
    } else if (['Form Completion', 'Note Completion', 'Summary Completion'].includes(questionType)) {
      const completion = value.completion && typeof value.completion === 'object'
        ? value.completion as Record<string, unknown>
        : {};
      const heading = typeof completion.heading === 'string' ? completion.heading.trim() : '';
      const fieldLabel = typeof completion.fieldLabel === 'string' ? completion.fieldLabel.trim() : '';
      question.completion = {
        ...(heading ? { heading } : {}),
        ...(fieldLabel ? { fieldLabel } : {}),
      };
    }

    questions.push(question);
    correctAnswers[id] = answer;
  });

  return { questions, correctAnswers };
}

function parseTask(formData: FormData) {
  const questionType = formString(formData, 'questionType');
  if (!LISTENING_QUESTION_TYPES.includes(questionType as ListeningQuestionType)) {
    throw new Error('Choose a valid Listening question type.');
  }

  const title = formString(formData, 'title');
  const description = formString(formData, 'description');
  const audioKey = formString(formData, 'audioKey');
  const audioUrl = formString(formData, 'audioUrl');
  const audioTitle = formString(formData, 'audioTitle');
  const requestedAudioFormat = formString(formData, 'audioFormat').toUpperCase();
  const instructions = formString(formData, 'instructions');
  const transcript = formString(formData, 'transcript');
  const mapKey = formString(formData, 'mapKey');
  const taskNumber = Number(formString(formData, 'taskNumber'));
  const audioDurationSeconds = Number(formString(formData, 'audioDurationSeconds'));
  const timerMinutes = Number(formString(formData, 'timerMinutes'));
  const difficulty = formString(formData, 'difficulty') as ListeningDifficulty;
  const section = formString(formData, 'section') as ListeningSection;
  const status = formString(formData, 'status') as ListeningTaskStatus;

  if (!title || title.length > 160) throw new Error('Practice set title is required and must be 160 characters or fewer.');
  if (description.length > 1000) throw new Error('Description must be 1,000 characters or fewer.');
  if (audioTitle.length > 200) throw new Error('Audio title must be 200 characters or fewer.');
  if (audioUrl.length > 2048) throw new Error('Audio URL must be 2,048 characters or fewer.');
  if (transcript.length > 100_000) throw new Error('Transcript must be 100,000 characters or fewer.');
  if (!Number.isInteger(taskNumber) || taskNumber < 1) throw new Error('Task number must be a positive whole number.');
  if (!audioKey && !audioUrl) throw new Error('Upload an audio file or provide an audio URL.');
  if (audioKey && !audioKey.startsWith('listening/')) throw new Error('The audio file reference is invalid.');
  if (audioUrl) {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(audioUrl);
    } catch {
      throw new Error('Enter a valid audio URL.');
    }
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error('Audio URL must use HTTP or HTTPS.');
  }
  const audioSourcePath = audioKey || audioUrl;
  const audioFormat = requestedAudioFormat || inferAudioFormat(audioSourcePath);
  if (!AUDIO_FORMATS.includes(audioFormat as (typeof AUDIO_FORMATS)[number])) {
    throw new Error('Choose an audio format: MP3, WAV, M4A or OGG.');
  }
  if (!instructions) throw new Error('Listening instructions are required.');
  if (!['Easy', 'Medium', 'Hard'].includes(difficulty)) throw new Error('Choose a difficulty.');
  if (!['Part 1', 'Part 2', 'Part 3', 'Part 4'].includes(section)) throw new Error('Choose a Listening part.');
  if (!['Draft', 'Published'].includes(status)) throw new Error('Choose a publishing status.');
  if (!Number.isInteger(timerMinutes) || timerMinutes < 1 || timerMinutes > 240) {
    throw new Error('Time limit must be between 1 and 240 minutes.');
  }
  if (audioDurationSeconds < 0 || (!Number.isFinite(audioDurationSeconds) && formString(formData, 'audioDurationSeconds'))) {
    throw new Error('Audio duration must be zero or greater.');
  }
  if (mapKey && !mapKey.startsWith('listening/diagrams/')) throw new Error('The map or diagram reference is invalid.');
  const { questions, correctAnswers } = parseQuestions(formData, questionType as ListeningQuestionType, mapKey);

  const task = {
    questionType,
    taskNumber,
    title,
    description,
    difficulty,
    section,
    status,
    audioKey,
    audioUrl,
    audioTitle,
    audioFormat,
    ...(audioDurationSeconds > 0 ? { audioDurationSeconds } : {}),
    instructions,
    transcript,
    transcriptVisibleToStudents: formString(formData, 'transcriptVisibleToStudents') === 'true',
    ...(mapKey ? { mapKey } : {}),
    timerMinutes,
    questions,
    correctAnswers,
  };
  if (Buffer.byteLength(JSON.stringify(task), 'utf8') > 700_000) {
    throw new Error('This practice set is too large to save. Reduce the transcript or question content.');
  }
  return task;
}

async function createUploadUrl(fileName: string, contentType: string, kind: 'audio' | 'diagram') {
  await requireAdmin();
  const extension = fileName.split('.').pop()?.toLowerCase() ?? '';
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-100) || 'upload';
  const key = kind === 'audio'
    ? `listening/${randomUUID()}-${safeName}`
    : `listening/diagrams/${randomUUID()}-${safeName}`;

  if (kind === 'audio') {
    const expectedType = AUDIO_TYPES[extension];
    if (!expectedType) throw new Error('Choose an MP3, WAV, M4A or OGG audio file.');
    const aliases: Record<string, string[]> = {
      mp3: ['audio/mp3'],
      wav: ['audio/x-wav', 'audio/wave'],
      m4a: ['audio/x-m4a'],
      ogg: ['application/ogg'],
    };
    if (contentType && contentType !== expectedType && !aliases[extension].includes(contentType) && contentType !== 'application/octet-stream') {
      throw new Error('The selected audio file format does not match its extension.');
    }
    return {
      key,
      contentType: expectedType,
      audioFormat: extension.toUpperCase(),
      uploadUrl: await getUploadUrl(key, expectedType),
    };
  }

  if (!IMAGE_TYPES.has(contentType)) throw new Error('Choose a PNG, JPG or WEBP map or diagram.');
  return { key, contentType, uploadUrl: await getUploadUrl(key, contentType) };
}

export async function getAudioUploadUrl(fileName: string, contentType: string) {
  return createUploadUrl(fileName, contentType, 'audio');
}

export async function getMapUploadUrl(fileName: string, contentType: string) {
  return createUploadUrl(fileName, contentType, 'diagram');
}

export async function getListeningPreviewUrl(key: string) {
  await requireAdmin();
  if (!key.startsWith('listening/')) throw new Error('Invalid Listening media reference.');
  return getPlaybackUrl(key);
}

export async function createListeningTask(formData: FormData) {
  await requireAdmin();
  const task = parseTask(formData);
  const sameType = await adminDb.collection('listeningTasks').where('questionType', '==', task.questionType).get();
  if (sameType.docs.some((doc) => Number(doc.get('taskNumber')) === task.taskNumber)) {
    throw new Error(`${task.questionType} already has practice set ${task.taskNumber}.`);
  }
  await adminDb.collection('listeningTasks').add(task);
  revalidateListeningPaths(task.questionType);
}

export async function getListeningTask(taskId: string) {
  await requireAdmin();
  const doc = await adminDb.collection('listeningTasks').doc(taskId).get();
  if (!doc.exists) throw new Error('Practice set not found.');
  const data = doc.data()!;
  return {
    id: doc.id,
    questionType: data.questionType as string,
    taskNumber: Number(data.taskNumber) || 1,
    title: (data.title as string) ?? `Practice set ${Number(data.taskNumber) || 1}`,
    description: (data.description as string) ?? '',
    difficulty: (data.difficulty as ListeningDifficulty) ?? 'Medium',
    section: (data.section as ListeningSection) ?? 'Part 1',
    status: (data.status as ListeningTaskStatus) ?? 'Published',
    audioKey: (data.audioKey as string) ?? '',
    audioUrl: (data.audioUrl as string) ?? '',
    audioTitle: (data.audioTitle as string) ?? '',
    audioFormat: (data.audioFormat as 'MP3' | 'WAV' | 'M4A' | 'OGG' | undefined) ??
      inferAudioFormat(String(data.audioTitle ?? data.audioKey ?? data.audioUrl ?? '')),
    audioDurationSeconds: Number(data.audioDurationSeconds) || 0,
    audioPreviewUrl: data.audioKey ? await getPlaybackUrl(data.audioKey as string) : (data.audioUrl as string) ?? '',
    transcript: (data.transcript as string) ?? '',
    transcriptVisibleToStudents: data.transcriptVisibleToStudents === true,
    mapKey: (data.mapKey as string) ?? '',
    mapPreviewUrl: data.mapKey ? await getPlaybackUrl(data.mapKey as string) : '',
    instructions: (data.instructions as string) ?? '',
    timerMinutes: Number(data.timerMinutes) || 8,
    questions: Array.isArray(data.questions) ? data.questions as ListeningQuestion[] : [],
    correctAnswers: data.correctAnswers && typeof data.correctAnswers === 'object'
      ? data.correctAnswers as Record<string, string>
      : {},
  };
}

export async function updateListeningTask(taskId: string, formData: FormData) {
  await requireAdmin();
  const taskRef = adminDb.collection('listeningTasks').doc(taskId);
  const existing = await taskRef.get();
  if (!existing.exists) throw new Error('Practice set not found.');
  const task = parseTask(formData);
  const sameType = await adminDb.collection('listeningTasks').where('questionType', '==', task.questionType).get();
  if (sameType.docs.some((doc) => doc.id !== taskId && Number(doc.get('taskNumber')) === task.taskNumber)) {
    throw new Error(`${task.questionType} already has practice set ${task.taskNumber}.`);
  }
  await taskRef.update(task);
  revalidateListeningPaths(task.questionType);
}

export async function setListeningTaskStatus(taskId: string, status: ListeningTaskStatus) {
  await requireAdmin();
  if (!['Draft', 'Published'].includes(status)) throw new Error('Choose a valid publishing status.');
  const taskRef = adminDb.collection('listeningTasks').doc(taskId);
  const task = await taskRef.get();
  if (!task.exists) throw new Error('Practice set not found.');
  await taskRef.update({ status });
  revalidateListeningPaths(String(task.get('questionType') ?? ''));
}

export async function duplicateListeningTask(taskId: string) {
  await requireAdmin();
  const source = await adminDb.collection('listeningTasks').doc(taskId).get();
  if (!source.exists) throw new Error('Practice set not found.');
  const data = source.data()!;
  const sameType = await adminDb.collection('listeningTasks').where('questionType', '==', data.questionType).get();
  const taskNumber = sameType.docs.reduce((largest, doc) => Math.max(largest, Number(doc.get('taskNumber')) || 0), 0) + 1;
  await adminDb.collection('listeningTasks').add({
    ...data,
    taskNumber,
    title: data.title ? `${data.title} (copy)` : `Practice set ${taskNumber}`,
    status: 'Draft',
  });
  revalidateListeningPaths(String(data.questionType ?? ''));
}

export async function deleteListeningTask(taskId: string) {
  await requireAdmin();
  const taskRef = adminDb.collection('listeningTasks').doc(taskId);
  const task = await taskRef.get();
  if (!task.exists) throw new Error('Practice set not found.');
  await taskRef.delete();
  revalidateListeningPaths(String(task.get('questionType') ?? ''));
}

function revalidateListeningPaths(questionType: string) {
  revalidatePath('/admin/content/listening');
  revalidatePath('/practice/listening');
  if (questionType) {
    revalidatePath(`/practice/listening/${encodeURIComponent(questionType)}`);
    const slug = questionType.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    revalidatePath(`/admin/content/listening/types/${slug}`);
  }
}
