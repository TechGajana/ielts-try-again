'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, CircleCheck, Play, Search, type LucideIcon } from 'lucide-react';

export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type ModuleGroup = { title: string; types: { name: string; difficulty?: Difficulty }[] };
export type Progress = Record<string, { done: number; total: number }>;

type Props = {
  basePath: string; // e.g. '/practice/listening'
  title: string; // e.g. 'Listening' (rendered as "Listening Module")
  description: string;
  masteryLabel: string; // e.g. 'Audio Mastery'
  unit: string; // e.g. 'track' -> "8 / 12 tracks completed"
  searchPlaceholder: string;
  icon: LucideIcon; // big tile in the sidebar
  sectionIcon: LucideIcon; // small icon beside each group label
  groups: ModuleGroup[];
  progress: Progress;
};

const BADGE: Record<Difficulty, string> = {
  Easy: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  Medium: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  Hard: 'border-pink-500/30 bg-pink-500/10 text-pink-600 dark:text-pink-400',
};

function ProgressRing({ done, total }: { done: number; total: number }) {
  if (total > 0 && done >= total) {
    return <CircleCheck className="size-9 shrink-0 text-emerald-500" strokeWidth={1.5} aria-hidden />;
  }
  const r = 15;
  const c = 2 * Math.PI * r;
  const fraction = total ? done / total : 0;
  return (
    <svg viewBox="0 0 36 36" className="size-9 shrink-0 -rotate-90" aria-hidden>
      <circle cx="18" cy="18" r={r} fill="none" strokeWidth="3" className="stroke-border" />
      <circle
        cx="18"
        cy="18"
        r={r}
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
        className="stroke-foreground transition-[stroke-dashoffset] duration-500"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - fraction)}
      />
    </svg>
  );
}

