'use client';

import { useState } from 'react';
import { CircleAlert, ClipboardCheck, LoaderCircle } from 'lucide-react';
import { SECTION_MINUTES, type MockLoad, type RunnerState } from '@/lib/mock-config';
import { startMockAction } from './actions';
import MockRunner from './MockRunner';

export default function MockClient({
  mockId,
  load,
}: {
  mockId: string;
  load: Extract<MockLoad, { kind: 'not_started' } | { kind: 'active' }>;
}) {
  const [state, setState] = useState<RunnerState | null>(load.kind === 'active' ? load.state : null);
  const [agreed, setAgreed] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  async function handleStart() {
    setError('');
    setStarting(true);
    const res = await startMockAction(mockId);
    if (res.ok) {
      setState(res.state);
    } else {
      setError(res.error);
      setStarting(false);
    }
  }

  if (state) return <MockRunner mockId={mockId} initial={state} />;
  if (load.kind !== 'not_started') return null;

  const rules = [
    `Listening (${SECTION_MINUTES.listening} minutes), then Reading (${SECTION_MINUTES.reading} minutes), then Writing (${SECTION_MINUTES.writing} minutes). Task 1 should take about 20 minutes and Task 2 about 40.`,
    'You can attempt this mock test only once. The clock cannot be paused.',
    'Each listening recording plays once, automatically. It cannot be paused or replayed.',
    'Once you move to the next section, you cannot go back.',
    'If you leave the test, it closes and cannot be restarted. Your saved answers are kept and marked.',
    'Your answers are saved automatically every few seconds. Speaking is not part of the mock test.',
  ];

  return (
    <div className="min-h-svh bg-[#f6f7f4] text-foreground">
      <header className="border-b border-black/[0.06] bg-white/85 shadow-[0_1px_0_rgba(18,38,31,0.02)] backdrop-blur-xl">
        <div className="mx-auto flex h-[4.25rem] max-w-3xl items-center gap-3 px-4 sm:px-6">
          <div className="flex size-9 items-center justify-center rounded-xl bg-[#183b30] text-white shadow-sm">
            <ClipboardCheck className="size-5" aria-hidden />
          </div>
          <p className="text-sm font-semibold">IELTS <span className="text-[#68877a]">STUDIO</span></p>
          <span className="ml-auto rounded-full bg-[#edf3ef] px-3 py-1 text-xs font-medium text-[#285442]">Mock {load.mockNumber}</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <section className="relative overflow-hidden rounded-[1.75rem] bg-[#183b30] p-7 text-white shadow-[0_22px_60px_rgba(24,59,48,0.16)] sm:p-10">
          <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 size-80 rounded-full bg-[#a9c6a6]/20 blur-3xl" />
          <div className="relative">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#b9cfbd]">Before you begin · full exam</p>
            <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">{load.title}</h1>
            <p className="mt-3 text-sm text-white/70">Take a moment to prepare your space and read the exam rules.</p>
          </div>
        </section>

        <ul className="mt-6 space-y-3 rounded-2xl border border-black/[0.07] bg-white p-6 text-sm leading-relaxed text-card-foreground shadow-[0_8px_24px_rgba(25,43,35,0.045)]">
          {rules.map((r) => (
            <li key={r} className="flex gap-3">
              <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-[#547d63]" />
              {r}
            </li>
          ))}
        </ul>

        <p className="mt-4 text-sm text-muted-foreground">
          Use headphones, sit somewhere quiet, and keep this tab open for the whole test.
        </p>

        <label className="mt-6 flex cursor-pointer items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 size-4 rounded border-input accent-primary"
          />
          I understand this mock test can only be attempted once and I cannot restart it.
        </label>

        {error && (
          <p
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive"
          >
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            {error}
          </p>
        )}

        <button
          onClick={handleStart}
          disabled={!agreed || starting}
          className="mt-6 inline-flex h-12 items-center gap-2 rounded-xl bg-[#183b30] px-8 text-sm font-semibold text-white shadow-sm transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-[#244d3d] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {starting && <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />}
          Start Mock Test
        </button>
      </main>
    </div>
  );
}