'use client';

import { useEffect } from 'react';
import { LoaderCircle } from 'lucide-react';

export default function ConfirmDialog({
  title,
  children,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive,
  busy,
  onConfirm,
  onCancel,
}: {
  title: string;
  children: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busy) onCancel();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-md rounded-2xl border bg-card p-6 text-card-foreground shadow-lg"
      >
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <div className="mt-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            autoFocus
            onClick={onCancel}
            disabled={busy}
            className="h-10 rounded-lg border bg-background px-4 text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium text-white transition-colors focus-visible:outline-none focus-visible:ring-[3px] disabled:opacity-60 ${
              destructive
                ? 'bg-destructive hover:bg-destructive/90 focus-visible:ring-destructive/40'
                : 'bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring/50'
            }`}
          >
            {busy && <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}