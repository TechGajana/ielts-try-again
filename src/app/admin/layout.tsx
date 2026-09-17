import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase-admin';
import { redirect } from 'next/navigation';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const sessionCookie = (await cookies()).get('session')?.value;
  if (!sessionCookie) redirect('/login');

  const decoded = await adminAuth.verifySessionCookie(sessionCookie, true).catch(() => null);
  if (!decoded || decoded.role !== 'admin') redirect('/login');

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 bg-gray-900 text-white p-4 space-y-2">
        <h2 className="font-semibold mb-4">QAnix Admin</h2>
        <a href="/admin" className="block py-1 hover:underline">Dashboard</a>
        <a href="/admin/content/reading" className="block py-1 hover:underline">Reading Content</a>
        <a href="/admin/content/listening" className="block py-1 hover:underline">Listening Content</a>
        <a href="/admin/students" className="block py-1 hover:underline">Students</a>
      </aside>
      <main className="flex-1">{children}</main>
    </div>
  );
}