'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Headphones, LayoutDashboard, Users, type LucideIcon } from 'lucide-react';

const ITEMS: { href: string; label: string; icon: LucideIcon; exact?: boolean }[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/content/reading', label: 'Reading content', icon: BookOpen },
  { href: '/admin/content/listening', label: 'Listening content', icon: Headphones },
  { href: '/admin/students', label: 'Students', icon: Users },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Admin"
      className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:overflow-visible lg:pb-0"
    >
      {ITEMS.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 ${
              active
                ? 'bg-primary font-medium text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}