function TypeRow({
  href,
  name,
  difficulty,
  done,
  total,
  unit,
}: {
  href: string;
  name: string;
  difficulty?: Difficulty;
  done: number;
  total: number;
  unit: string;
}) {
  const available = total > 0;

  const body = (
    <>
      <ProgressRing done={done} total={total} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <span className="text-base font-semibold leading-snug">{name}</span>
          {difficulty && (
            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${BADGE[difficulty]}`}>
              {difficulty}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
          {available ? `${done} / ${total} ${unit}s completed` : 'No tasks yet'}
        </p>
      </div>
      <span
        className={`flex size-10 shrink-0 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-xs transition-colors ${
          available
            ? 'group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground'
            : 'opacity-50'
        }`}
      >
        <Play className="size-3.5 fill-current" aria-hidden />
      </span>
    </>
  );

  if (!available) {
    return (
      <li>
        <div aria-disabled="true" className="flex items-center gap-4 px-5 py-4 text-muted-foreground">
          {body}
        </div>
      </li>
    );
  }

  return (
    <li>
      <Link
        href={href}
        className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/50"
      >
        {body}
      </Link>
    </li>
  );
}

export default function ModuleBrowser({
  basePath,
  title,
  description,
  masteryLabel,
  unit,
  searchPlaceholder,
  icon: ModuleIcon,
  sectionIcon: SectionIcon,
  groups,
  progress,
}: Props) {
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const uid = useId();

  // Ctrl/⌘ + K focuses the search box
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Any question type that exists in the database but isn't listed in `groups`
  // still shows up, under "Other", so nothing is ever hidden by a naming mismatch.
  const allGroups = useMemo(() => {
    const known = new Set(groups.flatMap((g) => g.types.map((t) => t.name)));
    const extra = Object.keys(progress)
      .filter((name) => !known.has(name))
      .sort();
    return extra.length ? [...groups, { title: 'Other', types: extra.map((name) => ({ name })) }] : groups;
  }, [groups, progress]);

  const allTypes = allGroups.flatMap((g) => g.types);

  // Overall progress
  const total = allTypes.reduce((sum, t) => sum + (progress[t.name]?.total ?? 0), 0);
  const done = allTypes.reduce((sum, t) => sum + (progress[t.name]?.done ?? 0), 0);
  const percent = total ? Math.round((done / total) * 100) : 0;

  // Where "Resume" goes: a type that's partly done, else the next untouched one
  const withTasks = allTypes.filter((t) => (progress[t.name]?.total ?? 0) > 0);
  const partial = withTasks.find((t) => {
    const p = progress[t.name];
    return p.done > 0 && p.done < p.total;
  });
  const next = withTasks.find((t) => progress[t.name].done < progress[t.name].total);
  const target = partial ?? next ?? withTasks[0];
  const ctaLabel = done === 0 ? 'Start Training' : done >= total ? 'Practice Again' : 'Resume Training';

  // Search filter
  const q = query.trim().toLowerCase();
  const visibleGroups = allGroups
    .map((g) => ({ ...g, types: g.types.filter((t) => t.name.toLowerCase().includes(q)) }))
    .filter((g) => g.types.length > 0);

  const hrefFor = (name: string) => `${basePath}/${encodeURIComponent(name)}`;

  return (
    <div className="min-h-svh bg-background text-foreground">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-10 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-10">
        {/* ───────── Sidebar ───────── */}
        <aside className="lg:sticky lg:top-10 lg:self-start">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-full bg-muted/60 py-1 pl-1 pr-3.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
          >
            <span className="flex size-7 items-center justify-center rounded-full bg-background shadow-xs">
              <ChevronLeft className="size-4" aria-hidden />
            </span>
            Dashboard
          </Link>

          <div className="mt-8 flex size-12 items-center justify-center rounded-xl border bg-muted shadow-xs">
            <ModuleIcon className="size-5" aria-hidden />
          </div>

          <h1 className="mt-6 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
            {title}
            <br />
            Module
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>

          <div className="mt-8 rounded-2xl border bg-card p-5 text-card-foreground shadow-sm">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-medium">{masteryLabel}</h2>
              <span className="text-2xl font-bold tabular-nums">{percent}%</span>
            </div>
            <div
              className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={masteryLabel}
            >
              <div
                className="h-full rounded-full bg-foreground transition-[width] duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="mt-3 text-xs tabular-nums text-muted-foreground">
              {done} of {total} {unit}s completed
            </p>

            {target ? (
              <Link
                href={hrefFor(target.name)}
                className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <Play className="size-3.5 fill-current" aria-hidden />
                {ctaLabel}
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-xl bg-muted text-sm text-muted-foreground"
              >
                No tasks yet
              </span>
            )}
          </div>
        </aside>

        {/* ───────── Question types ───────── */}
        <div className="min-w-0">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              ref={searchRef}
              type="text"
              aria-label="Search question types"
              placeholder={searchPlaceholder}
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setQuery('')}
              className="h-12 w-full rounded-xl border border-input bg-card pl-11 pr-16 text-base shadow-sm outline-none transition-[box-shadow,border-color] placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 md:text-sm"
            />
            <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border bg-background px-1.5 py-0.5 font-sans text-[11px] text-muted-foreground shadow-xs sm:block">
              ⌘ K
            </kbd>
          </div>

          <div aria-live="polite">
            {visibleGroups.length === 0 ? (
              <div className="mt-8 rounded-2xl border border-dashed bg-muted/40 p-10 text-center">
                <p className="font-medium">No question types match &ldquo;{query}&rdquo;</p>
                <button
                  onClick={() => setQuery('')}
                  className="mt-4 inline-flex h-10 items-center rounded-lg border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
                >
                  Clear search
                </button>
              </div>
            ) : (
              visibleGroups.map((group, i) => {
                const headingId = `${uid}-group-${i}`;
                return (
                  <section key={group.title} className="mt-8" aria-labelledby={headingId}>
                    <h2
                      id={headingId}
                      className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      <SectionIcon className="size-3.5" aria-hidden />
                      {group.title}
                    </h2>
                    <ul className="divide-y overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-sm">
                      {group.types.map((t) => (
                        <TypeRow
                          key={t.name}
                          href={hrefFor(t.name)}
                          name={t.name}
                          difficulty={t.difficulty}
                          done={progress[t.name]?.done ?? 0}
                          total={progress[t.name]?.total ?? 0}
                          unit={unit}
                        />
                      ))}
                    </ul>
                  </section>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}