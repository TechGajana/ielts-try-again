import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { listRecordingsForStudent } from '@/lib/recordings';
import RecordingsBrowser from './RecordingsBrowser';

async function getStudentId() {
  const sessionCookie = (await cookies()).get('session')?.value;
  if (!sessionCookie) redirect('/login');
  try {
    return (await adminAuth.verifySessionCookie(sessionCookie, true)).uid;
  } catch {
    redirect('/login');
  }
}

export default async function RecordingsPage() {
  const studentId = await getStudentId();
  const studentDoc = await adminDb.collection('students').doc(studentId).get();
  const allowedCourseIds = (studentDoc.get('allowedCourseIds') as string[] | undefined) ?? [];

  const recordings = await listRecordingsForStudent(allowedCourseIds);

  return <RecordingsBrowser recordings={recordings} />;
}