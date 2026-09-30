'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CircleAlert, Clock, LoaderCircle, Mic, Square } from 'lucide-react';
import { BackLink } from '@/components/practice/back-link';
import {
  MAX_SPEAKING_ATTEMPTS,
  MAX_SPEAK_SECONDS,
  PREP_SECONDS,
  type SpeakingResult,
} from '@/lib/speaking-config';
import {
  getSpeakingUploadTarget,
  startSpeakingAttempt,
  submitSpeakingAttempt,
} from './actions';
import SpeakingEvaluationView from './SpeakingEvaluationView';

interface PromptView {
  id: string;
  cardNumber: number;
  topic: string;
  bullets: string[];
}
interface Active {
  attemptId: string;
  attemptNumber: number;
}
type Phase = 'intro' | 'prep' | 'recording' | 'uploading' | 'result';

const primaryButton =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-70';

const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

function pickMimeType() {
  const options = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  return options.find((t) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) ?? '';
}

function TopBar({ subtitle, title, children }: { subtitle: string; title: string; children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Mic className="size-5" aria-hidden />
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

function CueCard({ prompt }: { prompt: PromptView }) {
  return (
    <section
      aria-label="Cue card"
      className="no-copy rounded-2xl border bg-card p-6 text-card-foreground shadow-sm sm:p-8"
      onCopy={(e) => e.preventDefault()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <p className="text-xl font-semibold leading-snug tracking-tight">{prompt.topic}</p>
      <p className="mt-5 text-sm font-medium">You should say:</p>
      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[0.9375rem] leading-relaxed">
        {prompt.bullets.map((b, i) => (
          <li key={i}>{b}</li>
        ))}
      </ul>
    </section>
  );
}

export default function SpeakingAttemptClient({
  prompt,
  initialAttempts,
}: {
  prompt: PromptView;
  initialAttempts: SpeakingResult[];
}) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [attempts, setAttempts] = useState(initialAttempts);
  const [active, setActive] = useState<Active | null>(null);
  const [result, setResult] = useState<SpeakingResult | null>(null);
  const [notes, setNotes] = useState('');
  const [prepLeft, setPrepLeft] = useState(PREP_SECONDS);
  const [speakLeft, setSpeakLeft] = useState(MAX_SPEAK_SECONDS);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [uploadFailed, setUploadFailed] = useState(false);
  const [lockedByTabSwitch, setLockedByTabSwitch] = useState(false); // UI only: shows a different message when the lock caused submission

  const activeRef = useRef<Active | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const blobRef = useRef<Blob | null>(null);
  const durationRef = useRef(0);
  const startedAtRef = useRef(0);
  const prepDeadlineRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lockTriggeredRef = useRef(false); // guards against the visibilitychange firing more than once

  const attemptsLeft = MAX_SPEAKING_ATTEMPTS - attempts.length;

  const releaseAudio = useCallback(() => {
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    analyserRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // Turn the microphone off if the student leaves the page
  useEffect(() => releaseAudio, [releaseAudio]);

  const uploadAndSubmit = useCallback(async () => {
    const blob = blobRef.current;
    const current = activeRef.current;
    if (!blob || !current) return;

    setError('');
    setUploadFailed(false);
    setPhase('uploading');
    try {
      const contentType = blob.type.split(';')[0] || 'audio/webm';
      const { uploadUrl } = await getSpeakingUploadTarget(current.attemptId, contentType);

      let res: Response;
      try {
        res = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': contentType }, body: blob });
      } catch (fetchErr) {
        console.error('Speaking upload network error:', fetchErr);
        const origin = typeof window !== 'undefined' ? window.location.origin : 'unknown';
        throw new Error(
          `Could not reach the storage server from origin: ${origin}. This origin is likely missing from the R2 CORS policy. Add it exactly as shown, then try again.`,
        );
      }

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Upload failed (${res.status})${body ? `: ${body.slice(0, 200)}` : ''}`);
      }

      const submitted = await submitSpeakingAttempt(current.attemptId, durationRef.current);
      setAttempts((prev) =>
        [...prev.filter((a) => a.id !== submitted.id), submitted].sort((a, b) => a.attemptNumber - b.attemptNumber),
      );
      setResult(submitted);
      setPhase('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload your recording.');
      setUploadFailed(true);
    }
  }, []);

  const finishRecording = useCallback(
    (mimeType: string) => {
      releaseAudio();
      blobRef.current = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
      durationRef.current = Math.min(MAX_SPEAK_SECONDS, Math.round((Date.now() - startedAtRef.current) / 1000));
      uploadAndSubmit();
    },
    [releaseAudio, uploadAndSubmit],
  );

  const beginRecording = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;

    const mime = pickMimeType();
    const recorder = new MediaRecorder(stream, {
      ...(mime ? { mimeType: mime } : {}),
      audioBitsPerSecond: 48000,
    });
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => finishRecording(recorder.mimeType);
    recorderRef.current = recorder;

    // Analyser feeds the waveform
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    ctx.createMediaStreamSource(stream).connect(analyser);
    audioCtxRef.current = ctx;
    analyserRef.current = analyser;

    startedAtRef.current = Date.now();
    setSpeakLeft(MAX_SPEAK_SECONDS);
    recorder.start(1000);
    setPhase('recording');
  }, [finishRecording]);

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
  }, []);

  async function handleStart() {
    setError('');
    setStarting(true);
    try {
      // Ask for the microphone first, so a blocked mic never uses up an attempt
      try {
        streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        throw new Error('Microphone access is blocked. Allow the microphone in your browser and try again.');
      }
      const a = await startSpeakingAttempt(prompt.id);
      activeRef.current = a;
      setActive(a);
      setNotes('');
      prepDeadlineRef.current = Date.now() + PREP_SECONDS * 1000;
      setPrepLeft(PREP_SECONDS);
      lockTriggeredRef.current = false;
      setLockedByTabSwitch(false);
      setPhase('prep');
    } catch (err) {
      releaseAudio();
      setError(err instanceof Error ? err.message : 'Could not start the attempt');
    } finally {
      setStarting(false);
    }
  }

  // Preparation countdown, then recording starts on its own
  useEffect(() => {
    if (phase !== 'prep') return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((prepDeadlineRef.current - Date.now()) / 1000));
      setPrepLeft(left);
      if (left === 0) beginRecording();
    };
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [phase, beginRecording]);

  // Speaking countdown, recording stops on its own at the limit
  useEffect(() => {
    if (phase !== 'recording') return;
    const tick = () => {
      const elapsed = (Date.now() - startedAtRef.current) / 1000;
      setSpeakLeft(Math.max(0, Math.ceil(MAX_SPEAK_SECONDS - elapsed)));
      if (elapsed >= MAX_SPEAK_SECONDS) stopRecording();
    };
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [phase, stopRecording]);

  // Waveform
  useEffect(() => {
    if (phase !== 'recording') return;
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    const ctx2d = canvas?.getContext('2d');
    if (!canvas || !analyser || !ctx2d) return;

    const data = new Uint8Array(analyser.frequencyBinCount);
    const bars = 48;
    let raf = 0;

    const draw = () => {
      analyser.getByteFrequencyData(data);
      const w = canvas.width;
      const h = canvas.height;
      ctx2d.clearRect(0, 0, w, h);
      ctx2d.fillStyle = getComputedStyle(canvas).color;
      const bw = w / bars;
      for (let i = 0; i < bars; i++) {
        const v = data[Math.floor((i * data.length * 0.6) / bars)] / 255;
        const bh = Math.max(4, v * h);
        ctx2d.fillRect(i * bw + 2, (h - bh) / 2, bw - 4, bh);
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  // Tab-switch lock: leaving during preparation or recording ends the attempt.
  // During prep, this jumps straight into recording and stops almost immediately,
  // so an attempt is still consumed and something is submitted, matching Reading/Listening/Writing.
  useEffect(() => {
    if (phase !== 'prep' && phase !== 'recording') return;

    function handleVisibilityChange() {
      if (!document.hidden || lockTriggeredRef.current) return;
      lockTriggeredRef.current = true;
      setLockedByTabSwitch(true);

      if (phase === 'recording') {
        stopRecording();
      } else {
        beginRecording();
        setTimeout(() => stopRecording(), 300);
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [phase, stopRecording, beginRecording]);

  const subtitle = `Cue card ${prompt.cardNumber}`;

  /* ───────── Preparation ───────── */
  if (phase === 'prep' && active) {
    return (
      <div className="min-h-svh bg-background text-foreground">
        <TopBar subtitle={subtitle} title={`Attempt ${active.attemptNumber} of ${MAX_SPEAKING_ATTEMPTS}`}>
          <div
            role="timer"
            aria-label="Preparation time remaining"
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-sm tabular-nums ${
              prepLeft <= 10 ? 'bg-destructive/10 text-destructive' : 'bg-muted text-foreground'
            }`}
          >
            <Clock className="size-4" aria-hidden />
            {fmt(prepLeft)}
          </div>
        </TopBar>

        <div role="alert" className="border-b bg-destructive/10 px-4 py-2.5 text-center text-sm text-destructive sm:px-6">
          Stay on this tab. Switching away will end your attempt and use one attempt.
        </div>

        <main className="mx-auto max-w-3xl space-y-6 px-6 py-8">
          <p className="rounded-lg bg-muted/60 p-4 text-sm leading-relaxed text-muted-foreground">
            Preparation time. Read the card and jot down some notes. Recording starts automatically when the timer
            reaches zero, and you will then have up to 2 minutes to speak.
          </p>

          <CueCard prompt={prompt} />

          <div>
            <label htmlFor="notes" className="mb-1.5 block text-sm font-medium">
              Notes (optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              placeholder="Write key words, not full sentences"
              className="w-full rounded-xl border border-input bg-background p-4 text-sm leading-relaxed shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">Your notes stay on this page and are not saved.</p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
              <Mic className="size-4" aria-hidden />
              Microphone ready
            </span>
            <button onClick={beginRecording} className={`${primaryButton} h-11 px-6`}>
              I&apos;m ready, start speaking
            </button>
          </div>
        </main>
      </div>
    );
  }

  /* ───────── Recording ───────── */
  if (phase === 'recording' && active) {
    return (
      <div className="min-h-svh bg-background text-foreground">
        <TopBar subtitle={subtitle} title={`Attempt ${active.attemptNumber} of ${MAX_SPEAKING_ATTEMPTS}`}>
          <div
            role="timer"
            aria-label="Speaking time remaining"
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-sm tabular-nums ${
              speakLeft <= 15 ? 'bg-destructive/10 text-destructive' : 'bg-muted text-foreground'
            }`}
          >
            <Clock className="size-4" aria-hidden />
            {fmt(speakLeft)}
          </div>
        </TopBar>

        <div role="alert" className="border-b bg-destructive/10 px-4 py-2.5 text-center text-sm text-destructive sm:px-6">
          Stay on this tab. Switching away will end your attempt and use one attempt.
        </div>

        <main className="mx-auto max-w-3xl space-y-6 px-6 py-8">
          <div className="rounded-2xl border bg-card p-6 text-card-foreground shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="inline-flex items-center gap-2 text-sm font-medium text-destructive">
                <span className="relative flex size-2.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive/60 motion-reduce:animate-none" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-destructive" />
                </span>
                Recording
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Mic className="size-3.5" aria-hidden />
                Microphone on
              </span>
            </div>

            <canvas ref={canvasRef} width={640} height={96} aria-hidden className="mt-4 h-24 w-full text-primary" />

            <div className="mt-4 flex items-center justify-between gap-4">
              <p className="text-sm tabular-nums text-muted-foreground">
                Speaking for {fmt(MAX_SPEAK_SECONDS - speakLeft)} of {fmt(MAX_SPEAK_SECONDS)}
              </p>
              <button
                onClick={stopRecording}
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-destructive px-5 text-sm font-medium text-white transition-colors hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-destructive/40"
              >
                <Square className="size-3.5 fill-current" aria-hidden />
                Stop and submit
              </button>
            </div>
          </div>

          <CueCard prompt={prompt} />

          {notes.trim() && (
            <section className="rounded-xl border bg-muted/40 p-4">
              <p className="text-xs font-medium text-muted-foreground">Your notes</p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{notes}</p>
            </section>
          )}
        </main>
      </div>
    );
  }

  /* ───────── Uploading and evaluating ───────── */
  if (phase === 'uploading') {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background px-6 text-center text-muted-foreground">
        {uploadFailed ? (
          <>
            <CircleAlert className="size-6 text-destructive" aria-hidden />
            <p role="alert" className="max-w-sm text-sm text-destructive">
              {error}
            </p>
            <p className="max-w-sm text-sm">Your recording is still on this page. Try sending it again.</p>
            <button onClick={uploadAndSubmit} className={`${primaryButton} h-11 px-6`}>
              Try again
            </button>
          </>
        ) : (
          <>
            <LoaderCircle className="size-6 animate-spin motion-reduce:animate-none" aria-hidden />
            <p className="text-sm">Uploading and evaluating your answer. This can take up to a minute.</p>
          </>
        )}
      </div>
    );
  }

  /* ───────── Result (just submitted) ───────── */
  if (phase === 'result' && result) {
    return (
      <div className="min-h-svh bg-background text-foreground">
        <TopBar subtitle={subtitle} title={`Attempt ${result.attemptNumber} feedback`} />
        <main className="mx-auto max-w-3xl px-6 py-10">
          <BackLink href="/practice/speaking" label="Speaking" />

          {lockedByTabSwitch && (
            <div
              role="alert"
              className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-400"
            >
              This attempt was submitted automatically because you switched away from the tab.
            </div>
          )}

          <div className="mt-6">
            <SpeakingEvaluationView
              result={result}
              onUpdated={(r) => {
                setResult(r);
                setAttempts((prev) => prev.map((a) => (a.id === r.id ? r : a)));
              }}
            />
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button onClick={() => setPhase('intro')} className={`${primaryButton} h-11 px-5`}>
              {attemptsLeft > 0 ? 'Speak again after this feedback' : 'Compare my attempts'}
            </button>
            <Link
              href="/practice/speaking"
              className="inline-flex h-11 items-center justify-center rounded-lg border bg-background px-5 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
            >
              More cue cards
            </Link>
          </div>
        </main>
      </div>
    );
  }

  /* ───────── Intro and attempt history ───────── */
  return (
    <div className="min-h-svh bg-background text-foreground">
      <TopBar subtitle="Speaking Part 2" title={subtitle} />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <BackLink href="/practice/speaking" label="Speaking" />

        <div className="mt-6">
          <CueCard prompt={prompt} />
        </div>

        <section className="mt-6 rounded-2xl border bg-card p-6 text-card-foreground shadow-sm">
          <h2 className="text-lg font-semibold tracking-tight">
            {attemptsLeft > 0 ? `Attempt ${attempts.length + 1} of ${MAX_SPEAKING_ATTEMPTS}` : 'No attempts left'}
          </h2>
          <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
            <li>You get {PREP_SECONDS} seconds to prepare, with an optional notes box.</li>
            <li>
              Then you speak for up to {MAX_SPEAK_SECONDS / 60} minutes. Recording stops on its own, or you can stop
              early.
            </li>
            <li>You need a microphone. Your browser will ask for permission when you start.</li>
            <li>Switching away from this tab during preparation or recording ends your attempt immediately.</li>
            {attempts.length === 1 && <li>This is your last attempt. Use the feedback from attempt 1 to improve.</li>}
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
                  <p className="text-2xl font-bold tabular-nums">{a.evaluation ? a.evaluation.overall.toFixed(1) : '–'}</p>
                </li>
              ))}
            </ul>

            <div className="mt-6 space-y-3">
              {[...attempts].reverse().map((a) => (
                <details key={a.id} className="rounded-xl border bg-card p-5 text-card-foreground">
                  <summary className="cursor-pointer text-sm font-medium">Attempt {a.attemptNumber} feedback</summary>
                  <div className="mt-5">
                    <SpeakingEvaluationView
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