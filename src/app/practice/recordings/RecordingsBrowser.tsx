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
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {recordings.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/practice/recordings/${r.id}`}
                  className="group block overflow-hidden rounded-xl border bg-card text-card-foreground transition-[transform,box-shadow,border-color] hover:border-foreground/25 hover:shadow-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 motion-safe:hover:-translate-y-0.5"
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video w-full overflow-hidden bg-muted">
                    {r.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- signed R2 URL, not a static asset
                      <img
                        src={r.thumbnailUrl}
                        alt=""
                        className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center bg-gradient-to-br from-primary/10 to-muted">
                        <Video className="size-8 text-muted-foreground" aria-hidden />
                      </div>
                    )}

                    {/* Play overlay */}
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
                      <span className="flex size-11 items-center justify-center rounded-full bg-white/90 text-primary opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                        <Play className="ml-0.5 size-5 fill-current" aria-hidden />
                      </span>
                    </div>
                  </div>

                  {/* Text */}
                  <div className="p-4">
                    <h2 className="line-clamp-2 text-sm font-medium leading-snug tracking-tight">{r.title}</h2>
                    {r.description && (
                      <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        {r.description}
                      </p>
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