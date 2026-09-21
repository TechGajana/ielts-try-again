import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronRight, GraduationCap } from 'lucide-react';

export type Crumb = { label: string; href?: string };

export function PracticeShell({ crumbs, children }: { crumbs: Crumb[]; children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-2 px-6">
          <Link
            href="/dashboard"
            className="flex shrink-0 items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
          >
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="size-5" aria-hidden />
            </div>
            <span className="hidden text-base font-medium tracking-tight sm:block">IELTS Try Again</span>
          </Link>

          <nav aria-label="Breadcrumb" className="min-w-0">
            <ol className="flex items-center gap-1.5 text-sm text-muted-foreground">
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
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">{children}</main>
    </div>
  );
}