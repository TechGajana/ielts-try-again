'use client';

import { BackLink } from '@/components/practice/back-link';
import type { RecordingWithUrl } from '@/lib/recordings';

export default function WatchClient({ recording }: { recording: RecordingWithUrl }) {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <BackLink href="/practice/recordings" label="Recorded courses" />

        <h1 className="mt-6 text-2xl font-bold tracking-tight sm:text-3xl">{recording.title}</h1>
        {recording.description && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{recording.description}</p>
        )}

        <div
          className="mt-6 overflow-hidden rounded-2xl border bg-black shadow-sm"
          onContextMenu={(e) => e.preventDefault()}
        >
          <video
            src={recording.videoUrl}
            controls
            controlsList="nodownload noremoteplayback"
            disablePictureInPicture
            className="aspect-video w-full"
          />
        </div>
      </div>
    </div>
  );
}