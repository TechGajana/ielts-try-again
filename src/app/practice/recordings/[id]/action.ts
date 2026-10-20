'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { addComment, deleteComment, listComments } from '@/lib/recording-comments';

async function getStudent() {
  const sessionCookie = (await cookies()).get('session')?.value;
  if (!sessionCookie) redirect('/login');
  const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
  const studentDoc = await adminDb.collection('students').doc(decoded.uid).get();
  const name = (studentDoc.get('username') as string) ?? 'Student';
  return { uid: decoded.uid, name };
}

export async function getComments(recordingId: string) {
  return listComments(recordingId);
}

export async function postComment(recordingId: string, text: string) {
  const student = await getStudent();
  return addComment({ recordingId, studentId: student.uid, studentName: student.name, text });
}

export async function removeComment(commentId: string) {
  const student = await getStudent();
  await deleteComment(commentId, student.uid);
}