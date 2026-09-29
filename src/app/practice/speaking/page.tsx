import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';
import SpeakingBrowser from './SpeakingBrowser';

async function getStudentId() {
  const sessionCookie = (await cookies()).get('session')?.value!;
  const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
  return decoded.uid;
}

export default async function SpeakingPage() {
  const studentId = await getStudentId();

  const [promptsSnap, attemptsSnap] = await Promise.all([
    adminDb.collection('speakingPrompts').orderBy('cardNumber').select('cardNumber', 'topic').get(),
    adminDb
      .collection('attempts')
      .where('studentId', '==', studentId)
      .where('module', '==', 'speaking')
      .select('taskId', 'submittedAt', 'bandScore')
      .get(),
  ]);

  const stats: { [taskId: string]: { used: number; best: number | null } } = {};
  for (const d of attemptsSnap.docs) {
    if (!d.get('submittedAt')) continue;
    const id = d.get('taskId') as string;
    stats[id] ??= { used: 0, best: null };
    stats[id].used += 1;
    const band = d.get('bandScore') as number | undefined;
    if (band != null) stats[id].best = Math.max(stats[id].best ?? 0, band);
  }

  const prompts = promptsSnap.docs.map((d) => ({
    id: d.id,
    cardNumber: d.get('cardNumber') as number,
    topic: d.get('topic') as string,
  }));

  return <SpeakingBrowser prompts={prompts} stats={stats} />;
}