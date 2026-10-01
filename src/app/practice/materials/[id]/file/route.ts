import { NextResponse } from 'next/server';
import { getSessionStudentAccess } from '@/lib/student-access';
import { getMaterialFileUrlForStudent } from '@/lib/materials';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const access = await getSessionStudentAccess();
  if (!access) return new NextResponse('Unauthorized', { status: 401 });

  const url = await getMaterialFileUrlForStudent(id, access.allowedIds);
  if (!url) return new NextResponse('Not found', { status: 404 });

  const res = NextResponse.redirect(url);
  res.headers.set('Cache-Control', 'no-store');
  return res;
}