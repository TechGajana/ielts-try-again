'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CircleAlert, CircleCheck, CircleX, LoaderCircle } from 'lucide-react';
import type { MockResultView, ObjectiveResult, WritingTaskResult } from '@/lib/mock-config';
import { evaluateWritingAction } from '../actions';

type Tab = 'listening' | 'reading' | 'writing';

const REASONS: { submitted: string; timeout: string; left: string } = {
  submitted: 'You submitted this mock test.',
  timeout: 'The time ran out, so this mock test was submitted automatically.',
  left: 'You left this mock test, so it was closed. Your saved answers were marked.',
};

const isUnfinished = (t: WritingTaskResult) => t.status === 'pending' || t.status === 'running';

function ObjectiveReview({ result }: { result: ObjectiveResult }) {
  // Group by part, keeping order
  const groups: { title: string; items: ObjectiveResult['review'] }[] = [];
  for (const item of result.review) {
    const last = groups[groups.length - 1];
    if (last && last.title === item.partTitle) last.items.push(item);
    else groups.push({ title: item.partTitle, items: [item] });
  }

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border bg-card p-6 text-card-foreground shadow-sm">
        <p className="text-sm text-muted-foreground">Raw score</p>
        <p className="mt-1 text-4xl font-bold tabular-nums tracking-tight">
          {result.raw}
          <span className="text-xl font-normal text-muted-foreground"> / {result.total}</span>
        </p>
        <p className="mt-3 text-sm">
          Estimated band:{' '}
          <span className="font-semibold tabular-nums">{result.band === null ? 'Not available' : result.band.toFixed(1)}</span>
        </p>
        {result.total !== 40 && result.total > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            This mock has {result.total} questions, so the band is scaled to a 40-question test.
          </p>
        )}
      </div>

      {groups.map((g) => (
        <section key={g.title}>
          <h3 className="text-base font-semibold tracking-tight">{g.title}</h3>
          <ol className="mt-3 space-y-3">
            {g.items.map((r) => (
              <li key={r.number} className="rounded-xl border bg-card p-5 text-card-foreground">
                <div className="flex gap-3">
                  {r.correct ? (
                    <CircleCheck className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-label="Correct" />
                  ) : (
                    <CircleX className="mt-0.5 size-5 shrink-0 text-destructive" aria-label="Incorrect" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-relaxed">
                      <span className="tabular-nums text-muted-foreground">{r.number}. </span>
                      {r.text}
                    </p>
                    <dl className="mt-3 space-y-1.5 text-sm">
                      <div className="flex gap-2">
                        <dt className="w-28 shrink-0 text-muted-foreground">Your answer</dt>
                        <dd className={r.correct ? 'text-emerald-700 dark:text-emerald-400' : 'text-destructive'}>
                          {r.yourAnswer || '(no answer)'}
                        </dd>
                      </div>
                      {!r.correct && r.correctAnswer && (
                        <div className="flex gap-2">
                          <dt className="w-28 shrink-0 text-muted-foreground">Correct answer</dt>
                          <dd className="font-medium">{r.correctAnswer}</dd>
                        </div>
                      )}
                    </dl>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

function WritingTaskView({ label, task }: { label: string; task: WritingTaskResult }) {
  const ev = task.evaluation;

  return (
    <section className="space-y-5">
      <h3 className="text-lg font-semibold tracking-tight">{label}</h3>

      {isUnfinished(task) && (
        <div className="flex items-center gap-3 rounded-xl border bg-muted/40 p-5 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
          Evaluating this task. This can take up to a minute.
        </div>
      )}

      {task.status === 'failed' && (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-800 dark:text-amber-400">
          Feedback for this task isn&apos;t available yet. Your answer is saved. Use &ldquo;Retry evaluation&rdquo;
          above to try again.
        </p>
      )}

      {ev && (
        <>
          <p className="text-sm">
            Estimated band: <span className="text-xl font-bold tabular-nums">{ev.overall.toFixed(1)}</span>
            <span className="ml-3 text-xs text-muted-foreground">{task.wordCount} words</span>
          </p>

          <ul className="space-y-3">
            {ev.criteria.map((c) => (
              <li key={c.key} className="rounded-xl border bg-card p-5 text-card-foreground">
                <div className="flex items-baseline justify-between gap-4">
                  <p className="text-sm font-medium">{c.label}</p>
                  <p className="text-lg font-bold tabular-nums">{c.band.toFixed(1)}</p>
                </div>
                <div
                  className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-label={c.label}
                  aria-valuenow={c.band}
                  aria-valuemin={0}
                  aria-valuemax={9}
                >
                  <div className="h-full rounded-full bg-foreground" style={{ width: `${(c.band / 9) * 100}%` }} />
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{c.comment}</p>
              </li>
            ))}
          </ul>

          <div>
            <h4 className="text-sm font-semibold">How to improve</h4>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
              {ev.improvements.map((tip, i) => (
                <li key={i}>{tip}</li>
              ))}
            </ul>
          </div>

          {ev.improvedAnswer && (
            <details className="rounded-xl border bg-card p-5 text-card-foreground">
              <summary className="cursor-pointer text-sm font-medium">Improved version of your answer</summary>
              <p className="mt-4 whitespace-pre-wrap font-serif text-[1.0625rem] leading-8">{ev.improvedAnswer}</p>
            </details>
          )}
        </>
      )}

      <details className="rounded-xl border bg-card p-5 text-card-foreground">
        <summary className="cursor-pointer text-sm font-medium">Your submitted answer</summary>
        <p className="mt-4 whitespace-pre-wrap font-serif text-[1.0625rem] leading-8">
          {task.response || '(no response)'}
        </p>
      </details>
    </section>
  );
}

export default function MockResults({ mockId, initial }: { mockId: string; initial: MockResultView }) {
  const [view, setView] = useState(initial);
  const [tab, setTab] = useState<Tab>('listening');
  const [evalError, setEvalError] = useState('');
  const [retrying, setRetrying] = useState(false);
  const inFlight = useRef(false);

  const { task1, task2 } = view.writing;
  const unfinished = isUnfinished(task1) || isUnfinished(task2);
  const failed = task1.status === 'failed' || task2.status === 'failed';

  async function runEvaluation() {
    if (inFlight.current) return;
    inFlight.current = true;
    setEvalError('');
    try {
      const res = await evaluateWritingAction(mockId);
      if (!res.ok) throw new Error(res.error);
      setView(res.view);
    } catch (err) {
      setEvalError(err instanceof Error ? err.message : 'Could not evaluate your writing.');
    } finally {
      inFlight.current = false;
      setRetrying(false);
    }
  }

  // Evaluate on arrival, then check again every few seconds while anything is still running
  useEffect(() => {
    if (!unfinished || evalError) return;
    void runEvaluation();
    const id = setInterval(() => void runEvaluation(), 8000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unfinished, evalError]);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'listening', label: 'Listening' },
    { key: 'reading', label: 'Reading' },
    { key: 'writing', label: 'Writing' },
  ];

  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
          <p className="text-sm font-medium">Mock Test {view.mockNumber} results</p>
          <Link
            href="/mock-tests"
            className="rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
          >
            All mock tests
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-3xl font-bold tracking-tight">{view.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{REASONS[view.closeReason]}</p>

        <ul className="mt-8 grid gap-4 sm:grid-cols-3">
          <li className="rounded-2xl border bg-card p-5 text-card-foreground shadow-sm">
            <p className="text-sm text-muted-foreground">Listening</p>
            <p className="mt-1 text-3xl font-bold tabular-nums">
              {view.listening.band === null ? '–' : view.listening.band.toFixed(1)}
            </p>
            <p className="mt-1 text-xs tabular-nums text-muted-foreground">
              {view.listening.raw} / {view.listening.total} correct
            </p>
          </li>
          <li className="rounded-2xl border bg-card p-5 text-card-foreground shadow-sm">
            <p className="text-sm text-muted-foreground">Reading</p>
            <p className="mt-1 text-3xl font-bold tabular-nums">
              {view.reading.band === null ? '–' : view.reading.band.toFixed(1)}
            </p>
            <p className="mt-1 text-xs tabular-nums text-muted-foreground">
              {view.reading.raw} / {view.reading.total} correct
            </p>
          </li>
          <li className="rounded-2xl border bg-card p-5 text-card-foreground shadow-sm">
            <p className="text-sm text-muted-foreground">Writing</p>
            <p className="mt-1 text-3xl font-bold tabular-nums">
              {view.writing.band === null ? '–' : view.writing.band.toFixed(1)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {view.writing.band === null ? (failed ? 'Feedback not ready' : 'Evaluating…') : 'Estimated band'}
            </p>
          </li>
        </ul>

        <div role="tablist" className="mt-10 flex border-b">
          {tabs.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`h-11 border-b-2 px-5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/40 ${
                tab === t.key
                  ? 'border-primary font-medium'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-8">
          {tab === 'listening' && <ObjectiveReview result={view.listening} />}
          {tab === 'reading' && <ObjectiveReview result={view.reading} />}

          {tab === 'writing' && (
            <div className="space-y-10">
              <div className="rounded-2xl border bg-card p-6 text-card-foreground shadow-sm">
                <dl className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <dt className="text-sm text-muted-foreground">Task 1 estimated band</dt>
                    <dd className="mt-1 text-2xl font-bold tabular-nums">
                      {task1.evaluation ? task1.evaluation.overall.toFixed(1) : '–'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Task 2 estimated band</dt>
                    <dd className="mt-1 text-2xl font-bold tabular-nums">
                      {task2.evaluation ? task2.evaluation.overall.toFixed(1) : '–'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Writing estimated band</dt>
                    <dd className="mt-1 text-2xl font-bold tabular-nums">
                      {view.writing.band === null ? '–' : view.writing.band.toFixed(1)}
                    </dd>
                  </div>
                </dl>
                <p className="mt-4 text-xs text-muted-foreground">
                  Task 2 counts twice as much as Task 1 in the Writing band.
                </p>
              </div>

              {(failed || evalError) && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-amber-800 dark:text-amber-400">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <CircleAlert className="size-4" aria-hidden />
                    AI feedback is temporarily unavailable
                  </p>
                  <p className="mt-1 text-sm">Your answers are saved. Retry to get your feedback.</p>
                  {evalError && (
                    <p role="alert" className="mt-2 text-sm">
                      {evalError}
                    </p>
                  )}
                  <button
                    onClick={() => {
                      setRetrying(true);
                      setEvalError('');
                      void runEvaluation();
                    }}
                    disabled={retrying}
                    className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
                  >
                    {retrying && <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />}
                    Retry evaluation
                  </button>
                </div>
              )}

              <WritingTaskView label="Task 1" task={task1} />
              <WritingTaskView label="Task 2" task={task2} />

              <p className="text-xs leading-relaxed text-muted-foreground">
                These are AI-generated estimates to guide your practice, not official IELTS scores.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}