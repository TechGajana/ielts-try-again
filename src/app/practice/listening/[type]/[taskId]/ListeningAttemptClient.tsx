'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  CircleCheck,
  CircleX,
  Clock,
  Headphones,
  LoaderCircle,
  Volume2,
} from 'lucide-react';
import { BackLink } from '@/components/practice/back-link';
import type { ListeningQuestion } from '@/lib/listening-content';
import type { AutoScoredAttemptResult } from '@/lib/attempts';
import { startAttempt, submitAttempt } from './actions';

const MAX_ATTEMPTS = 3;

const primaryButton =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-70';

const inputClass =
  'mt-3 h-11 w-full rounded-lg border border-input bg-background px-3 text-base md:text-sm text-foreground ' +
  'placeholder:text-muted-foreground/70 shadow-xs outline-none transition-[color,box-shadow,border-color] ' +
  'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40';

// How long students get to review/transfer answers after the audio ends, in seconds.
// Real IELTS listening gives about 1–2 minutes for this; adjust to taste.
const TRANSFER_SECONDS = 120;

type AudioPhase = 'loading' | 'ready' | 'playing' | 'transfer';
type AttemptQuestion = Omit<ListeningQuestion, 'alternativeAnswers' | 'explanation' | 'mapLabel'> & {
  mapLabel?: { x?: number; y?: number };
};

type AttemptTask = {
  id: string;
  taskNumber: number;
  title: string;
  section: string;
  timerMinutes: number;
  instructions: string;
  questions: AttemptQuestion[];
  mapImageUrl: string;
  transcript: string;
};

function normalizeAnswer(value: string) {
  const normalized = value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed) && parsed.every((answer) => typeof answer === 'string')) {
      return parsed.map((answer: string) => answer.trim().replace(/\s+/g, ' ').toLocaleLowerCase()).sort().join('\u001f');
    }
  } catch {
    return normalized;
  }
  return normalized;
}

function answerForDisplay(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed) && parsed.every((answer) => typeof answer === 'string')) return parsed.join(', ');
  } catch {
    return value;
  }
  return value;
}

function answerArray(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((answer): answer is string => typeof answer === 'string') : [];
  } catch {
    return [];
  }
}

