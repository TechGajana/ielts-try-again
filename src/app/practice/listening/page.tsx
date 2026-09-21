import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';
import ListeningBrowser from './ListeningBrowser';

async function getStudentId() {
  const sessionCookie = (await cookies()).get('session')?.value!;
  const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
  return decoded.uid;
}

export default async function ListeningTypesPage() {
  const studentId = await getStudentId();

  const [tasksSnap, attemptsSnap] = await Promise.all([
    adminDb.collection('listeningTasks').select('questionType').get(),
    adminDb
      .collection('attempts')
      .where('studentId', '==', studentId)
      .where('module', '==', 'listening')
      .select('taskId', 'score')
      .get(),
  ]);

  // A track counts as completed once one of its attempts has been submitted and scored.
  // ASSUMPTION: submitted attempts store a `score` field. Change this line if yours differs.
  const completedTaskIds = new Set<string>(
    attemptsSnap.docs.filter((d) => d.get('score') != null).map((d) => d.get('taskId') as string),
  );

  // { 'Multiple Choice': { done: 8, total: 12 }, ... }
  const progress: Record<string, { done: number; total: number }> = {};
  for (const doc of tasksSnap.docs) {
    const type = doc.get('questionType') as string;
    progress[type] ??= { done: 0, total: 0 };
    progress[type].total += 1;
    if (completedTaskIds.has(doc.id)) progress[type].done += 1;
  }

  return <ListeningBrowser progress={progress} />;
}