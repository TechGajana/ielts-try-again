'use client';

import type { ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { LoaderCircle } from 'lucide-react';

export default function SubmitButton({
  children,
  pendingLabel,
  disabled,
}: {
  children: ReactNode;
  pendingLabel: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (
        <>
          <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}