function TopBar({ questionType, title, children }: { questionType: string; title: string; children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Headphones className="size-5" aria-hidden />
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

function ListeningResultFeedback({
  task,
  result,
}: {
  task: AttemptTask;
  result: AutoScoredAttemptResult;
}) {
  const percent = result.total ? Math.round((result.score / result.total) * 100) : 0;

  return (
    <>
      <section className="relative overflow-hidden rounded-2xl bg-primary p-8 text-primary-foreground sm:p-10">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-primary-foreground/10 blur-3xl"
        />
        <div className="relative">
          <h2 className="font-serif text-3xl leading-tight tracking-tight text-balance sm:text-4xl">
            You scored {result.score} out of {result.total}
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

      <section className="mt-10" aria-label={`Attempt ${result.attemptNumber} answer review`}>
        <h2 className="font-serif text-2xl tracking-tight">Review your answers</h2>
        <ol className="mt-5 space-y-3">
          {task.questions.map((question, index) => {
            const accepted = result.acceptedAnswers[question.id] ?? [result.correctAnswers[question.id] ?? ''];
            const answer = result.answers[question.id] ?? '';
            const isCorrect = accepted.map(normalizeAnswer).includes(normalizeAnswer(answer));

            return (
              <li key={question.id} className="rounded-xl border bg-card p-5 text-card-foreground">
                <div className="flex gap-3">
                  {isCorrect ? (
                    <CircleCheck className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-label="Correct" />
                  ) : (
                    <CircleX className="mt-0.5 size-5 shrink-0 text-destructive" aria-label="Incorrect" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-relaxed">
                      <span className="tabular-nums text-muted-foreground">{index + 1}. </span>
                      {question.text}
                    </p>
                    <dl className="mt-3 space-y-1.5 text-sm">
                      <div className="flex gap-2">
                        <dt className="w-28 shrink-0 text-muted-foreground">Your answer</dt>
                        <dd className={isCorrect ? 'text-emerald-700 dark:text-emerald-400' : 'text-destructive'}>
                          {answer ? answerForDisplay(answer) : '(no answer)'}
                        </dd>
                      </div>
                      {!isCorrect && (
                        <div className="flex gap-2">
                          <dt className="w-28 shrink-0 text-muted-foreground">Correct answer</dt>
                          <dd className="font-medium">{answerForDisplay(result.correctAnswers[question.id] ?? '')}</dd>
                        </div>
                      )}
                      {result.explanations[question.id] && (
                        <div className="flex gap-2">
                          <dt className="w-28 shrink-0 text-muted-foreground">Explanation</dt>
                          <dd>{result.explanations[question.id]}</dd>
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
    </>
  );
}

export default function ListeningAttemptClient({
  task,
  questionType,
  initialAttempts,
}: {
  task: AttemptTask;
  questionType: string;
  initialAttempts: AutoScoredAttemptResult[];
}) {
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [attemptNumber, setAttemptNumber] = useState<number | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [attempts, setAttempts] = useState(initialAttempts);
  const [submitted, setSubmitted] = useState<AutoScoredAttemptResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [lockedByTabSwitch, setLockedByTabSwitch] = useState(false);
  const [audioPhase, setAudioPhase] = useState<AudioPhase>('loading');
  const [transferSecondsLeft, setTransferSecondsLeft] = useState(TRANSFER_SECONDS);

  const audioRef = useRef<HTMLAudioElement>(null);
  const inFlight = useRef(false);

  async function handleStart() {
    setStarting(true);
    setError('');
    try {
      const started = await startAttempt(task.id, questionType);
      setAttemptId(started.attemptId);
      setAttemptNumber(started.attemptNumber);
      setAudioUrl(started.audioUrl);
      setAnswers({});
      setSubmitted(null);
      setLockedByTabSwitch(false);
      setTransferSecondsLeft(TRANSFER_SECONDS);
      const elapsed = (Date.now() - new Date(started.startTime).getTime()) / 1000;
      const remaining = Math.max(0, (task.timerMinutes ?? 8) * 60 - elapsed);
      setSecondsLeft(Math.floor(remaining));
      setAudioPhase('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start this Listening task.');
    } finally {
      setStarting(false);
    }
  }

  const handleSubmit = useCallback(async () => {
    if (!attemptId || submitted || inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    try {
      const result = await submitAttempt(attemptId, task.id, answers);
      const completed: AutoScoredAttemptResult = {
        id: attemptId,
        attemptNumber: attemptNumber ?? attempts.length + 1,
        score: result.score,
        total: result.total,
        answers,
        correctAnswers: result.correctAnswers,
        acceptedAnswers: Object.fromEntries(
          Object.entries(result.correctAnswers).map(([id, answer]) => [
            id,
            [answer, ...(result.alternativeAnswers[id] ?? [])],
          ]),
        ),
        explanations: result.explanations,
      };
      setSubmitted(completed);
      setAttempts((previous) =>
        [...previous.filter((attempt) => attempt.id !== completed.id), completed]
          .sort((a, b) => a.attemptNumber - b.attemptNumber),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit your Listening answers.');
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }, [attemptId, answers, attemptNumber, attempts.length, task.id, submitted]);

  // Overall attempt timer (covers listening + transfer time), same behavior as Reading
  useEffect(() => {
    if (secondsLeft === null || submitted) return;
    if (secondsLeft <= 0) {
      const timer = setTimeout(handleSubmit, 0);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => setSecondsLeft((s) => (s ?? 1) - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft, submitted, handleSubmit]);

  // Transfer-time countdown, starts once the audio finishes playing
  useEffect(() => {
    if (audioPhase !== 'transfer' || submitted) return;
    if (transferSecondsLeft <= 0) {
      const timer = setTimeout(handleSubmit, 0);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => setTransferSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [audioPhase, transferSecondsLeft, submitted, handleSubmit]);

  // Tab-switch lock, same rule as Reading
  useEffect(() => {
    if (submitted || secondsLeft === null) return;

    function handleVisibilityChange() {
      if (document.hidden) {
        setLockedByTabSwitch(true);
        handleSubmit();
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [submitted, secondsLeft, handleSubmit]);

  function handlePlay() {
    if (audioPhase !== 'ready') return;
    audioRef.current?.play();
    setAudioPhase('playing');
  }

  function handleAudioEnded() {
    setAudioPhase('transfer');
  }

  /* ───────── Intro and attempt history ───────── */
  if (secondsLeft === null) {
    return (
      <div className="min-h-svh bg-background text-foreground">
        <TopBar questionType={`${questionType} · ${task.section}`} title={task.title || `Task ${task.taskNumber}`} />
        <main className="mx-auto max-w-3xl px-6 py-10">
          <BackLink href="/practice/listening" label="Listening" />
          <section className="mt-6 rounded-2xl border bg-card p-6 text-card-foreground shadow-sm">
            <h2 className="text-lg font-semibold tracking-tight">
              {attempts.length < MAX_ATTEMPTS
                ? `Attempt ${attempts.length + 1} of ${MAX_ATTEMPTS}`
                : 'No attempts left'}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              You have {Number(task.timerMinutes) || 8} minutes to listen and answer {task.questions.length} questions.
              The recording plays once, followed by up to two minutes to check your answers.
            </p>
            {task.instructions && <p className="mt-3 text-sm">{task.instructions}</p>}
            {attempts.length > 0 && attempts.length < MAX_ATTEMPTS && (
              <p className="mt-3 text-sm text-muted-foreground">Use your previous feedback to improve this attempt.</p>
            )}
            {error && (
              <p role="alert" className="mt-4 rounded-lg border border-destructive/20 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
                {error}
              </p>
            )}
            {attempts.length < MAX_ATTEMPTS && (
              <button onClick={handleStart} disabled={starting} className={`${primaryButton} mt-5 h-11 px-6`}>
                {starting && <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />}
                Start attempt
              </button>
            )}
          </section>

          {attempts.length > 0 && (
            <section className="mt-10" aria-labelledby="history-heading">
              <h2 id="history-heading" className="text-lg font-semibold tracking-tight">Your attempts</h2>
              <div className="mt-4 space-y-3">
                {[...attempts].reverse().map((attempt) => (
                  <details key={attempt.id} className="rounded-xl border bg-card p-5 text-card-foreground">
                    <summary className="cursor-pointer text-sm font-medium">
                      Attempt {attempt.attemptNumber} feedback · {attempt.score} / {attempt.total}
                    </summary>
                    <div className="mt-5">
                      <ListeningResultFeedback task={task} result={attempt} />
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

  /* ───────── Results ───────── */
  if (submitted) {
    return (
      <div className="min-h-svh bg-background text-foreground">
        <TopBar questionType={`${questionType} · ${task.section}`} title={`Attempt ${submitted.attemptNumber} feedback`} />

        <main className="mx-auto max-w-3xl px-6 py-10">
          <BackLink href="/practice/listening" label="Listening" />
          <div className="mt-6">
            <ListeningResultFeedback task={task} result={submitted} />
          </div>
          {lockedByTabSwitch && (
            <div
              role="alert"
              className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-400"
            >
              This attempt was submitted automatically because you switched away from the tab.
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => {
                setSubmitted(null);
                setAttemptId(null);
                setAudioUrl(null);
                setSecondsLeft(null);
                setAudioPhase('loading');
              }}
              className={`${primaryButton} h-11 px-5`}
            >
              {attempts.length < MAX_ATTEMPTS ? `Try again (${MAX_ATTEMPTS - attempts.length} left)` : 'Compare my attempts'}
            </button>
            <Link
              href={`/practice/listening/${encodeURIComponent(questionType)}`}
              className="inline-flex h-11 items-center justify-center rounded-lg border bg-background px-5 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
            >
              More {questionType} tasks
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (!audioUrl) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-3 bg-background text-muted-foreground">
        <LoaderCircle className="size-6 animate-spin motion-reduce:animate-none" aria-hidden />
        <p className="text-sm">Preparing your audio…</p>
      </div>
    );
  }

  /* ───────── Attempt ───────── */
  const total = task.questions.length;
  const answeredCount = task.questions.filter((q) => answers[q.id]?.trim()).length;
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const lowTime = secondsLeft <= 60;

  return (
    <div className="min-h-svh bg-background text-foreground">
      <TopBar questionType={`${questionType} · ${task.section}`} title={task.title || `Task ${task.taskNumber}`}>
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

      <div
        role="alert"
        className="border-b bg-destructive/10 px-4 py-2.5 text-center text-sm text-destructive sm:px-6"
      >
        Stay on this tab. Switching away will submit your answers immediately and use one attempt.
      </div>
      {error && (
        <p role="alert" className="border-b border-destructive/20 bg-destructive/10 px-4 py-2.5 text-center text-sm text-destructive">
          {error}
        </p>
      )}

      <main className="mx-auto max-w-3xl px-6 py-8">
        {/* Audio control */}
        <div className="rounded-2xl border bg-card p-6 text-card-foreground shadow-sm">
          {/* Real <audio> element, always present so onEnded fires reliably. Controls hidden intentionally. */}
          <audio ref={audioRef} src={audioUrl} onEnded={handleAudioEnded} preload="auto" className="hidden" />

          {audioPhase === 'ready' && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Volume2 className="size-6" aria-hidden />
              </div>
              <div>
                <p className="font-medium">Ready to start</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  The recording plays once, automatically, from start to finish. You cannot pause or rewind, just
                  like the real test. Make sure your sound is on before you begin.
                </p>
              </div>
              <button onClick={handlePlay} className={`${primaryButton} h-11 px-6`}>
                Play recording
              </button>
            </div>
          )}

          {audioPhase === 'playing' && (
            <div className="flex items-center justify-center gap-3 py-6 text-muted-foreground">
              <span className="flex gap-1" aria-hidden>
                <span className="h-5 w-1 animate-pulse rounded-full bg-primary [animation-delay:-0.3s]" />
                <span className="h-7 w-1 animate-pulse rounded-full bg-primary [animation-delay:-0.15s]" />
                <span className="h-4 w-1 animate-pulse rounded-full bg-primary" />
                <span className="h-6 w-1 animate-pulse rounded-full bg-primary [animation-delay:-0.45s]" />
              </span>
              <p className="text-sm font-medium">Playing — listen carefully</p>
            </div>
          )}

          {audioPhase === 'transfer' && (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <CircleCheck className="size-6 text-emerald-500" aria-hidden />
              <p className="font-medium">Recording finished</p>
              <p className="text-sm text-muted-foreground">
                Check and complete your answers. Time to transfer:{' '}
                <span className="font-mono tabular-nums text-foreground">
                  {Math.floor(transferSecondsLeft / 60)}:{(transferSecondsLeft % 60).toString().padStart(2, '0')}
                </span>
              </p>
            </div>
          )}
        </div>

        {/* Questions */}
        <div className="mt-8">
          {task.instructions && (
            <p
              className="no-copy rounded-lg bg-muted/60 p-4 text-sm leading-relaxed text-muted-foreground"
              onCopy={(e) => e.preventDefault()}
              onContextMenu={(e) => e.preventDefault()}
            >
              {task.instructions}
            </p>
          )}
          {task.mapImageUrl && (
            <div className="relative mx-auto mt-6 inline-block max-w-full overflow-hidden rounded-xl border bg-background">
              <img src={task.mapImageUrl} alt="Map or diagram for this listening task" className="block max-h-96 max-w-full object-contain" />
              {task.questions.map((question, index) => {
                const { x, y } = question.mapLabel ?? {};
                if (x === undefined || y === undefined) return null;
                return (
                  <span
                    key={question.id}
                    className="absolute flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-primary text-xs font-bold text-primary-foreground shadow"
                    style={{ left: `${x}%`, top: `${y}%` }}
                    aria-hidden
                  >
                    {index + 1}
                  </span>
                );
              })}
            </div>
          )}
          {task.transcript && (
            <details className="mt-6 rounded-xl border p-4">
              <summary className="cursor-pointer text-sm font-medium">View transcript</summary>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{task.transcript}</p>
            </details>
          )}

          <ol className="mt-8 space-y-8">
            {task.questions.map((q, i) => {
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
                    {q.matching?.item && <p className="mt-2 text-sm text-muted-foreground">{q.matching.item}</p>}
                    {q.completion?.heading && <p className="mt-3 font-semibold">{q.completion.heading}</p>}
                    {q.completion?.fieldLabel && <p className="mt-2 text-sm">{q.completion.fieldLabel}</p>}
                    {q.tableCell && <p className="mt-2 text-sm text-muted-foreground">{q.tableCell.row} · {q.tableCell.column}</p>}
                    {q.flowStep?.stepText && <p className="mt-2 rounded-lg border border-dashed p-3 text-sm">{q.flowStep.position}. {q.flowStep.stepText}</p>}
                    {q.wordLimit && <p className="mt-2 text-xs text-muted-foreground">No more than {q.wordLimit} {q.wordLimit === 1 ? 'word' : 'words'}.</p>}

                    {q.options ? (
                      <div role={q.answerMode === 'multiple' ? 'group' : 'radiogroup'} aria-labelledby={`label-${q.id}`} className="mt-3 space-y-2">
                        {q.options.map((opt: string) => (
                          <label
                            key={opt}
                            className="flex cursor-pointer items-start gap-3 rounded-lg border bg-card px-3.5 py-3 text-sm transition-colors hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/40"
                          >
                            <input
                              type={q.answerMode === 'multiple' ? 'checkbox' : 'radio'}
                              name={q.id}
                              value={opt}
                              checked={q.answerMode === 'multiple' ? answerArray(answers[q.id] ?? '').includes(opt) : answers[q.id] === opt}
                              onChange={(event) => {
                                if (q.answerMode !== 'multiple') {
                                  setAnswers((current) => ({ ...current, [q.id]: opt }));
                                  return;
                                }
                                const current = answerArray(answers[q.id] ?? '');
                                const selected = event.target.checked ? [...current, opt] : current.filter((value) => value !== opt);
                                setAnswers((currentAnswers) => ({ ...currentAnswers, [q.id]: JSON.stringify(selected) }));
                              }}
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
      </main>
    </div>
  );
}