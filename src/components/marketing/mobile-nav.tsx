'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

export default function MobileNav({ links }: { links: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? 'Close menu' : 'Open menu'}
        className="flex size-10 items-center justify-center text-[#1C2B39]"
      >
        {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
      </button>

      {open && (
        <div className="absolute inset-x-0 top-16 border-b border-[#DCD4C0] bg-[#F7F4EC] px-6 py-6">
          <nav aria-label="Mobile" className="flex flex-col gap-4">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="text-base text-[#1C2B39]"
              >
                {l.label}
              </a>
            ))}
            <Link href="/login" onClick={() => setOpen(false)} className="text-base text-[#1C2B39]">
              Log in
            </Link>
            <a
              href="#pricing"
              onClick={() => setOpen(false)}
              className="mt-2 inline-flex h-11 items-center justify-center rounded-sm bg-[#1C2B39] px-6 text-sm font-medium text-[#F7F4EC]"
            >
              Get started
            </a>
          </nav>
        </div>
      )}
    </div>
  );
}