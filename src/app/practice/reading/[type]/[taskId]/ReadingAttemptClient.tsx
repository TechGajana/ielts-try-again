'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { startAttempt, submitAttempt } from './actions';

export default function ReadingAttemptClient({ task, questionType }: { task: any; questionType: string }) {
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<{ score: number; total: number } | null>(null);
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
    if (!attemptId || submitted) return;
    const result = await submitAttempt(attemptId, task.id, answers);
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

  if (secondsLeft === null) return <div className="p-8">Loading...</div>;

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
        <button onClick={() => router.push('/practice/reading')} className="mt-4 bg-black text-white rounded px-4 py-2">
          Back to Reading
        </button>
      </div>
    );
  }

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

      <div className="grid grid-cols-2 gap-8">
        <div className="prose max-w-none whitespace-pre-wrap">{task.passage}</div>
        <div>
          <p className="mb-4 text-sm text-gray-600">{task.instructions}</p>
          {task.questions.map((q: any) => (
            <div key={q.id} className="mb-4">
              <p className="mb-2">{q.text}</p>
              {q.options ? (
                q.options.map((opt: string) => (
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
                ))
              ) : (
                <input
                  className="border rounded p-2 w-full"
                  value={answers[q.id] || ''}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                />
              )}
            </div>
          ))}
          <button onClick={handleSubmit} className="bg-black text-white rounded px-4 py-2">
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}