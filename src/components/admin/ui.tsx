import type { ReactNode } from 'react';
import { ChevronDown, Plus } from 'lucide-react';

const inputBase =
  'w-full rounded-lg border border-input bg-background px-3 text-base md:text-sm text-foreground ' +
  'placeholder:text-muted-foreground/70 shadow-xs outline-none transition-[color,box-shadow,border-color] ' +
  'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 ' +
  'disabled:cursor-not-allowed disabled:opacity-60';

export const inputClass = `${inputBase} h-11`;
export const textareaClass = `${inputBase} min-h-40 py-3 leading-relaxed`;

export function PageHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-8 max-w-2xl">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Collapsible "add new" card used above the task lists */
export function AddTaskPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="group mb-10 overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-4 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-3 font-medium">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Plus className="size-4" aria-hidden />
          </span>
          {title}
        </span>
        <ChevronDown
          className="size-5 text-muted-foreground transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="border-t p-6">{children}</div>
    </details>
  );
}

/** Question type, task number and timer: the same three fields on both forms */
export function TaskBasics({ types, defaultTimer }: { types: readonly string[]; defaultTimer: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
      <Field label="Question type" htmlFor="questionType">
        <select id="questionType" name="questionType" required className={inputClass}>
          {types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Task number" htmlFor="taskNumber" hint="Usually 1 to 10">
        <input
          id="taskNumber"
          name="taskNumber"
          type="number"
          min={1}
          required
          placeholder="e.g. 3"
          className={inputClass}
        />
      </Field>
      <Field label="Timer (minutes)" htmlFor="timerMinutes">
        <input
          id="timerMinutes"
          name="timerMinutes"
          type="number"
          min={1}
          defaultValue={defaultTimer}
          className={inputClass}
        />
      </Field>
    </div>
  );
}

/** Q1 to Q10. Field names (q1_text, q1_options, q1_answer ...) match what the server actions read. */
export function QuestionsSection() {
  return (
    <section aria-labelledby="questions-heading">
      <h2 id="questions-heading" className="text-base font-semibold">
        Questions
      </h2>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Fill in up to 10. Leave a question&apos;s text blank to skip it. For multiple choice, list the options
        separated by commas. Leave options blank when students type their answer.
      </p>

      <ol className="mt-5 grid gap-4 md:grid-cols-2">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <li key={n} className="rounded-xl border bg-background p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs font-medium tabular-nums">
                {n}
              </span>
              <span className="text-sm font-medium">Question {n}</span>
            </div>

            <div className="space-y-2.5">
              <label htmlFor={`q${n}_text`} className="sr-only">
                Question {n} text
              </label>
              <input id={`q${n}_text`} name={`q${n}_text`} placeholder="Question text" className={inputClass} />

              <label htmlFor={`q${n}_options`} className="sr-only">
                Question {n} options
              </label>
              <input
                id={`q${n}_options`}
                name={`q${n}_options`}
                placeholder="Options, comma-separated (optional)"
                className={inputClass}
              />

              <label htmlFor={`q${n}_answer`} className="sr-only">
                Question {n} correct answer
              </label>
              <input
                id={`q${n}_answer`}
                name={`q${n}_answer`}
                placeholder="Correct answer"
                className={inputClass}
              />
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}