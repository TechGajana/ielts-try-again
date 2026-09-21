'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { startListeningAttempt, submitListeningAttempt } from './actions';

export default function ListeningAttemptClient({ task, questionType }: { task: any; questionType: string }) {
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<{ score: number; total: number } | null>(null);
  const [audioStarted, setAudioStarted] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [starting, setStarting] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const router = useRouter();

  async function handleStart() {
    setStarting(true);
    try {
      const { attemptId, startTime, audioUrl } = await startListeningAttempt(
        task.id,
        questionType,
        task.audioKey
      );
      setAttemptId(attemptId);
      setAudioUrl(audioUrl);
      const elapsed = (Date.now() - new Date(startTime).getTime()) / 1000;
      setSecondsLeft(Math.max(0, Math.floor(task.timerMinutes * 60 - elapsed)));
      setStarted(true);
    } catch (err: any) {
      setAudioError(err.message || 'Failed to start task.');
      setStarting(false);
    }
  }

  // Once audioUrl is set AND the audio element exists, try to play.
  // This still runs inside the same click-triggered render cycle, so browsers
  // generally still count it as a user-gesture-driven play() call.
  useEffect(() => {
    if (audioUrl && audioRef.current && !audioStarted) {
      audioRef.current
        .play()
        .then(() => setAudioStarted(true))
        .catch((err) => {
          console.error('Autoplay blocked:', err);
          setAudioError('Tap the audio area below to begin playback.');
        });
    }
  }, [audioUrl, audioStarted]);

  const handleSubmit = useCallback(async () => {
    if (!attemptId || submitted) return;
    const result = await submitListeningAttempt(attemptId, task.id, answers);
    setSubmitted(result);
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

  // Manual fallback play trigger, in case the automatic .play() call above
  // was blocked. Clicking this div is itself a user gesture, so it will work.
  function manualPlayFallback() {
    audioRef.current
      ?.play()
      .then(() => {
        setAudioStarted(true);
        setAudioError(null);
      })
      .catch((err) => console.error('Still blocked:', err));
  }

  // ---- Gate screen: shown before the student clicks Start ----
  if (!started) {
    return (
      <div className="p-8 text-center max-w-md mx-auto mt-16">
        <h1 className="text-xl font-semibold mb-4">
          {questionType} — Task {task.taskNumber}
        </h1>
        <p className="mb-6 text-gray-600 text-sm">
          Once you click Start, the audio will begin playing automatically and the
          {' '}{task.timerMinutes}-minute timer will start. You cannot pause, rewind,
          or replay the audio.
        </p>
        {audioError && <p className="text-red-600 text-sm mb-4">{audioError}</p>}
        <button
          onClick={handleStart}
          disabled={starting}
          className="bg-black text-white rounded px-6 py-3 disabled:opacity-50"
        >
          {starting ? 'Starting...' : 'Start Task'}
        </button>
      </div>
    );
  }

  if (secondsLeft === null) return <div className="p-8">Loading...</div>;

  // ---- Result screen ----
  if (submitted) {
    return (
      <div className="p-8">
        <h1 className="text-xl font-semibold mb-4">
          Score: {submitted.score}/{submitted.total}
        </h1>
        {task.questions.map((q: any) => {
          const isCorrect = answers[q.id] === task.correctAnswers[q.id];
          return (
            <div key={q.id} className="mb-3 border-b pb-2">
              <p>{q.text}</p>
              {isCorrect ? (
                <p className="text-green-600">Correct</p>
              ) : (
                <>
                  <p className="text-red-600">Your Answer: {answers[q.id] || '(no answer)'}</p>
                  <p className="text-gray-700">Correct Answer: {task.correctAnswers[q.id]}</p>
                </>
              )}
            </div>
          );
        })}
        <button
          onClick={() => router.push('/practice/listening')}
          className="mt-4 bg-black text-white rounded px-4 py-2"
        >
          Back to Listening
        </button>
      </div>
    );
  }

  // ---- Active attempt screen ----
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-semibold">
          {questionType} — Task {task.taskNumber}
        </h1>
        <div className="text-lg font-mono bg-gray-100 px-3 py-1 rounded">
          {mins}:{secs.toString().padStart(2, '0')}
        </div>
      </div>

      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onError={() => setAudioError('Audio failed to load.')}
        />
      )}

      <div
        onClick={!audioStarted ? manualPlayFallback : undefined}
        className={`mb-4 p-3 rounded text-sm ${
          audioStarted ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700 cursor-pointer'
        }`}
      >
        {audioError
          ? `${audioError} (click here)`
          : audioStarted
          ? '🔊 Audio is playing...'
          : 'Preparing audio...'}
      </div>

      <p className="mb-4 text-sm text-gray-600">{task.instructions}</p>
      <div>
        {task.questions.map((q: any) => (
          <div key={q.id} className="mb-4">
            <p className="mb-2">{q.text}</p>
            {q.options.map((opt: string) => (
              <label key={opt} className="block">
                <input
                  type="radio"
                  name={q.id}
                  value={opt}
                  checked={answers[q.id] === opt}
                  onChange={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                  className="mr-2"
                />
                {opt}
              </label>
            ))}
          </div>
        ))}
        <button onClick={handleSubmit} className="bg-black text-white rounded px-4 py-2">
          Submit
        </button>
      </div>
    </div>
  );
}