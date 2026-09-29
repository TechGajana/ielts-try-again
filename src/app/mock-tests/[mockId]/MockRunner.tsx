'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CircleAlert, CircleCheck, ClipboardCheck, Clock, LoaderCircle, Volume2 } from 'lucide-react';
import {
  AUTOSAVE_SECONDS,
  MOCK_SECTIONS,
  SECTION_LABELS,
  WRITING_SUGGESTED_MINUTES,
  type ListeningPartView,
  type MockQuestion,
  type MockSection,
  type ReadingPartView,
  type RunnerState,
} from '@/lib/mock-config';
import { WRITING_PARTS, countWords } from '@/lib/writing-config';
import { advanceMockAction, audioMockAction, leaveMockAction, saveMockAction } from './actions';
import ConfirmDialog from './ConfirmDialog';
import QuestionField from './QuestionField';

const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

const primaryButton =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-70';

interface AudioState {
  status: 'idle' | 'loading' | 'playing' | 'done' | 'error';
  part: number;
  message: string;
}

/* ───────── Small presentational pieces ───────── */

function PartTabs({
  items,
  active,
  onChange,
}: {
  items: { label: string; badge: string }[];
  active: number;
  onChange: (i: number) => void;
}) {
  return (
    <div role="tablist" className="flex overflow-x-auto border-b bg-background px-4 sm:px-6">
      {items.map((it, i) => (
        <button
          key={it.label}
          role="tab"
          aria-selected={i === active}
          onClick={() => onChange(i)}
          className={`h-12 shrink-0 border-b-2 px-4 text-sm transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/40 ${
            i === active
              ? 'border-primary font-medium text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          {it.label}
          <span className="ml-2 text-xs tabular-nums text-muted-foreground">{it.badge}</span>
        </button>
      ))}
    </div>
  );
}

function QuestionList({
  partIndex,
  questions,
  startNumber,
  answers,
  onAnswer,
}: {
  partIndex: number;
  questions: MockQuestion[];
  startNumber: number;
  answers: { [key: string]: string };
  onAnswer: (key: string, value: string) => void;
}) {
  return (
    <ol className="space-y-8">
      {questions.map((q, i) => {
        const key = `p${partIndex}_${q.id}`;
        return (
          <QuestionField
            key={q.id}
            fieldKey={key}
            q={q}
            number={startNumber + i}
            value={answers[key] ?? ''}
            onChange={(v) => onAnswer(key, v)}
          />
        );
      })}
    </ol>
  );
}

function AudioPanel({
  audio,
  parts,
  onStart,
  onRetry,
}: {
  audio: AudioState;
  parts: ListeningPartView[];
  onStart: () => void;
  onRetry: () => void;
}) {
  const withAudio = parts.filter((p) => p.hasAudio);
  const position = withAudio.findIndex((p) => p.index === audio.part) + 1;

  return (
    <div className="rounded-2xl border bg-card p-6 text-card-foreground shadow-sm">
      {audio.status === 'idle' && (
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Volume2 className="size-6" aria-hidden />
          </div>
          <div>
            <p className="font-medium">Ready to start the recordings</p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              The recordings play one after another, once only. You cannot pause or replay them. Your time is
              already running, so start when you are ready.
            </p>
          </div>
          <button onClick={onStart} className={`${primaryButton} h-11 px-6`}>
            Play recordings
          </button>
        </div>
      )}

      {audio.status === 'loading' && (
        <div className="flex items-center justify-center gap-3 py-4 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
          Loading recording…
        </div>
      )}

      {audio.status === 'playing' && (
        <div className="flex items-center justify-center gap-3 py-4">
          <span className="flex gap-1" aria-hidden>
            <span className="h-5 w-1 animate-pulse rounded-full bg-primary [animation-delay:-0.3s] motion-reduce:animate-none" />
            <span className="h-7 w-1 animate-pulse rounded-full bg-primary [animation-delay:-0.15s] motion-reduce:animate-none" />
            <span className="h-4 w-1 animate-pulse rounded-full bg-primary motion-reduce:animate-none" />
            <span className="h-6 w-1 animate-pulse rounded-full bg-primary [animation-delay:-0.45s] motion-reduce:animate-none" />
          </span>
          <p className="text-sm font-medium">
            Playing recording {position} of {withAudio.length}. Listen carefully.
          </p>
        </div>
      )}

      {audio.status === 'done' && (
        <div className="flex flex-col items-center gap-1.5 py-2 text-center">
          <CircleCheck className="size-6 text-emerald-500" aria-hidden />
          <p className="font-medium">Recordings finished</p>
          <p className="text-sm text-muted-foreground">Check your answers until the time is up.</p>
        </div>
      )}

      {audio.status === 'error' && (
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <CircleAlert className="size-6 text-destructive" aria-hidden />
          <p role="alert" className="max-w-md text-sm text-destructive">
            {audio.message}
          </p>
          <button onClick={onRetry} className={`${primaryButton} h-10 px-5`}>
            Try playing again
          </button>
        </div>
      )}
    </div>
  );
}

/* ───────── The exam ───────── */

export default function MockRunner({ mockId, initial }: { mockId: string; initial: RunnerState }) {
  const router = useRouter();

  const [state, setState] = useState(initial);
  const [answers, setAnswers] = useState(initial.answers);
  const [activePart, setActivePart] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.ceil((initial.sectionEndsAt - initial.serverNow) / 1000)),
  );
  const [dialog, setDialog] = useState<'advance' | 'leave' | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'offline'>('saved');
  const [audio, setAudio] = useState<AudioState>({ status: 'idle', part: -1, message: '' });

  const answersRef = useRef(initial.answers);
  const dirtyRef = useRef(false);
  const sectionRef = useRef(initial.section);
  const offsetRef = useRef(initial.serverNow - Date.now());
  const advancingRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const goResults = useCallback(() => {
    router.replace(`/mock-tests/${mockId}/results`);
  }, [router, mockId]);

  // Swap in a new section: reset the clock offset, answers and tab
  const applyState = useCallback((next: RunnerState) => {
    offsetRef.current = next.serverNow - Date.now();
    sectionRef.current = next.section;
    answersRef.current = next.answers;
    dirtyRef.current = false;
    advancingRef.current = false;
    setState(next);
    setAnswers(next.answers);
    setActivePart(0);
    setSaveState('saved');
    setSecondsLeft(Math.max(0, Math.ceil((next.sectionEndsAt - next.serverNow) / 1000)));
  }, []);

  function setAnswer(key: string, value: string) {
    const next = { ...answersRef.current, [key]: value };
    answersRef.current = next;
    dirtyRef.current = true;
    setAnswers(next);
    setSaveState('saving');
  }

  // Move to the next section (or submit, from Writing). Also used when the clock hits zero.
  const doAdvance = useCallback(async () => {
    if (advancingRef.current) return;
    advancingRef.current = true;
    setBusy(true);
    setError('');
    const from = sectionRef.current;
    try {
      await saveMockAction(mockId, from, answersRef.current).catch(() => null);
      const res = await advanceMockAction(mockId, from);
      if (!res.ok) throw new Error(res.error);
      if (res.result.closed) {
        goResults();
        return;
      }
      applyState(res.result.state);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not continue. Check your connection.');
      // Wait a moment before the timer is allowed to try again
      setTimeout(() => {
        advancingRef.current = false;
      }, 3000);
    } finally {
      setBusy(false);
      setDialog(null);
    }
  }, [mockId, goResults, applyState]);

  async function doLeave() {
    setBusy(true);
    await leaveMockAction(mockId).catch(() => null);
    goResults();
  }

  // Countdown, driven by the server's clock
  useEffect(() => {
    const id = setInterval(() => {
      const left = Math.max(0, Math.ceil((state.sectionEndsAt - (Date.now() + offsetRef.current)) / 1000));
      setSecondsLeft(left);
      if (left === 0 && !advancingRef.current) void doAdvance();
    }, 500);
    return () => clearInterval(id);
  }, [state.sectionEndsAt, doAdvance]);

  // Autosave, which doubles as the "still here" signal
  useEffect(() => {
    const id = setInterval(async () => {
      if (advancingRef.current) return;
      const wasDirty = dirtyRef.current;
      dirtyRef.current = false;
      try {
        const res = await saveMockAction(mockId, sectionRef.current, wasDirty ? answersRef.current : {});
        if (!res.ok) throw new Error(res.error);
        if (res.outcome === 'closed') {
          goResults();
          return;
        }
        if (res.outcome === 'moved') {
          // The server moved on without us (for example, the time ran out while offline)
          const next = await advanceMockAction(mockId, sectionRef.current);
          if (next.ok && next.result.closed) goResults();
          else if (next.ok && !next.result.closed) applyState(next.result.state);
          return;
        }
        setSaveState(dirtyRef.current ? 'saving' : 'saved');
      } catch {
        dirtyRef.current = dirtyRef.current || wasDirty;
        setSaveState('offline');
      }
    }, AUTOSAVE_SECONDS * 1000);
    return () => clearInterval(id);
  }, [mockId, goResults, applyState]);

  // Browser warning if the tab is closed or refreshed mid-test
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = '';
    }
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  // Listening audio: one element, parts played in order
  const payload = state.payload;
  const listeningParts = payload.section === 'listening' ? payload.parts : [];

  const playPart = useCallback(
    async (index: number) => {
      setActivePart(index);
      setAudio({ status: 'loading', part: index, message: '' });
      const res = await audioMockAction(mockId, index);
      if (!res.ok) {
        setAudio({ status: 'error', part: index, message: res.error });
        return;
      }
      const el = audioRef.current;
      if (!el) return;
      el.src = res.url;
      try {
        await el.play();
        setAudio({ status: 'playing', part: index, message: '' });
      } catch {
        setAudio({ status: 'error', part: index, message: 'Your browser blocked playback. Press the button to play.' });
      }
    },
    [mockId],
  );

  function startAudio() {
    if (payload.section !== 'listening') return;
    const first = payload.parts.find((p) => p.hasAudio && !payload.playedParts.includes(p.index));
    if (first) void playPart(first.index);
    else setAudio({ status: 'done', part: -1, message: '' });
  }

  function handleAudioEnded() {
    const next = listeningParts.find((p) => p.hasAudio && p.index > audio.part);
    if (next) void playPart(next.index);
    else setAudio((a) => ({ ...a, status: 'done' }));
  }

  /* ───────── Derived view data ───────── */

  const lowTime = secondsLeft <= 300;
  const sectionIndex = MOCK_SECTIONS.indexOf(state.section);
  const isFinal = state.section === 'writing';

  const answeredIn = (partIndex: number, questions: MockQuestion[]) =>
    questions.filter((q) => answers[`p${partIndex}_${q.id}`]?.trim()).length;

  const startNumbers = (parts: { questions: MockQuestion[] }[]) => {
    const out: number[] = [];
    let n = 1;
    for (const p of parts) {
      out.push(n);
      n += p.questions.length;
    }
    return out;
  };

  let tabs: { label: string; badge: string }[] = [];
  if (payload.section === 'listening' || payload.section === 'reading') {
    const parts: (ListeningPartView | ReadingPartView)[] = payload.parts;
    tabs = parts.map((p) => ({
      label: p.title,
      badge: `${answeredIn(p.index, p.questions)}/${p.questions.length}`,
    }));
  } else {
    tabs = [
      { label: 'Task 1', badge: `${countWords(answers.task1 ?? '')} words` },
      { label: 'Task 2', badge: `${countWords(answers.task2 ?? '')} words` },
    ];
  }

  const saveLabel = saveState === 'saved' ? 'Saved' : saveState === 'saving' ? 'Saving…' : 'Offline, retrying';

  return (
    <div className="min-h-svh bg-background text-foreground">
      <audio ref={audioRef} onEnded={handleAudioEnded} preload="auto" className="hidden" />

      {/* ───────── Header ───────── */}
      <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ClipboardCheck className="size-5" aria-hidden />
            </div>
            <p className="hidden truncate text-sm font-medium sm:block">Mock Test {state.mockNumber}</p>
          </div>

          <ol className="flex items-center gap-1.5 text-xs" aria-label="Test progress">
            {MOCK_SECTIONS.map((s: MockSection, i) => (
              <li
                key={s}
                aria-current={i === sectionIndex ? 'step' : undefined}
                className={`rounded-full px-3 py-1 ${
                  i === sectionIndex
                    ? 'bg-primary font-medium text-primary-foreground'
                    : i < sectionIndex
                      ? 'bg-muted text-muted-foreground line-through'
                      : 'border text-muted-foreground'
                }`}
              >
                {SECTION_LABELS[s]}
              </li>
            ))}
          </ol>

          <div className="flex shrink-0 items-center gap-3">
            <span
              className={`hidden text-xs sm:block ${saveState === 'offline' ? 'text-destructive' : 'text-muted-foreground'}`}
              aria-live="polite"
            >
              {saveLabel}
            </span>
            <div
              role="timer"
              aria-label="Time remaining in this section"
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-sm tabular-nums ${
                lowTime ? 'bg-destructive/10 text-destructive' : 'bg-muted text-foreground'
              }`}
            >
              <Clock className="size-4" aria-hidden />
              {fmt(secondsLeft)}
            </div>
            <button onClick={() => setDialog('advance')} disabled={busy} className={`${primaryButton} h-9 px-4`}>
              {isFinal ? 'Submit' : 'Finish section'}
            </button>
            <button
              onClick={() => setDialog('leave')}
              disabled={busy}
              className="hidden h-9 rounded-lg border px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 sm:block"
            >
              Exit
            </button>
          </div>
        </div>
      </header>

      {error && (
        <p role="alert" className="border-b bg-destructive/10 px-6 py-2.5 text-center text-sm text-destructive">
          {error}
        </p>
      )}

      <PartTabs items={tabs} active={activePart} onChange={setActivePart} />

      {/* ───────── Listening ───────── */}
      {payload.section === 'listening' &&
        (() => {
          const part = payload.parts[activePart] ?? payload.parts[0];
          const starts = startNumbers(payload.parts);
          return (
            <main className="mx-auto max-w-3xl px-6 py-8">
              <AudioPanel
                audio={audio}
                parts={payload.parts}
                onStart={startAudio}
                onRetry={() => (audio.part >= 0 ? void playPart(audio.part) : startAudio())}
              />

              <div className="mt-8">
                {part.instructions && (
                  <p className="rounded-lg bg-muted/60 p-4 text-sm leading-relaxed text-muted-foreground">
                    {part.instructions}
                  </p>
                )}
                {part.diagramUrl && (
                  <div className="mt-6 overflow-hidden rounded-xl border bg-card">
                    {/* eslint-disable-next-line @next/next/no-img-element -- signed R2 URL */}
                    <img src={part.diagramUrl} alt={`Diagram for ${part.title}`} className="w-full" />
                  </div>
                )}
                <div className="mt-8">
                  <QuestionList
                    partIndex={part.index}
                    questions={part.questions}
                    startNumber={starts[part.index]}
                    answers={answers}
                    onAnswer={setAnswer}
                  />
                </div>
              </div>
            </main>
          );
        })()}

      {/* ───────── Reading ───────── */}
      {payload.section === 'reading' &&
        (() => {
          const part = payload.parts[activePart] ?? payload.parts[0];
          const starts = startNumbers(payload.parts);
          return (
            <div className="mx-auto grid max-w-7xl lg:grid-cols-2">
              <section
                aria-label="Reading passage"
                className="border-b px-6 py-8 lg:h-[calc(100svh-7rem)] lg:overflow-y-auto lg:border-b-0 lg:border-r lg:px-10"
              >
                <div className="mx-auto max-w-prose whitespace-pre-wrap font-serif text-[1.0625rem] leading-8">
                  {part.passage}
                </div>
              </section>
              <section
                aria-label="Questions"
                className="px-6 py-8 lg:h-[calc(100svh-7rem)] lg:overflow-y-auto lg:px-10"
              >
                <div className="mx-auto max-w-xl">
                  {part.instructions && (
                    <p className="rounded-lg bg-muted/60 p-4 text-sm leading-relaxed text-muted-foreground">
                      {part.instructions}
                    </p>
                  )}
                  <div className="mt-8">
                    <QuestionList
                      partIndex={part.index}
                      questions={part.questions}
                      startNumber={starts[part.index]}
                      answers={answers}
                      onAnswer={setAnswer}
                    />
                  </div>
                </div>
              </section>
            </div>
          );
        })()}

      {/* ───────── Writing ───────── */}
      {payload.section === 'writing' &&
        (() => {
          const key = activePart === 0 ? 'task1' : 'task2';
          const cfg = WRITING_PARTS[key];
          const text = answers[key] ?? '';
          const words = countWords(text);
          const prompt = key === 'task1' ? payload.task1.prompt : payload.task2.prompt;
          const imageUrl = key === 'task1' ? payload.task1.imageUrl : null;

          return (
            <div className="mx-auto grid max-w-7xl lg:grid-cols-2">
              <section
                aria-label="Question"
                className="border-b px-6 py-8 lg:h-[calc(100svh-7rem)] lg:overflow-y-auto lg:border-b-0 lg:border-r lg:px-10"
              >
                <div className="mx-auto max-w-prose">
                  <p className="mb-4 text-xs text-muted-foreground">
                    Suggested time: about {WRITING_SUGGESTED_MINUTES[key]} minutes. Write at least {cfg.minWords} words.
                  </p>
                  <p className="whitespace-pre-wrap text-[0.9375rem] leading-relaxed">{prompt}</p>
                  {imageUrl && (
                    <div className="mt-6 overflow-hidden rounded-xl border bg-card">
                      {/* eslint-disable-next-line @next/next/no-img-element -- signed R2 URL */}
                      <img src={imageUrl} alt="Visual for Task 1" className="w-full" />
                    </div>
                  )}
                </div>
              </section>

              <section aria-label="Your answer" className="flex flex-col px-6 py-8 lg:h-[calc(100svh-7rem)] lg:px-10">
                <label htmlFor="answer" className="sr-only">
                  Your answer for {key === 'task1' ? 'Task 1' : 'Task 2'}
                </label>
                <textarea
                  id="answer"
                  key={key}
                  value={text}
                  onChange={(e) => setAnswer(key, e.target.value)}
                  placeholder="Start writing your answer here…"
                  spellCheck={false}
                  className="min-h-96 w-full flex-1 resize-none rounded-xl border border-input bg-background p-4 font-serif text-[1.0625rem] leading-8 shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40"
                />
                <p
                  className={`mt-3 text-xs tabular-nums ${words >= cfg.minWords ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}
                >
                  {words} words · aim for {cfg.targetWords}
                </p>
              </section>
            </div>
          );
        })()}

      {/* ───────── Dialogs ───────── */}
      {dialog === 'advance' && (
        <ConfirmDialog
          title={isFinal ? 'Submit your mock test?' : `Finish ${SECTION_LABELS[state.section]}?`}
          confirmLabel={isFinal ? 'Submit mock test' : `Finish ${SECTION_LABELS[state.section]}`}
          busy={busy}
          onConfirm={() => void doAdvance()}
          onCancel={() => setDialog(null)}
        >
          {isFinal
            ? 'This submits your whole mock test. You cannot change anything afterwards.'
            : `You cannot come back to ${SECTION_LABELS[state.section]} once you move on. Your answers are saved, and the next section starts straight away.`}
        </ConfirmDialog>
      )}

      {dialog === 'leave' && (
        <ConfirmDialog
          title="Exit the mock test?"
          confirmLabel="Exit mock test"
          cancelLabel="Keep going"
          destructive
          busy={busy}
          onConfirm={() => void doLeave()}
          onCancel={() => setDialog(null)}
        >
          This mock test can only be attempted once. If you exit now, you cannot restart it. Your saved answers will
          still be marked.
        </ConfirmDialog>
      )}
    </div>
  );
}