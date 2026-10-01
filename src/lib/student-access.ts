import { cookies } from 'next/headers';
import { FieldPath, type QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from './firebase-admin';

/** The signed-in student's id and the resource ids an admin has granted them. */
export async function getSessionStudentAccess(): Promise<{ uid: string; allowedIds: string[] } | null> {
  const sessionCookie = (await cookies()).get('session')?.value;
  if (!sessionCookie) return null;

  const decoded = await adminAuth.verifySessionCookie(sessionCookie, true).catch(() => null);
  if (!decoded) return null;

  const doc = await adminDb.collection('students').doc(decoded.uid).get();
  if (!doc.exists || doc.get('accountStatus') === 'suspended') return null;

  return { uid: decoded.uid, allowedIds: (doc.get('allowedCourseIds') as string[] | undefined) ?? [] };
}

/** Fetch documents from a collection by id. Only existing docs come back. */
export async function fetchDocsByIds(collection: string, ids: string[]): Promise<QueryDocumentSnapshot[]> {
  const valid = [...new Set(ids)].filter((id) => id && !id.includes('/'));
  const out: QueryDocumentSnapshot[] = [];
  // Firestore 'in' queries accept at most 30 values
  for (let i = 0; i < valid.length; i += 30) {
    const snap = await adminDb
      .collection(collection)
      .where(FieldPath.documentId(), 'in', valid.slice(i, i + 30))
      .get();
    out.push(...snap.docs);
  }
  return out;
}