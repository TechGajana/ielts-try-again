'use client';

import { useState, useTransition } from 'react';
import { LoaderCircle, Trash2 } from 'lucide-react';

export default function DeleteTaskButton({
  action,
  label,
}: {
  action: () => Promise<void>;
  label: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label={`Delete ${label}`}
        className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
      >
        <Trash2 className="size-4" aria-hidden />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2" role="group" aria-label={`Confirm deleting ${label}`}>
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
            await action();
          })
        }
        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-destructive px-3 text-sm font-medium text-white transition-colors hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-destructive/40 disabled:opacity-60"
      >
        {pending && <LoaderCircle className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden />}
        Delete
      </button>
    </div>
  );
}