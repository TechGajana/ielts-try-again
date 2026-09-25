'use client';

import { useState, useTransition } from 'react';
import { LoaderCircle, RotateCcw } from 'lucide-react';
import { resetAttempts } from './actions';

export default function ResetAttemptsButton({ uid, label }: { uid: string; label: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label={`Reset attempts for ${label}`}
        className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-amber-500/10 hover:text-amber-600 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 dark:hover:text-amber-400"
      >
        <RotateCcw className="size-4" aria-hidden />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2" role="group" aria-label={`Confirm resetting attempts for ${label}`}>
      <button
        type="button"
        autoFocus
        onClick={() => setConfirming(false)}
        disabled={pending}
        className="h-9 rounded-lg border bg-background px-3 text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:opacity-60"
      >
        Cancel
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await resetAttempts(uid);
          })
        }
        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-amber-600 px-3 text-sm font-medium text-white transition-colors hover:bg-amber-600/90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-amber-500/40 disabled:opacity-60"
      >
        {pending && <LoaderCircle className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden />}
        Reset
      </button>
    </div>
  );
}