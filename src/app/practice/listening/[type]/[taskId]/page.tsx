import { adminDb } from '@/lib/firebase-admin';
import ListeningAttemptClient from './ListeningAttemptClient';

export default async function ListeningAttemptPage({
  params,
}: {
  params: Promise<{ type: string; taskId: string }>;
}) {
  const { type, taskId } = await params;
  const taskDoc = await adminDb.collection('listeningTasks').doc(taskId).get();
  const data = taskDoc.data()!;

  // audioKey and correctAnswers are stripped here: audioKey is only needed
  // server-side to sign a playback URL, and correctAnswers must never reach
  // the browser before submission (same fix I flagged for Reading earlier).
  const { audioKey: _audioKey, correctAnswers: _correctAnswers, ...safeTask } = data;
  const task = { id: taskDoc.id, ...safeTask } as any;

  return <ListeningAttemptClient task={task} questionType={decodeURIComponent(type)} />;
}