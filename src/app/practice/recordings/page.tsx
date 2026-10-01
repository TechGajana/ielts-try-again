import { cookies } from 'next/headers';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { listRecordingsForStudent } from '@/lib/recordings';
import RecordingsBrowser from './RecordingsBrowser';

async function getStudentId() {
  const sessionCookie = (await cookies()).get('session')?.value!;
  const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
  return decoded.uid;
}

export default async function RecordingsPage() {
  const studentId = await getStudentId();
  const studentDoc = await adminDb.collection('students').doc(studentId).get();
  const allowedCourseIds = (studentDoc.get('allowedCourseIds') as string[] | undefined) ?? [];

  const recordings = await listRecordingsForStudent(allowedCourseIds);

  return <RecordingsBrowser recordings={recordings} />;
}