import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase-admin';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const sessionCookie = (await cookies()).get('session')?.value;
  if (!sessionCookie) redirect('/login');

  try {
    await adminAuth.verifySessionCookie(sessionCookie, true);
  } catch {
    redirect('/login');
  }

  return <div>{children}</div>;
}