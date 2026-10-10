import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { getPlaybackUrl } from '@/lib/r2-presign';
import type { ReadingQuestion, ReadingTaskView } from '@/lib/reading-content';
import ReadingAttemptClient from './ReadingAttemptClient';

export default async function ReadingAttemptPage({
  params,
}: {
  params: Promise<{ type: string; taskId: string }>;
}) {
  const { type, taskId } = await params;
  const session = (await cookies()).get('session')?.value;
  if (!session) redirect('/login');
  await adminAuth.verifySessionCookie(session, true);

  const taskDoc = await adminDb.collection('readingTasks').doc(taskId).get();
  if (!taskDoc.exists || taskDoc.get('status') === 'Draft') notFound();
  const data = taskDoc.data()!;
  const questions: ReadingQuestion[] = Array.isArray(data.questions) ? data.questions : [];
  const task: ReadingTaskView = {
    id: taskDoc.id,
    questionType: data.questionType,
    taskNumber: Number(data.taskNumber) || 1,
    title: data.title,
    description: data.description,
    passage: data.passage,
    passageFormat: data.passageFormat,
    instructions: data.instructions ?? '',
    timerMinutes: Number(data.timerMinutes) || 10,
    difficulty: data.difficulty,
    status: data.status,
    completionType: data.completionType,
    questions: questions.map(({ id, text, options, wordLimit }) => ({ id, text, options, wordLimit })),
  };
  if (typeof data.diagramKey === 'string') task.diagramKey = data.diagramKey;
  const diagramUrl = task.diagramKey ? await getPlaybackUrl(task.diagramKey) : null;

  return <ReadingAttemptClient task={task} diagramUrl={diagramUrl} questionType={decodeURIComponent(type)} />;
}