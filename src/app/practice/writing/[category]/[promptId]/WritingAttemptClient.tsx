'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CircleAlert, Clock, LoaderCircle, PenLine } from 'lucide-react';
import {
  MAX_WRITING_ATTEMPTS,
  WRITING_PARTS,
  countWords,
  type AttemptResult,
  type WritingPart,
} from '@/lib/writing-config';
import { saveDraft, startWritingAttempt, submitWritingAttempt } from './actions';
import EvaluationView from './EvaluationView';

type PromptView = {
  id: string;
  part: WritingPart;
  category: string;
  questionNumber: number;
  prompt: string;
  imageUrl: string | null;
  timerMinutes: number;
};

type Active = { attemptId: string; attemptNumber: number; startTime: number; timerSeconds: number };

const primaryButton =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-70';

function TopBar({ subtitle, title, children }: { subtitle: string; title: string; children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <PenLine className="size-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
            <h1 className="text-sm font-medium leading-tight">{title}</h1>
          </div>
        </div>
        {children && <div className="flex shrink-0 items-center gap-3">{children}</div>}
      </div>
    </header>
  );
}

function PromptPanel({ prompt }: { prompt: PromptView }) {
  return (
    <div>
      <p className="whitespace-pre-wrap text-[0.9375rem] leading-relaxed">{prompt.prompt}</p>
      {prompt.imageUrl && (
        <div className="mt-6 overflow-hidden rounded-xl border bg-card">
          {/* eslint-disable-next-line @next/next/no-img-element -- signed R2 URL, not a static asset */}
          <img src={prompt.imageUrl} alt="Visual for this writing task" className="w-full" />
        </div>
      )}
    </div>
  );
}

