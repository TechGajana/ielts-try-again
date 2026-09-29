'use client';

import { useState, useTransition } from 'react';
import { CircleAlert, LoaderCircle } from 'lucide-react';
import type { SpeakingResult } from '@/lib/speaking-config';
import { retrySpeakingEvaluation } from './actions';

export default function SpeakingEvaluationView({
  result,
  onUpdated,
}: {
  result: SpeakingResult;
  onUpdated?: (r: SpeakingResult) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');

  function retry() {
    setError('');
    startTransition(async () => {
      try {
        onUpdated?.(await retrySpeakingEvaluation(result.id));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not evaluate. Try again in a moment.');
      }
    });
  }

  const recording = result.audioUrl && (
    <div className="rounded-xl border bg-card p-5 text-card-foreground">
      <p className="text-sm font-medium">Your recording</p>
      <audio controls src={result.audioUrl} className="mt-3 w-full" preload="none" />
    </div>
  );

  if (result.status !== 'done' || !result.evaluation) {
    return (
      <div className="space-y-4">
        {recording}
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-amber-800 dark:text-amber-400">
          <p className="flex items-center gap-2 font-medium">
            <CircleAlert className="size-4" aria-hidden />
            Your recording was saved, but the feedback isn&apos;t ready yet
          </p>
          <p className="mt-1 text-sm">
            AI feedback is temporarily unavailable. This attempt still counts. Retry to get your feedback.
          </p>
          {error && (
            <p role="alert" className="mt-2 text-sm">
              {error}
            </p>
          )}
          <button
            onClick={retry}
            disabled={pending}
            className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {pending && <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />}
            Retry evaluation
          </button>
        </div>
      </div>
    );
  }

  const ev = result.evaluation;

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-2xl bg-primary p-8 text-primary-foreground sm:p-10">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-primary-foreground/10 blur-3xl" />
        <div className="relative">
          <p className="text-sm text-primary-foreground/70">Estimated overall band</p>
          <p className="mt-1 text-6xl font-bold tabular-nums tracking-tight">{ev.overall.toFixed(1)}</p>
          <p className="mt-3 text-sm text-primary-foreground/70">
            Attempt {result.attemptNumber} · {result.durationSeconds} seconds
          </p>
        </div>
      </section>

      {recording}

      <section aria-labelledby={`criteria-${result.id}`}>
        <h3 id={`criteria-${result.id}`} className="text-lg font-semibold tracking-tight">
          Band by criterion
        </h3>
        <ul className="mt-4 space-y-4">
          {ev.criteria.map((c) => (
            <li key={c.key} className="rounded-xl border bg-card p-5 text-card-foreground">
              <div className="flex items-baseline justify-between gap-4">
                <p className="text-sm font-medium">{c.label}</p>
                <p className="text-xl font-bold tabular-nums">{c.band.toFixed(1)}</p>
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
      </section>

      <section>
        <h3 className="text-lg font-semibold tracking-tight">How to improve</h3>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed">
          {ev.improvements.map((tip, i) => (
            <li key={i}>{tip}</li>
          ))}
        </ul>
      </section>

      <div className="space-y-3">
        <details className="rounded-xl border bg-card p-5 text-card-foreground">
          <summary className="cursor-pointer text-sm font-medium">What you said (transcript)</summary>
          <p className="mt-4 whitespace-pre-wrap font-serif text-[1.0625rem] leading-8">
            {result.transcript || '(no speech detected)'}
          </p>
        </details>
        {ev.improvedAnswer && (
          <details className="rounded-xl border bg-card p-5 text-card-foreground">
            <summary className="cursor-pointer text-sm font-medium">Improved version of your answer</summary>
            <p className="mt-4 whitespace-pre-wrap font-serif text-[1.0625rem] leading-8">{ev.improvedAnswer}</p>
          </details>
        )}
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        This is an AI-generated estimate to guide your practice, not an official IELTS score. The transcript is
        produced automatically and may contain mistakes. The pronunciation band is estimated from that transcript,
        not from listening to your voice, so treat it as a rough guide.
      </p>
    </div>
  );
}