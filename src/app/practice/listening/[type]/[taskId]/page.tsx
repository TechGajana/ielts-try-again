import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { getPlaybackUrl } from '@/lib/r2-presign';
import type { ListeningQuestion } from '@/lib/listening-content';
import ListeningAttemptClient from './ListeningAttemptClient';

type SafeListeningQuestion = Omit<ListeningQuestion, 'alternativeAnswers' | 'explanation' | 'mapLabel'> & {
  mapLabel?: { x?: number; y?: number };
};

export default async function ListeningAttemptPage({
  params,
}: {
  params: Promise<{ type: string; taskId: string }>;
}) {
  const { type, taskId } = await params;
  const session = (await cookies()).get('session')?.value;
  if (!session) redirect('/login');
  await adminAuth.verifySessionCookie(session, true);

  const taskDoc = await adminDb.collection('listeningTasks').doc(taskId).get();
  if (!taskDoc.exists || taskDoc.get('status') === 'Draft') notFound();
  const data = taskDoc.data()!;
  if (decodeURIComponent(type) !== data.questionType) notFound();

  const questions: SafeListeningQuestion[] = (Array.isArray(data.questions) ? data.questions : [])
    .map((question: ListeningQuestion) => ({
      id: question.id,
      type: question.type,
      answerMode: question.answerMode,
      text: question.text,
      ...(question.options ? { options: question.options } : {}),
      ...(question.wordLimit ? { wordLimit: question.wordLimit } : {}),
      ...(question.audioStartTime !== undefined ? { audioStartTime: question.audioStartTime } : {}),
      ...(question.audioEndTime !== undefined ? { audioEndTime: question.audioEndTime } : {}),
      ...(question.matching ? { matching: question.matching } : {}),
      ...(question.mapLabel ? { mapLabel: { x: question.mapLabel.x, y: question.mapLabel.y } } : {}),
      ...(question.completion ? { completion: question.completion } : {}),
      ...(question.tableCell ? { tableCell: question.tableCell } : {}),
      ...(question.flowStep ? { flowStep: question.flowStep } : {}),
    }));
  const task = {
    id: taskDoc.id,
    taskNumber: Number(data.taskNumber) || 1,
    title: String(data.title ?? ''),
    section: String(data.section ?? 'Part 1'),
    timerMinutes: Number(data.timerMinutes) || 8,
    instructions: String(data.instructions ?? ''),
    questions,
    mapImageUrl: data.mapKey ? await getPlaybackUrl(data.mapKey as string) : '',
    transcript: data.transcriptVisibleToStudents === true ? String(data.transcript ?? '') : '',
  };

  return <ListeningAttemptClient task={task} questionType={decodeURIComponent(type)} />;
}
