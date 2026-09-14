import { adminDb } from '@/lib/firebase-admin';
import ReadingAttemptClient from './ReadingAttemptClient';

export default async function ReadingAttemptPage({
  params,
}: {
  params: Promise<{ type: string; taskId: string }>;
}) {
  const { type, taskId } = await params;
  const taskDoc = await adminDb.collection('readingTasks').doc(taskId).get();
  const task = { id: taskDoc.id, ...taskDoc.data() } as any;

  return <ReadingAttemptClient task={task} questionType={decodeURIComponent(type)} />;
}