import { notFound } from 'next/navigation';
import { getSessionStudentAccess } from '@/lib/student-access';
import { getRecordingForStudent } from '@/lib/recordings';
import WatchClient from './watch-client';

export default async function WatchRecordingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await getSessionStudentAccess();
  if (!access) notFound();

  const recording = await getRecordingForStudent(id, access.allowedIds);
  if (!recording) notFound(); // doesn't exist, or this student wasn't granted it

  return <WatchClient recording={recording} />;
}