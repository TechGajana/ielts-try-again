import { redirect } from 'next/navigation';
import { getResultView, getSessionStudentId } from '@/lib/mock';
import MockResults from './MockResults';

export default async function MockResultsPage({ params }: { params: Promise<{ mockId: string }> }) {
  const { mockId } = await params;
  const studentId = await getSessionStudentId();
  const res = await getResultView(studentId, mockId);

  if (res.status === 'none' || res.status === 'active') redirect(`/mock-tests/${mockId}`);

  return <MockResults mockId={mockId} initial={res.view} />;
}