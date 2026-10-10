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
      <section className="relative overflow-hidden rounded-[1.75rem] bg-[#183b30] p-7 text-white shadow-[0_22px_60px_rgba(24,59,48,0.16)] sm:p-10">
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 size-80 rounded-full bg-[#a9c6a6]/20 blur-3xl" />
        <div className="relative max-w-2xl">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#b9cfbd]">Exam simulation</p>
          <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">Full-length mock tests</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/70 sm:text-base">
            Build confidence with a complete IELTS-style exam. Move through Listening, Reading and Writing in one focused sitting.
          </p>
        </div>
      </section>

      <ul className="mt-6 grid gap-3 sm:grid-cols-3">
        {sections.map(({ icon: Icon, name, minutes }) => (
          <li key={name} className="flex items-center gap-3 rounded-2xl border border-black/[0.07] bg-white p-4 text-card-foreground shadow-[0_4px_18px_rgba(25,43,35,0.035)]">
            <span className="flex size-10 items-center justify-center rounded-xl bg-[#edf3ef] text-[#285442]">
              <Icon className="size-5" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-medium">{name}</p>
              <p className="text-xs text-muted-foreground">{minutes} minutes</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-[#66766d]">
        <Clock className="size-3.5" aria-hidden />
        About {totalMinutes} minutes in total
      </p>

      <ul className="mt-8 divide-y divide-black/[0.05] overflow-hidden rounded-2xl border border-black/[0.07] bg-white text-card-foreground shadow-[0_8px_24px_rgba(25,43,35,0.045)]">
        {slots.map((n) => {
          const m = byNumber[n];

          if (!m) {
            return (
              <li key={n} className="flex items-center gap-4 px-5 py-4 text-muted-foreground">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#f0f3f0] text-sm font-semibold tabular-nums">
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
            <li key={m.id} className="flex flex-wrap items-center gap-4 px-5 py-4 transition-colors hover:bg-[#fbfcfa] sm:px-6">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#edf3ef] text-sm font-semibold text-[#285442] tabular-nums">
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
                  className="inline-flex h-10 items-center rounded-xl border border-black/[0.08] bg-white px-4 text-sm font-semibold transition-colors hover:bg-[#f2f6f2] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
                >
                  View Results
                </Link>
              ) : (
                <Link
                  href={`/mock-tests/${m.id}`}
                  className="inline-flex h-10 items-center rounded-xl bg-[#183b30] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#244d3d] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
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