'use client';

import { useEffect, useState, useTransition } from 'react';
import { LoaderCircle, Pencil, X } from 'lucide-react';
import { READING_QUESTION_TYPES } from '@/lib/question-types';
import { Field, QuestionsSection, TaskBasics, inputClass, textareaClass } from '@/components/admin/ui';
import { getReadingTask, updateReadingTask } from './actions';

type TaskDetail = Awaited<ReturnType<typeof getReadingTask>>;

export default function EditReadingTaskDialog({ taskId, label }: { taskId: string; label: string }) {
  const [open, setOpen] = useState(false);
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setTask(null);
    setLoadError('');
    getReadingTask(taskId)
      .then(setTask)
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Could not load task'));
  }, [open, taskId]);

  function handleSubmit(formData: FormData) {
    setSaveError('');
    startTransition(async () => {
      try {
        await updateReadingTask(taskId, formData);
        setOpen(false);
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : 'Could not save changes');
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Edit ${label}`}
        className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
      >
        <Pencil className="size-4" aria-hidden />
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-label={`Edit ${label}`}
className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={() => !pending && setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border bg-card text-card-foreground shadow-lg"
      >
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-base font-semibold">Edit {label}</h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={pending}
            aria-label="Close"
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

       <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {loadError && (
            <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
              {loadError}
            </p>
          )}

          {!task && !loadError && (
            <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
              Loading task…
            </div>
          )}

          {task && (
            <form action={handleSubmit} className="space-y-8">
              <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
                <Field label="Question type" htmlFor="edit-questionType">
                  <select
                    id="edit-questionType"
                    name="questionType"
                    required
                    defaultValue={task.questionType}
                    className={inputClass}
                  >
                    {READING_QUESTION_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Task number" htmlFor="edit-taskNumber">
                  <input
                    id="edit-taskNumber"
                    name="taskNumber"
                    type="number"
                    min={1}
                    required
                    defaultValue={task.taskNumber}
                    className={inputClass}
                  />
                </Field>
                <Field label="Timer (minutes)" htmlFor="edit-timerMinutes">
                  <input
                    id="edit-timerMinutes"
                    name="timerMinutes"
                    type="number"
                    min={1}
                    defaultValue={task.timerMinutes}
                    className={inputClass}
                  />
                </Field>
              </div>

              <Field label="Passage" htmlFor="edit-passage">
                <textarea
                  id="edit-passage"
                  name="passage"
                  required
                  rows={10}
                  defaultValue={task.passage}
                  className={textareaClass}
                />
              </Field>

              <Field label="Instructions" htmlFor="edit-instructions">
                <input
                  id="edit-instructions"
                  name="instructions"
                  required
                  defaultValue={task.instructions}
                  className={inputClass}
                />
              </Field>

              {/* Pre-filled Q1–Q10, matching the field names updateReadingTask reads */}
              <section aria-labelledby="edit-questions-heading">
                <h2 id="edit-questions-heading" className="text-base font-semibold">
                  Questions
                </h2>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  Leave a question&apos;s text blank to remove it. Options are comma-separated.
                </p>

                <ol className="mt-5 grid gap-4 md:grid-cols-2">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
                    const q = task.questions[n - 1];
                    const qid = `q${n}`;
                    return (
                      <li key={n} className="rounded-xl border bg-background p-4">
                        <div className="mb-3 flex items-center gap-2">
                          <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs font-medium tabular-nums">
                            {n}
                          </span>
                          <span className="text-sm font-medium">Question {n}</span>
                        </div>
                        <div className="space-y-2.5">
                          <input
                            name={`${qid}_text`}
                            placeholder="Question text"
                            defaultValue={q?.text ?? ''}
                            className={inputClass}
                          />
                          <input
                            name={`${qid}_options`}
                            placeholder="Options, comma-separated (optional)"
                            defaultValue={q?.options?.join(', ') ?? ''}
                            className={inputClass}
                          />
                          <input
                            name={`${qid}_answer`}
                            placeholder="Correct answer"
                            defaultValue={task.correctAnswers[qid] ?? ''}
                            className={inputClass}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </section>

              {saveError && (
                <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
                  {saveError}
                </p>
              )}

              <div className="flex justify-end gap-2 border-t pt-6">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={pending}
                  className="h-10 rounded-lg border bg-background px-4 text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-60"
                >
                  {pending && <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />}
                  Save changes
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}