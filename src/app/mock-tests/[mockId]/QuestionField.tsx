'use client';

import type { MockQuestion } from '@/lib/mock-config';

const inputClass =
  'mt-3 h-11 w-full rounded-lg border border-input bg-background px-3 text-base md:text-sm text-foreground ' +
  'placeholder:text-muted-foreground/70 shadow-xs outline-none transition-[color,box-shadow,border-color] ' +
  'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40';

export default function QuestionField({
  fieldKey,
  q,
  number,
  value,
  onChange,
}: {
  fieldKey: string;
  q: MockQuestion;
  number: number;
  value: string;
  onChange: (v: string) => void;
}) {
  const hasOptions = !!q.options && q.options.length > 0;
  const kind = q.kind ?? (hasOptions ? 'multiple_choice' : 'completion');
  const answered = !!value.trim();
  const labelId = `label-${fieldKey}`;

  return (
    <li className="flex gap-3">
      <span
        className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-medium tabular-nums transition-colors ${
          answered ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
        }`}
      >
        {number}
      </span>

      <div className="min-w-0 flex-1">
        <p id={labelId} className="text-[0.9375rem] leading-relaxed">
          {q.text}
        </p>

        {kind === 'multiple_choice' && hasOptions && (
          <div role="radiogroup" aria-labelledby={labelId} className="mt-3 space-y-2">
            {q.options!.map((opt) => (
              <label
                key={opt}
                className="flex cursor-pointer items-start gap-3 rounded-lg border bg-card px-3.5 py-3 text-sm transition-colors hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/40"
              >
                <input
                  type="radio"
                  name={fieldKey}
                  value={opt}
                  checked={value === opt}
                  onChange={() => onChange(opt)}
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
        )}

        {kind === 'matching' && hasOptions && (
          <select
            aria-labelledby={labelId}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={inputClass}
          >
            <option value="">Choose a match…</option>
            {q.options!.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        )}

        {(kind === 'completion' || kind === 'short_answer' || !hasOptions) &&
          kind !== 'multiple_choice' &&
          kind !== 'matching' && (
            <>
              <input
                aria-labelledby={labelId}
                className={inputClass}
                placeholder="Type your answer"
                autoComplete="off"
                value={value}
                onChange={(e) => onChange(e.target.value)}
              />
              {q.wordLimit ? (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  No more than {q.wordLimit} word{q.wordLimit === 1 ? '' : 's'}
                </p>
              ) : null}
            </>
          )}

        {/* A matching or multiple-choice question that lost its options still needs a way to answer */}
        {(kind === 'multiple_choice' || kind === 'matching') && !hasOptions && (
          <input
            aria-labelledby={labelId}
            className={inputClass}
            placeholder="Type your answer"
            autoComplete="off"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        )}
      </div>
    </li>
  );
}