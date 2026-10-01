'use client';

import Link from 'next/link';
import { Play, Video } from 'lucide-react';
import { BackLink } from '@/components/practice/back-link';
import type { RecordingWithUrl } from '@/lib/recordings';

export default function RecordingsBrowser({ recordings }: { recordings: RecordingWithUrl[] }) {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <BackLink href="/dashboard" label="Dashboard" />

        <div className="mt-8 flex size-12 items-center justify-center rounded-xl border bg-muted shadow-xs">
          <Video className="size-5" aria-hidden />
        </div>
        <h1 className="mt-6 text-4xl font-bold tracking-tight">Recorded courses</h1>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
          Video lessons your institute or tutor has shared with you.
        </p>

        {recordings.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed bg-muted/40 p-10 text-center">
            <p className="font-medium">No recordings yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Your tutor hasn&apos;t shared any video lessons with you yet.
            </p>
          </div>
        ) : (
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recordings.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/practice/recordings/${r.id}`}
                  className="group flex h-full flex-col justify-between gap-6 rounded-xl border bg-card p-5 text-card-foreground transition-[transform,box-shadow,border-color] hover:border-foreground/25 hover:shadow-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 motion-safe:hover:-translate-y-0.5"
                >
                  <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Play className="size-5 fill-current" aria-hidden />
                  </div>
                  <div>
                    <h2 className="text-base font-medium leading-snug tracking-tight">{r.title}</h2>
                    {r.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{r.description}</p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}