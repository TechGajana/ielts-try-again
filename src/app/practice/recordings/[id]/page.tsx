import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { getRecordingForStudent } from '@/lib/recordings';
import { listComments } from '@/lib/recording-comments';
import WatchClient from './watch-client';

async function getStudent() {
  const sessionCookie = (await cookies()).get('session')?.value!;
  const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
  const studentDoc = await adminDb.collection('students').doc(decoded.uid).get();
  return { uid: decoded.uid, allowedCourseIds: (studentDoc.get('allowedCourseIds') as string[] | undefined) ?? [] };
}

export default async function WatchRecordingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const student = await getStudent();

  const recording = await getRecordingForStudent(id, student.allowedCourseIds);
  if (!recording) notFound(); // either it doesn't exist, or this student was never granted access

  const comments = await listComments(id);

  return <WatchClient recording={recording} currentStudentId={student.uid} initialComments={comments} />;
}