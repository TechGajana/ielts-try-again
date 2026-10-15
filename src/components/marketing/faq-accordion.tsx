'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function FaqAccordion({ items }: { items: { q: string; a: string }[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="divide-y divide-[#DCD4C0] border-t border-[#DCD4C0]">
      {items.map((item, i) => {
        const open = openIndex === i;
        return (
          <div key={item.q}>
            <button
              type="button"
              onClick={() => setOpenIndex(open ? null : i)}
              aria-expanded={open}
              className="flex w-full items-center justify-between gap-4 py-5 text-left"
            >
              <span className="font-medium">{item.q}</span>
              <ChevronDown
                className={`size-4 shrink-0 text-[#4B5B6B] transition-transform ${open ? 'rotate-180' : ''}`}
                aria-hidden
              />
            </button>
            {open && <p className="max-w-xl pb-5 text-sm leading-relaxed text-[#4B5B6B]">{item.a}</p>}
          </div>
        );
      })}
    </div>
  );
}