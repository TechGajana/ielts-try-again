import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';
import WritingBrowser from './WritingBrowser';

async function getStudentId() {
  const sessionCookie = (await cookies()).get('session')?.value!;
  const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
  return decoded.uid;
}

export default async function WritingPage() {
  const studentId = await getStudentId();

  const [promptsSnap, attemptsSnap] = await Promise.all([
    adminDb.collection('writingPrompts').select('category').get(),
    adminDb
      .collection('attempts')
      .where('studentId', '==', studentId)
      .where('module', '==', 'writing')
      .select('taskId', 'submittedAt')
      .get(),
  ]);

  // A question counts as completed once any attempt on it has been submitted
  const submittedIds = new Set<string>(
    attemptsSnap.docs.filter((d) => d.get('submittedAt')).map((d) => d.get('taskId') as string),
  );

  const progress: Record<string, { done: number; total: number }> = {};
  for (const doc of promptsSnap.docs) {
    const category = doc.get('category') as string;
    progress[category] ??= { done: 0, total: 0 };
    progress[category].total += 1;
    if (submittedIds.has(doc.id)) progress[category].done += 1;
  }

  return <WritingBrowser progress={progress} />;
}