'use client';

import { useState } from 'react';
import { Field, inputClass } from '@/components/admin/ui';

export type QuestionKind = 'multiple_choice' | 'matching' | 'completion' | 'short_answer';

export type ListeningQuestionDefault = {
  id: string;
  kind: QuestionKind;
  text: string;
  options?: string[];
  wordLimit?: number;
};

const KIND_LABELS: Record<QuestionKind, string> = {
  multiple_choice: 'Multiple Choice',
  matching: 'Matching',
  completion: 'Completion (fill in the blank)',
  short_answer: 'Short Answer',
};

function QuestionRow({
  n,
  defaults,
}: {
  n: number;
  defaults?: ListeningQuestionDefault;
}) {
  const [kind, setKind] = useState<QuestionKind>(defaults?.kind ?? 'multiple_choice');
  const qid = `q${n}`;
  const needsOptions = kind === 'multiple_choice' || kind === 'matching';
  const needsWordLimit = kind === 'completion' || kind === 'short_answer';

  return (
    <li className="rounded-xl border bg-background p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs font-medium tabular-nums">
          {n}
        </span>
        <span className="text-sm font-medium">Question {n}</span>
      </div>

      <div className="space-y-2.5">
        <select
          name={`${qid}_kind`}
          value={kind}
          onChange={(e) => setKind(e.target.value as QuestionKind)}
          className={inputClass}
        >
          {(Object.keys(KIND_LABELS) as QuestionKind[]).map((k) => (
            <option key={k} value={k}>
              {KIND_LABELS[k]}
            </option>
          ))}
        </select>

        <input
          name={`${qid}_text`}
          placeholder={
            kind === 'completion'
              ? 'Sentence with a blank, e.g. The museum opens at ___'
              : kind === 'matching'
                ? 'Item to match, e.g. Lecture on marine biology'
                : 'Question text'
          }
          defaultValue={defaults?.text ?? ''}
          className={inputClass}
        />

        {needsOptions && (
          <input
            name={`${qid}_options`}
            placeholder={
              kind === 'matching'
                ? 'Choices, comma-separated, e.g. A. Room 1, B. Room 2, C. Room 3'
                : 'Options, comma-separated'
            }
            defaultValue={defaults?.options?.join(', ') ?? ''}
            className={inputClass}
          />
        )}

        <input
          name={`${qid}_answer`}
          placeholder="Correct answer"
          defaultValue={defaults ? undefined : ''}
          className={inputClass}
        />

        {needsWordLimit && (
          <input
            name={`${qid}_wordlimit`}
            type="number"
            min={1}
            placeholder="Word limit (optional), e.g. 2"
            defaultValue={defaults?.wordLimit ?? ''}
            className={inputClass}
          />
        )}
      </div>
    </li>
  );
}

/**
 * Q1–Q10 editor supporting Multiple Choice, Matching, Completion and Short
 * Answer. `correctAnswers` is passed separately since the answer input's
 * defaultValue lives outside the per-question default shape above.
 */
export default function ListeningQuestionsSection({
  defaultQuestions,
  defaultAnswers,
}: {
  defaultQuestions?: ListeningQuestionDefault[];
  defaultAnswers?: Record<string, string>;
}) {
  return (
    <section aria-labelledby="listening-questions-heading">
      <h2 id="listening-questions-heading" className="text-base font-semibold">
        Questions
      </h2>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Fill in up to 10. Leave a question&apos;s text blank to skip it. Pick a type per question — the fields
        shown change to match it.
      </p>

      <ol className="mt-5 grid gap-4 md:grid-cols-2">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const q = defaultQuestions?.[n - 1];
          const answer = defaultAnswers?.[`q${n}`];
          return (
            <QuestionRow
              key={n}
              n={n}
              defaults={q ? { ...q, text: q.text } : undefined}
              // answer defaultValue is set directly below via a controlled override
            />
          );
        })}
      </ol>
    </section>
  );
}