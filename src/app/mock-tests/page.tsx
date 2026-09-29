import Link from 'next/link';
import { BookOpen, CircleCheck, Clock, Headphones, PenLine } from 'lucide-react';
import { PracticeShell } from '@/components/practice/practice-shell';
import { getSessionStudentId, listMocks } from '@/lib/mock';
import { SECTION_MINUTES, TOTAL_MOCKS, type MockListItem } from '@/lib/mock-config';

const totalMinutes = SECTION_MINUTES.listening + SECTION_MINUTES.reading + SECTION_MINUTES.writing;

export default async function MockListPage() {
  const studentId = await getSessionStudentId();
  const mocks = await listMocks(studentId);

  const byNumber: { [n: number]: MockListItem } = {};
  for (const m of mocks) byNumber[m.mockNumber] = m;
  const slots = Array.from({ length: TOTAL_MOCKS }, (_, i) => i + 1);

  const sections = [
    { icon: Headphones, name: 'Listening', minutes: SECTION_MINUTES.listening },
    { icon: BookOpen, name: 'Reading', minutes: SECTION_MINUTES.reading },
    { icon: PenLine, name: 'Writing', minutes: SECTION_MINUTES.writing },
  ];

  return (
    <PracticeShell crumbs={[{ label: 'Mock tests' }]}>
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Full-length mock tests</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
          Sit a full IELTS-style test in one go: Listening, then Reading, then Writing. Each mock can be attempted
          only once, and there is no pause once you begin. Speaking is not part of the mock test.
        </p>
      </div>

      <ul className="mt-8 grid gap-3 sm:grid-cols-3">
        {sections.map(({ icon: Icon, name, minutes }) => (
          <li key={name} className="flex items-center gap-3 rounded-xl border bg-card p-4 text-card-foreground">
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="size-5" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-medium">{name}</p>
              <p className="text-xs text-muted-foreground">{minutes} minutes</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="size-3.5" aria-hidden />
        About {totalMinutes} minutes in total
      </p>

      <ul className="mt-8 divide-y overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-sm">
        {slots.map((n) => {
          const m = byNumber[n];

          if (!m) {
            return (
              <li key={n} className="flex items-center gap-4 px-5 py-4 text-muted-foreground">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium tabular-nums">
                  {n}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium">Mock Test {n}</p>
                  <p className="text-xs">Coming soon</p>
                </div>
              </li>
            );
          }

          return (
            <li key={m.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium tabular-nums">
                {m.mockNumber}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold leading-snug">{m.title}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  {m.state === 'completed' && (
                    <>
                      <CircleCheck className="size-3.5 text-emerald-500" aria-hidden />
                      Completed
                    </>
                  )}
                  {m.state === 'in_progress' && 'In progress'}
                  {m.state === 'not_started' && 'Not started'}
                </p>
              </div>

              {m.state === 'completed' ? (
                <Link
                  href={`/mock-tests/${m.id}/results`}
                  className="inline-flex h-10 items-center rounded-lg border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
                >
                  View Results
                </Link>
              ) : (
                <Link
                  href={`/mock-tests/${m.id}`}
                  className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  {m.state === 'in_progress' ? 'Continue' : 'Start Mock Test'}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </PracticeShell>
  );
}