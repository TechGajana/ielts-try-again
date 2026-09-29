import { notFound, redirect } from 'next/navigation';
import { getSessionStudentId, loadMock } from '@/lib/mock';
import MockClient from './MockClient';

export default async function MockPage({ params }: { params: Promise<{ mockId: string }> }) {
  const { mockId } = await params;
  const studentId = await getSessionStudentId();
  const load = await loadMock(studentId, mockId);

  if (load.kind === 'missing') notFound();
  if (load.kind === 'closed') redirect(`/mock-tests/${mockId}/results`);

  return <MockClient mockId={mockId} load={load} />;
}