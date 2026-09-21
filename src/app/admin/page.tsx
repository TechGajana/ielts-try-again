<<<<<<< HEAD
import Link from 'next/link';
import { Activity, ArrowUpRight, BookOpen, Headphones, Users, type LucideIcon } from 'lucide-react';
import type { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import {
  LISTENING_QUESTION_TYPES,
  READING_QUESTION_TYPES,
  TASKS_PER_TYPE,
} from '@/lib/question-types';
import { PageHeader } from '@/components/admin/ui';

function tally(docs: QueryDocumentSnapshot[]) {
  const counts: Record<string, number> = {};
  for (const d of docs) {
    const type = d.get('questionType') as string;
    counts[type] = (counts[type] ?? 0) + 1;
  }
  return counts;
}

function StatCard({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: LucideIcon;
  label: string;
  value?: number;
  href?: string;
}) {
  const inner = (
    <>
      <div className="flex items-start justify-between">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          <Icon className="size-5" aria-hidden />
        </div>
        {href && (
          <ArrowUpRight
            className="size-5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
            aria-hidden
          />
        )}
      </div>
      <div className="mt-6">
        {value !== undefined && <p className="text-3xl font-bold tabular-nums tracking-tight">{value}</p>}
        <p className={`text-sm text-muted-foreground ${value !== undefined ? 'mt-0.5' : 'text-base font-medium text-foreground'}`}>
          {label}
        </p>
      </div>
    </>
  );

  const base = 'group rounded-2xl border bg-card p-5 text-card-foreground shadow-sm';
  return href ? (
    <Link
      href={href}
      className={`${base} transition-[box-shadow,border-color] hover:border-foreground/25 hover:shadow-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50`}
    >
      {inner}
    </Link>
  ) : (
    <div className={base}>{inner}</div>
  );
}

function CoveragePanel({
  title,
  href,
  types,
  counts,
}: {
  title: string;
  href: string;
  types: readonly string[];
  counts: Record<string, number>;
}) {
  const names = [...types, ...Object.keys(counts).filter((n) => !types.includes(n))];
  const total = names.reduce((sum, n) => sum + (counts[n] ?? 0), 0);

  return (
    <section className="rounded-2xl border bg-card p-6 text-card-foreground shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{total} tasks in total</p>
        </div>
        <Link
          href={href}
          className="inline-flex items-center gap-1 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
        >
          Manage
          <ArrowUpRight className="size-4" aria-hidden />
        </Link>
      </div>

      <ul className="mt-5 space-y-3.5">
        {names.map((name) => {
          const n = counts[name] ?? 0;
          const full = n >= TASKS_PER_TYPE;
          return (
            <li key={name}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate">{name}</span>
                <span
                  className={`shrink-0 text-xs tabular-nums ${n === 0 ? 'text-destructive' : 'text-muted-foreground'}`}
                >
                  {n === 0 ? 'No tasks' : `${n} / ${TASKS_PER_TYPE}`}
                </span>
              </div>
              <div
                className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-label={`${name} tasks`}
                aria-valuenow={n}
                aria-valuemin={0}
                aria-valuemax={TASKS_PER_TYPE}
              >
                <div
                  className={`h-full rounded-full ${full ? 'bg-emerald-500' : 'bg-foreground'}`}
                  style={{ width: `${Math.min(100, (n / TASKS_PER_TYPE) * 100)}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default async function AdminHomePage() {
  const [readingSnap, listeningSnap, attemptsCount] = await Promise.all([
    adminDb.collection('readingTasks').select('questionType').get(),
    adminDb.collection('listeningTasks').select('questionType').get(),
    adminDb.collection('attempts').count().get(),
  ]);

  return (
    <>
      <PageHeader
        title="Admin dashboard"
        description="See how much practice content each question type has, and jump in to add more."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={BookOpen} label="Reading tasks" value={readingSnap.size} href="/admin/content/reading" />
        <StatCard icon={Headphones} label="Listening tasks" value={listeningSnap.size} href="/admin/content/listening" />
        <StatCard icon={Activity} label="Attempts so far" value={attemptsCount.data().count} />
        <StatCard icon={Users} label="Students" href="/admin/students" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <CoveragePanel
          title="Reading coverage"
          href="/admin/content/reading"
          types={READING_QUESTION_TYPES}
          counts={tally(readingSnap.docs)}
        />
        <CoveragePanel
          title="Listening coverage"
          href="/admin/content/listening"
          types={LISTENING_QUESTION_TYPES}
          counts={tally(listeningSnap.docs)}
        />
      </div>
    </>
  );
=======
export default function AdminHomePage() {
  return <div className="p-8"><h1 className="text-2xl font-semibold">Admin Dashboard</h1></div>;
>>>>>>> 71d9a4ff2580737881c1d12e6324e871d2954744
}