import { adminDb } from '@/lib/firebase-admin';
import ListeningAttemptClient from './ListeningAttemptClient';

export default async function ListeningAttemptPage({
  params,
}: {
  params: Promise<{ type: string; taskId: string }>;
}) {
  const { type, taskId } = await params;
  const taskDoc = await adminDb.collection('listeningTasks').doc(taskId).get();
  const task = { id: taskDoc.id, ...taskDoc.data() } as any;

  return <ListeningAttemptClient task={task} questionType={decodeURIComponent(type)} />;
}