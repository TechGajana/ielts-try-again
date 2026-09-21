import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';
import ReadingBrowser from './ReadingBrowser';

async function getStudentId() {
  const sessionCookie = (await cookies()).get('session')?.value!;
  const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
  return decoded.uid;
}

export default async function ReadingTypesPage() {
  const studentId = await getStudentId();

  const [tasksSnap, attemptsSnap] = await Promise.all([
    adminDb.collection('readingTasks').select('questionType').get(),
    adminDb
      .collection('attempts')
      .where('studentId', '==', studentId)
      .where('module', '==', 'reading')
      .select('taskId')
      .get(),
  ]);

  // Every task this student has attempted at least once
  const attemptedTaskIds = new Set<string>(attemptsSnap.docs.map((d) => d.get('taskId') as string));

  // { 'Matching Headings': { done: 3, total: 10 }, ... }
  const progress: Record<string, { done: number; total: number }> = {};
  for (const doc of tasksSnap.docs) {
    const type = doc.get('questionType') as string;
    progress[type] ??= { done: 0, total: 0 };
    progress[type].total += 1;
    if (attemptedTaskIds.has(doc.id)) progress[type].done += 1;
  }

  return <ReadingBrowser progress={progress} />;
}