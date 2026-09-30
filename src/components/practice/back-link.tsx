import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-full bg-muted/60 py-1 pl-1 pr-3.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
    >
      <span className="flex size-7 items-center justify-center rounded-full bg-background shadow-xs">
        <ChevronLeft className="size-4" aria-hidden />
      </span>
      {label}
    </Link>
  );
}