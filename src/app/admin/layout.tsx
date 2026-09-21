import { cookies } from 'next/headers';
import Link from 'next/link';
import { adminAuth } from '@/lib/firebase-admin';
import { redirect } from 'next/navigation';
import { ArrowUpRight, GraduationCap } from 'lucide-react';
import AdminNav from '@/components/admin/admin-nav';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const sessionCookie = (await cookies()).get('session')?.value;
  if (!sessionCookie) redirect('/login');

  const decoded = await adminAuth.verifySessionCookie(sessionCookie, true).catch(() => null);
  if (!decoded || decoded.role !== 'admin') redirect('/login');

  return (
    <div className="min-h-svh bg-muted/30 text-foreground lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="flex flex-col border-b bg-background lg:sticky lg:top-0 lg:h-svh lg:border-b-0 lg:border-r">
        <div className="flex h-16 items-center gap-3 px-5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="size-5" aria-hidden />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-medium tracking-tight">IELTS Try Again</p>
            <p className="text-xs text-muted-foreground">Admin</p>
          </div>
        </div>

        <AdminNav />

        <div className="hidden border-t p-3 lg:block">
          <Link
            href="/dashboard"
            className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
          >
            View student site
            <ArrowUpRight className="size-4" aria-hidden />
          </Link>
        </div>
      </aside>

      <main className="min-w-0 px-6 py-8 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}