export default function WritingAttemptClient({
  categorySlug,
  prompt,
  initialAttempts,
}: {
  categorySlug: string;
  prompt: PromptView;
  initialAttempts: AttemptResult[];
}) {
  const cfg = WRITING_PARTS[prompt.part];
  const title = `${prompt.category} · Question ${prompt.questionNumber}`;

  const [phase, setPhase] = useState<'intro' | 'writing' | 'result'>('intro');
  const [attempts, setAttempts] = useState(initialAttempts);
  const [active, setActive] = useState<Active | null>(null);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [text, setText] = useState('');
  const [dirty, setDirty] = useState(false); // unsaved changes since the last autosave
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const textRef = useRef('');
  const inFlight = useRef(false);
  const autoSubmitted = useRef(false);

  const attemptsLeft = MAX_WRITING_ATTEMPTS - attempts.length;
  const words = countWords(text);

  async function handleStart() {
    setError('');
    setStarting(true);
    try {
      const a = await startWritingAttempt(prompt.id);
      setActive({ attemptId: a.attemptId, attemptNumber: a.attemptNumber, startTime: a.startTime, timerSeconds: a.timerSeconds });
      setText(a.draft);
      textRef.current = a.draft;
      setDirty(false);
      autoSubmitted.current = false;
      setPhase('writing');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the attempt');
    } finally {
      setStarting(false);
    }
  }

  const submit = useCallback(async () => {
    if (!active || inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    setError('');
    try {
      const res = await submitWritingAttempt(active.attemptId, textRef.current);
      setAttempts((prev) => [...prev.filter((a) => a.id !== res.id), res].sort((a, b) => a.attemptNumber - b.attemptNumber));
      setResult(res);
      setPhase('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit. Try again.');
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }, [active]);

  // Countdown from the server start time, so a refresh or resume keeps the real remaining time
  useEffect(() => {
    if (phase !== 'writing' || !active) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((active.startTime + active.timerSeconds * 1000 - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0 && !autoSubmitted.current) {
        autoSubmitted.current = true;
        submit();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [phase, active, submit]);

  // Autosave the draft 4 seconds after the last keystroke
  useEffect(() => {
    if (phase !== 'writing' || !active || !dirty) return;
    const t = setTimeout(async () => {
      try {
        await saveDraft(active.attemptId, textRef.current);
        setDirty(false);
      } catch {
        /* keep dirty so the next change retries */
      }
    }, 4000);
    return () => clearTimeout(t);
  }, [phase, active, dirty, text]);

  /* ───────── Writing ───────── */
  if (phase === 'writing' && active) {
    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;
    const lowTime = secondsLeft <= 60;
    const reachedMin = words >= cfg.minWords;

    return (
      <div className="min-h-svh bg-background text-foreground">
        <TopBar subtitle={title} title={`Attempt ${active.attemptNumber} of ${MAX_WRITING_ATTEMPTS}`}>
          <span
            className={`hidden text-sm tabular-nums sm:block ${reachedMin ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}
          >
            {words} words · aim for {cfg.targetWords}
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
          <button onClick={submit} disabled={submitting} className={`${primaryButton} h-9 px-4`}>
            {submitting ? <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-label="Submitting" /> : 'Submit'}
          </button>
        </TopBar>

        <div className="mx-auto grid max-w-7xl lg:grid-cols-2">
          <section aria-label="Question" className="border-b px-6 py-8 lg:h-[calc(100svh-4rem)] lg:overflow-y-auto lg:border-b-0 lg:border-r lg:px-10">
            <div className="mx-auto max-w-prose">
              <PromptPanel prompt={prompt} />
            </div>
          </section>

          <section aria-label="Your answer" className="flex flex-col px-6 py-8 lg:h-[calc(100svh-4rem)] lg:px-10">
            <label htmlFor="answer" className="sr-only">
              Your answer
            </label>
            <textarea
              id="answer"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                textRef.current = e.target.value;
                setDirty(true);
              }}
              placeholder="Start writing your answer here…"
              spellCheck={false}
              autoFocus
              className="min-h-96 w-full flex-1 resize-none rounded-xl border border-input bg-background p-4 font-serif text-[1.0625rem] leading-8 shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40"
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="tabular-nums sm:hidden">{words} words</span>
              <span>{dirty ? 'Saving…' : 'Draft saved'}</span>
              {error && (
                <span role="alert" className="flex items-center gap-1.5 text-destructive">
                  <CircleAlert className="size-3.5" aria-hidden />
                  {error}
                </span>
              )}
            </div>
          </section>
        </div>
      </div>
    );
  }

  /* ───────── Result (just submitted) ───────── */
  if (phase === 'result' && result) {
    return (
      <div className="min-h-svh bg-background text-foreground">
        <TopBar subtitle={title} title={`Attempt ${result.attemptNumber} feedback`} />
        <main className="mx-auto max-w-3xl px-6 py-10">
          <EvaluationView
            result={result}
            onUpdated={(r) => {
              setResult(r);
              setAttempts((prev) => prev.map((a) => (a.id === r.id ? r : a)));
            }}
          />
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button onClick={() => setPhase('intro')} className={`${primaryButton} h-11 px-5`}>
              {attemptsLeft > 0 ? `Try again (${attemptsLeft} left)` : 'Compare my attempts'}
            </button>
            <Link
              href={`/practice/writing/${categorySlug}`}
              className="inline-flex h-11 items-center justify-center rounded-lg border bg-background px-5 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
            >
              More {prompt.category} questions
            </Link>
          </div>
        </main>
      </div>
    );
  }

  /* ───────── Intro + attempt history ───────── */
  return (
    <div className="min-h-svh bg-background text-foreground">
      <TopBar subtitle={cfg.label} title={title} />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <section className="rounded-2xl border bg-card p-6 text-card-foreground shadow-sm">
          <PromptPanel prompt={prompt} />
        </section>

        <section className="mt-6 rounded-2xl border bg-card p-6 text-card-foreground shadow-sm">
          <h2 className="text-lg font-semibold tracking-tight">
            {attemptsLeft > 0 ? `Attempt ${attempts.length + 1} of ${MAX_WRITING_ATTEMPTS}` : 'No attempts left'}
          </h2>
          <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
            <li>You have {prompt.timerMinutes} minutes. Your answer is submitted automatically when time runs out.</li>
            <li>Write about {cfg.targetWords} (at least {cfg.minWords}).</li>
            <li>Your draft saves as you type. If you leave, you can resume while time remains.</li>
          </ul>
          {error && (
            <p role="alert" className="mt-4 rounded-lg border border-destructive/20 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
              {error}
            </p>
          )}
          {attemptsLeft > 0 && (
            <button onClick={handleStart} disabled={starting} className={`${primaryButton} mt-5 h-11 px-6`}>
              {starting && <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />}
              Start attempt
            </button>
          )}
        </section>

        {attempts.length > 0 && (
          <section className="mt-10" aria-labelledby="history-heading">
            <h2 id="history-heading" className="text-lg font-semibold tracking-tight">
              Your attempts
            </h2>

            <ul className="mt-4 flex flex-wrap gap-3">
              {attempts.map((a) => (
                <li key={a.id} className="min-w-28 rounded-xl border bg-card px-4 py-3 text-card-foreground">
                  <p className="text-xs text-muted-foreground">Attempt {a.attemptNumber}</p>
                  <p className="text-2xl font-bold tabular-nums">
                    {a.evaluation ? a.evaluation.overall.toFixed(1) : '–'}
                  </p>
                </li>
              ))}
            </ul>

            <div className="mt-6 space-y-3">
              {[...attempts].reverse().map((a) => (
                <details key={a.id} className="rounded-xl border bg-card p-5 text-card-foreground">
                  <summary className="cursor-pointer text-sm font-medium">
                    Attempt {a.attemptNumber} feedback
                  </summary>
                  <div className="mt-5">
                    <EvaluationView
                      result={a}
                      onUpdated={(r) => setAttempts((prev) => prev.map((x) => (x.id === r.id ? r : x)))}
                    />
                  </div>
                </details>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}