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
    <div className="min-h-svh bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-6">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ClipboardCheck className="size-5" aria-hidden />
          </div>
          <p className="text-sm font-medium">Mock Test {load.mockNumber}</p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-3xl font-bold tracking-tight">{load.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Read this before you start.</p>

        <ul className="mt-6 space-y-3 rounded-2xl border bg-card p-6 text-sm leading-relaxed text-card-foreground shadow-sm">
          {rules.map((r) => (
            <li key={r} className="flex gap-3">
              <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-foreground" />
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
          className="mt-6 inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-8 text-sm font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {starting && <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />}
          Start Mock Test
        </button>
      </main>
    </div>
  );
}