import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { getPlaybackUrl } from '@/lib/r2-presign';
import { listSubmittedResults } from '@/lib/writing';
import { WRITING_PARTS, getCategoryBySlug, type WritingPart } from '@/lib/writing-config';
import WritingAttemptClient from './WritingAttemptClient';

async function getStudentId() {
  const sessionCookie = (await cookies()).get('session')?.value!;
  const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
  return decoded.uid;
}

export default async function WritingAttemptPage({
  params,
}: {
  params: Promise<{ category: string; promptId: string }>;
}) {
  const { category: slug, promptId } = await params;
  const cat = getCategoryBySlug(slug);
  const doc = await adminDb.collection('writingPrompts').doc(promptId).get();
  if (!cat || !doc.exists || doc.get('category') !== cat.name) notFound();

  const studentId = await getStudentId();
  const data = doc.data()!;
  const part = data.taskPart as WritingPart;

  const [attempts, imageUrl] = await Promise.all([
    listSubmittedResults(studentId, promptId),
    data.imageKey ? getPlaybackUrl(data.imageKey as string) : Promise.resolve(null),
  ]);

  return (
    <WritingAttemptClient
      categorySlug={slug}
      prompt={{
        id: doc.id,
        part,
        category: cat.name,
        questionNumber: data.questionNumber as number,
        prompt: data.prompt as string,
        imageUrl,
        timerMinutes: (data.timerMinutes as number | undefined) ?? WRITING_PARTS[part].timerMinutes,
      }}
      initialAttempts={attempts}
    />
  );
}