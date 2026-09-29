import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { listSubmittedResults } from '@/lib/speaking';
import SpeakingAttemptClient from './SpeakingAttemptClient';

async function getStudentId() {
  const sessionCookie = (await cookies()).get('session')?.value!;
  const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
  return decoded.uid;
}

export default async function SpeakingAttemptPage({ params }: { params: Promise<{ promptId: string }> }) {
  const { promptId } = await params;
  const doc = await adminDb.collection('speakingPrompts').doc(promptId).get();
  if (!doc.exists) notFound();

  const studentId = await getStudentId();
  const attempts = await listSubmittedResults(studentId, promptId);
  const data = doc.data()!;

  return (
    <SpeakingAttemptClient
      prompt={{
        id: doc.id,
        cardNumber: data.cardNumber as number,
        topic: data.topic as string,
        bullets: (data.bullets ?? []) as string[],
      }}
      initialAttempts={attempts}
    />
  );
}