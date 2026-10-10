'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, BookOpen, Search } from 'lucide-react';
import { inputClass } from '@/components/admin/ui';

type ReadingTypeSummary = {
  name: string;
  slug: string;
  description: string;
  practiceSets: number;
  questions: number;
  published: number;
  drafts: number;
};

export default function ReadingTypeGrid({ types }: { types: ReadingTypeSummary[] }) {
  const [search, setSearch] = useState('');
  const visibleTypes = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return needle
      ? types.filter((type) => `${type.name} ${type.description}`.toLowerCase().includes(needle))
      : types;
  }, [search, types]);

  return (
    <>
      <label className="relative mb-6 block max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search question types"
          aria-label="Search question types"
          className={`${inputClass} pl-9`}
        />
      </label>

      {visibleTypes.length ? (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleTypes.map((type) => (
            <li key={type.name}>
              <Link
                href={`/admin/content/reading/types/${type.slug}`}
                className="group flex h-full min-h-64 flex-col rounded-2xl border bg-card p-5 text-card-foreground shadow-sm transition-[box-shadow,border-color] hover:border-foreground/25 hover:shadow-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <BookOpen className="size-5" aria-hidden />
                  </span>
                  <ArrowUpRight className="size-5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                </div>
                <h2 className="mt-5 text-base font-semibold tracking-tight">{type.name}</h2>
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
          No question types match “{search}”.
        </p>
      )}
    </>
  );
}
