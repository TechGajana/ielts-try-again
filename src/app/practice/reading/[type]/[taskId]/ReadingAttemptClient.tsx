'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, CircleCheck, CircleX, Clock, LoaderCircle } from 'lucide-react';
import { startAttempt, submitAttempt } from './actions';

const primaryButton =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-70';

const inputClass =
  'mt-3 h-11 w-full rounded-lg border border-input bg-background px-3 text-base md:text-sm text-foreground ' +
  'placeholder:text-muted-foreground/70 shadow-xs outline-none transition-[color,box-shadow,border-color] ' +
  'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40';

function TopBar({ questionType, title, children }: { questionType: string; title: string; children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BookOpen className="size-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs text-muted-foreground">{questionType}</p>
            <h1 className="text-sm font-medium leading-tight">{title}</h1>
          </div>
        </div>
        {children && <div className="flex shrink-0 items-center gap-3">{children}</div>}
      </div>
    </header>
  );
}

export default function ReadingAttemptClient({ task, questionType }: { task: any; questionType: string }) {
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<{ score: number; total: number } | null>(null);
  const [submitting, setSubmitting] = useState(false); // UI only: spinner on the submit buttons
  const inFlight = useRef(false); // guards against double submits (button click + timer)
  const router = useRouter();

  useEffect(() => {
    startAttempt(task.id, questionType).then(({ attemptId, startTime }) => {
      setAttemptId(attemptId);
      const elapsed = (Date.now() - new Date(startTime).getTime()) / 1000;
      const remaining = Math.max(0, task.timerMinutes * 60 - elapsed);
      setSecondsLeft(Math.floor(remaining));
    });
  }, [task.id, questionType]);

  const handleSubmit = useCallback(async () => {
    if (!attemptId || submitted || inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    try {
      const result = await submitAttempt(attemptId, task.id, answers);
      setSubmitted(result);
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }, [attemptId, answers, task.id, submitted]);

  useEffect(() => {
    if (secondsLeft === null || submitted) return;
    if (secondsLeft <= 0) {
      handleSubmit();
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => (s ?? 1) - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft, submitted, handleSubmit]);

  /* ───────── Loading ───────── */
  if (secondsLeft === null) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-3 bg-background text-muted-foreground">
        <LoaderCircle className="size-6 animate-spin motion-reduce:animate-none" aria-hidden />
        <p className="text-sm">Preparing your task…</p>
      </div>
    );
  }

  /* ───────── Results ───────── */
  if (submitted) {
    const percent = submitted.total ? Math.round((submitted.score / submitted.total) * 100) : 0;

    return (
      <div className="min-h-svh bg-background text-foreground">
        <TopBar questionType={questionType} title={`Task ${task.taskNumber} results`} />

        <main className="mx-auto max-w-3xl px-6 py-10">
          <section className="relative overflow-hidden rounded-2xl bg-primary p-8 text-primary-foreground sm:p-10">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-primary-foreground/10 blur-3xl"
            />
            <div className="relative">
              <h2 className="font-serif text-3xl leading-tight tracking-tight text-balance sm:text-4xl">
                You scored {submitted.score} out of {submitted.total}
              </h2>
              <div
                className="mt-6 h-1.5 overflow-hidden rounded-full bg-primary-foreground/20"
                role="progressbar"
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Score"
              >
                <div className="h-full rounded-full bg-primary-foreground" style={{ width: `${percent}%` }} />
              </div>
              <p className="mt-3 text-sm text-primary-foreground/70">{percent}% correct</p>
            </div>
          </section>

          <section className="mt-10" aria-labelledby="review-heading">
            <h2 id="review-heading" className="font-serif text-2xl tracking-tight">
              Review your answers
            </h2>

            <ol className="mt-5 space-y-3">
              {task.questions.map((q: any, i: number) => {
                const isCorrect = answers[q.id] === task.correctAnswers[q.id];
                return (
                  <li key={q.id} className="rounded-xl border bg-card p-5 text-card-foreground">
                    <div className="flex gap-3">
                      {isCorrect ? (
                        <CircleCheck className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-label="Correct" />
                      ) : (
                        <CircleX className="mt-0.5 size-5 shrink-0 text-destructive" aria-label="Incorrect" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-relaxed">
                          <span className="tabular-nums text-muted-foreground">{i + 1}. </span>
                          {q.text}
                        </p>
                        <dl className="mt-3 space-y-1.5 text-sm">
                          <div className="flex gap-2">
                            <dt className="w-28 shrink-0 text-muted-foreground">Your answer</dt>
                            <dd
                              className={
                                isCorrect ? 'text-emerald-700 dark:text-emerald-400' : 'text-destructive'
                              }
                            >
                              {answers[q.id] || '(no answer)'}
                            </dd>
                          </div>
                          {!isCorrect && (
                            <div className="flex gap-2">
                              <dt className="w-28 shrink-0 text-muted-foreground">Correct answer</dt>
                              <dd className="font-medium">{task.correctAnswers[q.id]}</dd>
                            </div>
                          )}
                        </dl>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button onClick={() => router.push('/practice/reading')} className={`${primaryButton} h-11 px-5`}>
              Back to Reading
            </button>
            <Link
              href={`/practice/reading/${encodeURIComponent(questionType)}`}
              className="inline-flex h-11 items-center justify-center rounded-lg border bg-background px-5 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
            >
              More {questionType} tasks
            </Link>
          </div>
        </main>
      </div>
    );
  }

  /* ───────── Attempt ───────── */
  const total = task.questions.length;
  const answeredCount = task.questions.filter((q: any) => answers[q.id]?.trim()).length;
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const lowTime = secondsLeft <= 60;

  return (
    <div className="min-h-svh bg-background text-foreground">
      <TopBar questionType={questionType} title={`Task ${task.taskNumber}`}>
        <span className="hidden text-sm tabular-nums text-muted-foreground sm:block">
          {answeredCount} of {total} answered
        </span>
        <div
          role="timer"
          aria-label="Time remaining"
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-sm tabular-nums transition-colors ${
            lowTime ? 'bg-destructive/10 text-destructive' : 'bg-muted text-foreground'
          }`}
        >
          <Clock className="size-4" aria-hidden />
          {mins}:{secs.toString().padStart(2, '0')}
        </div>
        <button onClick={handleSubmit} disabled={submitting} className={`${primaryButton} h-9 px-4`}>
          {submitting ? (
            <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-label="Submitting" />
          ) : (
            'Submit'
          )}
        </button>
      </TopBar>

      <div className="mx-auto grid max-w-7xl lg:grid-cols-2">
        {/* Passage */}
        <section
          aria-label="Reading passage"
          className="border-b px-6 py-8 lg:h-[calc(100svh-4rem)] lg:overflow-y-auto lg:border-b-0 lg:border-r lg:px-10"
        >
          <div className="mx-auto max-w-prose whitespace-pre-wrap font-serif text-[1.0625rem] leading-8">
            {task.passage}
          </div>
        </section>

        {/* Questions */}
        <section
          aria-label="Questions"
          className="px-6 py-8 lg:h-[calc(100svh-4rem)] lg:overflow-y-auto lg:px-10"
        >
          <div className="mx-auto max-w-xl">
            {task.instructions && (
              <p className="rounded-lg bg-muted/60 p-4 text-sm leading-relaxed text-muted-foreground">
                {task.instructions}
              </p>
            )}

            <ol className="mt-8 space-y-8">
              {task.questions.map((q: any, i: number) => {
                const isAnswered = !!answers[q.id]?.trim();
                return (
                  <li key={q.id} className="flex gap-3">
                    <span
                      className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-medium tabular-nums transition-colors ${
                        isAnswered ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {i + 1}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p id={`label-${q.id}`} className="text-[0.9375rem] leading-relaxed">
                        {q.text}
                      </p>

                      {q.options ? (
                        <div role="radiogroup" aria-labelledby={`label-${q.id}`} className="mt-3 space-y-2">
                          {q.options.map((opt: string) => (
                            <label
                              key={opt}
                              className="flex cursor-pointer items-start gap-3 rounded-lg border bg-card px-3.5 py-3 text-sm transition-colors hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/40"
                            >
                              <input
                                type="radio"
                                name={q.id}
                                value={opt}
                                checked={answers[q.id] === opt}
                                onChange={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                                className="peer sr-only"
                              />
                              <span
                                aria-hidden
                                className="mt-0.5 size-4 shrink-0 rounded-full border border-input bg-background transition-[border-width,border-color] peer-checked:border-[5px] peer-checked:border-primary"
                              />
                              <span className="leading-snug">{opt}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <input
                          aria-labelledby={`label-${q.id}`}
                          className={inputClass}
                          placeholder="Type your answer"
                          autoComplete="off"
                          value={answers[q.id] || ''}
                          onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                        />
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>

            <div className="mt-10 flex flex-col gap-4 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm tabular-nums text-muted-foreground">
                {answeredCount} of {total} answered
              </p>
              <button onClick={handleSubmit} disabled={submitting} className={`${primaryButton} h-11 px-6`}>
                {submitting ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
                    Submitting…
                  </>
                ) : (
                  'Submit answers'
                )}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}