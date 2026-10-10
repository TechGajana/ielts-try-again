'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, Headphones, RefreshCw, Search } from 'lucide-react';
import { inputClass } from '@/components/admin/ui';
import { listeningTypeLabel, type ListeningDifficulty, type ListeningTypeSummary } from '@/lib/listening-content';

export default function ListeningTypeGrid({ types }: { types: ListeningTypeSummary[] }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [difficulty, setDifficulty] = useState<'all' | ListeningDifficulty>('all');
  const visibleTypes = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    return types.filter((type) => {
      const matchesSearch = !needle || `${type.name} ${type.description}`.toLocaleLowerCase().includes(needle);
      const matchesStatus = status === 'all' ||
        (status === 'Published' ? type.published > 0 : type.drafts > 0);
      const matchesDifficulty = difficulty === 'all' || type.difficulties[difficulty] > 0;
      return matchesSearch && matchesStatus && matchesDifficulty;
    });
  }, [difficulty, search, status, types]);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <label className="relative min-w-56 flex-1">
          <span className="sr-only">Search Listening question types</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search question types"
            className={`${inputClass} pl-9`}
          />
        </label>
        <label>
          <span className="sr-only">Filter by publishing status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className={inputClass}>
            <option value="all">All statuses</option>
            <option value="Published">Has published sets</option>
            <option value="Draft">Has drafts</option>
          </select>
        </label>
        <label>
          <span className="sr-only">Filter by difficulty</span>
          <select
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value as typeof difficulty)}
            className={inputClass}
          >
            <option value="all">All difficulties</option>
            <option>Easy</option>
            <option>Medium</option>
            <option>Hard</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => router.refresh()}
          className="inline-flex h-11 items-center gap-2 rounded-lg border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
        >
          <RefreshCw className="size-4" aria-hidden />
          Refresh
        </button>
      </div>

      {visibleTypes.length ? (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleTypes.map((type) => (
            <li key={type.name}>
              <Link
                href={`/admin/content/listening/types/${type.slug}`}
                className="group flex h-full min-h-64 flex-col rounded-2xl border bg-card p-5 text-card-foreground shadow-sm transition-[box-shadow,border-color] hover:border-foreground/25 hover:shadow-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Headphones className="size-5" aria-hidden />
                  </span>
                  <ArrowUpRight className="size-5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                </div>
                <h2 className="mt-5 text-base font-semibold tracking-tight">{listeningTypeLabel(type.name)}</h2>
                <p className="mt-1 min-h-10 text-sm leading-relaxed text-muted-foreground">{type.description}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-muted px-2.5 py-1">{type.practiceSets} practice sets</span>
                  <span className="rounded-full bg-muted px-2.5 py-1">{type.questions} questions</span>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{type.published} published</span>
                  <span aria-hidden>·</span>
                  <span>{type.drafts} drafts</span>
                </div>
                <span className="mt-auto inline-flex items-center gap-1 pt-5 text-sm font-medium text-primary">
                  Manage content <ArrowUpRight className="size-4" aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed bg-muted/40 p-10 text-center text-sm text-muted-foreground">
          No question types match the selected search and filters.
        </p>
      )}
    </>
  );
}
