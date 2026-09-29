'use client';

import { useRef, useState } from 'react';
import { Field, inputClass } from '@/components/admin/ui';
import SubmitButton from '@/components/admin/submit-button';
import { MAX_LISTENING_PARTS, MAX_READING_PARTS, TOTAL_MOCKS } from '@/lib/mock-config';
import { createMockTest } from './actions';

interface Option {
  id: string;
  label: string;
}

function PickList({
  prefix,
  count,
  noun,
  options,
}: {
  prefix: string;
  count: number;
  noun: string;
  options: Option[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {Array.from({ length: count }, (_, i) => (
        <Field key={i} label={`${noun} ${i + 1}${i === 0 ? '' : ' (optional)'}`} htmlFor={`${prefix}${i}`}>
          <select id={`${prefix}${i}`} name={`${prefix}${i}`} required={i === 0} defaultValue="" className={inputClass}>
            <option value="">{i === 0 ? 'Choose a task…' : 'None'}</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
      ))}
    </div>
  );
}

export default function AddMockForm({
  listening,
  reading,
  task1,
  task2,
}: {
  listening: Option[];
  reading: Option[];
  task1: Option[];
  task2: Option[];
}) {
  const [error, setError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  async function handleAction(formData: FormData) {
    setError('');
    const res = await createMockTest(formData);
    if (res.ok) formRef.current?.reset();
    else setError(res.error ?? 'Could not create the mock test.');
  }

  return (
    <form ref={formRef} action={handleAction} className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,3fr)]">
        <Field label="Mock number" htmlFor="mockNumber" hint={`1 to ${TOTAL_MOCKS}`}>
          <input id="mockNumber" name="mockNumber" type="number" min={1} max={TOTAL_MOCKS} required className={inputClass} />
        </Field>
        <Field label="Title" htmlFor="title" hint="Optional. Defaults to “Mock Test N”.">
          <input id="title" name="title" placeholder="e.g. Mock Test 1" className={inputClass} />
        </Field>
      </div>

      <section>
        <h3 className="text-base font-semibold">Listening</h3>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">
          One task per part, played in this order. Each task&apos;s audio plays once.
        </p>
        <PickList prefix="l" count={MAX_LISTENING_PARTS} noun="Part" options={listening} />
      </section>

      <section>
        <h3 className="text-base font-semibold">Reading</h3>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">One task per passage.</p>
        <PickList prefix="r" count={MAX_READING_PARTS} noun="Passage" options={reading} />
      </section>

      <section>
        <h3 className="text-base font-semibold">Writing</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Task 1 prompt" htmlFor="w1">
            <select id="w1" name="w1" required defaultValue="" className={inputClass}>
              <option value="">Choose a prompt…</option>
              {task1.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Task 2 prompt" htmlFor="w2">
            <select id="w2" name="w2" required defaultValue="" className={inputClass}>
              <option value="">Choose a prompt…</option>
              {task2.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      <p className="rounded-lg bg-muted/60 p-3.5 text-xs leading-relaxed text-muted-foreground">
        The tasks are copied into the mock when you create it. Editing or deleting the original practice tasks later
        won&apos;t change this mock.
      </p>

      {error && (
        <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex justify-end border-t pt-6">
        <SubmitButton pendingLabel="Creating…">Create mock test</SubmitButton>
      </div>
    </form>
  );
}