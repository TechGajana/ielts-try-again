import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronRight, GraduationCap, LayoutDashboard } from 'lucide-react';

export type Crumb = { label: string; href?: string };

export function PracticeShell({ crumbs, children }: { crumbs: Crumb[]; children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-[#f6f7f4] text-foreground">
      <header className="sticky top-0 z-30 border-b border-black/[0.06] bg-white/85 shadow-[0_1px_0_rgba(18,38,31,0.02)] backdrop-blur-xl">
        <div className="mx-auto flex h-[4.25rem] w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-5">
          <Link
            href="/dashboard"
            className="flex shrink-0 items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
          >
            <div className="flex size-9 items-center justify-center rounded-xl bg-[#183b30] text-white shadow-sm">
              <GraduationCap className="size-5" aria-hidden />
            </div>
            <span className="hidden text-sm font-semibold tracking-tight sm:block">IELTS <span className="text-[#68877a]">STUDIO</span></span>
          </Link>

          <nav aria-label="Breadcrumb" className="min-w-0 border-l border-black/10 pl-4">
            <ol className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
              {crumbs.map((crumb, i) => {
                const isLast = i === crumbs.length - 1;
                return (
                  <li key={crumb.label} className="flex min-w-0 items-center gap-1.5">
                    <ChevronRight className="size-4 shrink-0" aria-hidden />
                    {crumb.href && !isLast ? (
                      <Link
                        href={crumb.href}
                        className="truncate rounded-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span aria-current={isLast ? 'page' : undefined} className="truncate text-foreground">
                        {crumb.label}
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-black/[0.08] bg-white px-3 text-xs font-medium text-[#35463f] shadow-sm transition-colors hover:border-[#183b30]/20 hover:bg-[#f5f8f5] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
          >
            <LayoutDashboard className="size-3.5" aria-hidden />
            <span className="hidden sm:inline">Workspace</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">{children}</main>
    </div>
  );
}