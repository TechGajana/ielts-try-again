import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase-admin';

export async function getStudentId() {
  const sessionCookie = (await cookies()).get('session')?.value!;
  const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
  return decoded.uid;
}