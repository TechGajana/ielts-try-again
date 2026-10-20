import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { getRecordingForStudent } from '@/lib/recordings';
import WatchClient from './watch-client';

async function getStudent() {
  const sessionCookie = (await cookies()).get('session')?.value;
  if (!sessionCookie) redirect('/login');
  let studentId: string;
  try {
    studentId = (await adminAuth.verifySessionCookie(sessionCookie, true)).uid;
  } catch {
    redirect('/login');
  }
  const studentDoc = await adminDb.collection('students').doc(studentId).get();
  return { uid: studentId, allowedCourseIds: (studentDoc.get('allowedCourseIds') as string[] | undefined) ?? [] };
}

export default async function WatchRecordingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const student = await getStudent();

  const recording = await getRecordingForStudent(id, student.allowedCourseIds);
  if (!recording) notFound(); // either it doesn't exist, or this student was never granted access

  return <WatchClient recording={recording} currentStudentId={student.uid} />;
}