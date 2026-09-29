'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Mic, Play, Search } from 'lucide-react';
import { MAX_SPEAKING_ATTEMPTS } from '@/lib/speaking-config';

interface CardItem {
  id: string;
  cardNumber: number;
  topic: string;
}
interface Stat {
  used: number;
  best: number | null;
}

export default function SpeakingBrowser({
  prompts,
  stats,
}: {
  prompts: CardItem[];
  stats: { [taskId: string]: Stat };
}) {
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

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

  const total = prompts.length;
  const done = prompts.filter((p) => (stats[p.id]?.used ?? 0) > 0).length;
  const percent = total ? Math.round((done / total) * 100) : 0;

  // "Resume" goes to a card with one attempt left, else the next untouched card
  const target =
    prompts.find((p) => (stats[p.id]?.used ?? 0) === 1) ?? prompts.find((p) => (stats[p.id]?.used ?? 0) === 0) ?? prompts[0];
  const ctaLabel = done === 0 ? 'Start Training' : done >= total ? 'Practice Again' : 'Resume Training';

  const q = query.trim().toLowerCase();
  const visible = prompts.filter((p) => p.topic.toLowerCase().includes(q) || String(p.cardNumber) === q);

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
            <Mic className="size-5" aria-hidden />
          </div>

          <h1 className="mt-6 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
            Speaking
            <br />
            Module
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Practice the Part 2 long turn. Take one minute to prepare, speak for up to two minutes, then read your
            feedback and try again.
          </p>

          <div className="mt-8 rounded-2xl border bg-card p-5 text-card-foreground shadow-sm">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-medium">Speaking Mastery</h2>
              <span className="text-2xl font-bold tabular-nums">{percent}%</span>
            </div>
            <div
              className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Speaking mastery"
            >
              <div className="h-full rounded-full bg-foreground transition-[width] duration-500" style={{ width: `${percent}%` }} />
            </div>
            <p className="mt-3 text-xs tabular-nums text-muted-foreground">
              {done} of {total} cue cards practised
            </p>

            {target ? (
              <Link
                href={`/practice/speaking/${target.id}`}
                className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <Play className="size-3.5 fill-current" aria-hidden />
                {ctaLabel}
              </Link>
            ) : (
              <span aria-disabled="true" className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-xl bg-muted text-sm text-muted-foreground">
                No cue cards yet
              </span>
            )}
          </div>
        </aside>

        {/* ───────── Cue cards ───────── */}
        <div className="min-w-0">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              ref={searchRef}
              type="text"
              aria-label="Search cue cards"
              placeholder="Find a specific cue card…"
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
            {total === 0 ? (
              <div className="mt-8 rounded-2xl border border-dashed bg-muted/40 p-10 text-center">
                <p className="font-medium">No cue cards yet</p>
                <p className="mt-1 text-sm text-muted-foreground">Check back soon.</p>
              </div>
            ) : visible.length === 0 ? (
              <div className="mt-8 rounded-2xl border border-dashed bg-muted/40 p-10 text-center">
                <p className="font-medium">No cue cards match &ldquo;{query}&rdquo;</p>
                <button
                  onClick={() => setQuery('')}
                  className="mt-4 inline-flex h-10 items-center rounded-lg border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
                >
                  Clear search
                </button>
              </div>
            ) : (
              <ul className="mt-8 divide-y overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-sm">
                {visible.map((p) => {
                  const s = stats[p.id] ?? { used: 0, best: null };
                  const finished = s.used >= MAX_SPEAKING_ATTEMPTS;
                  return (
                    <li key={p.id}>
                      <Link
                        href={`/practice/speaking/${p.id}`}
                        className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/50"
                      >
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium tabular-nums">
                          {p.cardNumber}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm font-medium leading-snug">{p.topic}</p>
                          <p className="mt-1 flex items-center gap-3 text-xs tabular-nums text-muted-foreground">
                            <span className="flex items-center gap-1" aria-label={`${s.used} of ${MAX_SPEAKING_ATTEMPTS} attempts used`}>
                              {Array.from({ length: MAX_SPEAKING_ATTEMPTS }).map((_, i) => (
                                <span key={i} className={`size-2 rounded-full ${i < s.used ? 'bg-foreground' : 'bg-border'}`} />
                              ))}
                            </span>
                            <span>{s.used} of {MAX_SPEAKING_ATTEMPTS} attempts</span>
                            {s.best !== null && <span>Best band {s.best.toFixed(1)}</span>}
                          </p>
                        </div>
                        <span
                          className={`flex h-9 shrink-0 items-center justify-center rounded-full border bg-background px-3.5 text-xs font-medium text-muted-foreground shadow-xs transition-colors group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground`}
                        >
                          {finished ? 'Review' : s.used > 0 ? 'Try again' : 'Start'}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}