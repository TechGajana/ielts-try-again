'use client';

import { useRef, useState } from 'react';
import { Field, inputClass, textareaClass } from '@/components/admin/ui';
import SubmitButton from '@/components/admin/submit-button';
import { DIFFICULTIES, TOTAL_CARDS } from '@/lib/speaking-config';
import { createSpeakingPrompt } from './actions';

export default function AddSpeakingForm() {
  const [error, setError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  async function handleAction(formData: FormData) {
    setError('');
    try {
      await createSpeakingPrompt(formData);
      formRef.current?.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the cue card');
    }
  }

  return (
    <form ref={formRef} action={handleAction} className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Card number" htmlFor="cardNumber" hint={`1 to ${TOTAL_CARDS}`}>
          <input id="cardNumber" name="cardNumber" type="number" min={1} max={TOTAL_CARDS} required className={inputClass} />
        </Field>
        <Field label="Difficulty" htmlFor="difficulty" hint="For your own balance only. Students never see this.">
          <select id="difficulty" name="difficulty" required className={inputClass}>
            {DIFFICULTIES.map((d) => (
              <option key={d.key} value={d.key}>
                {d.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Topic" htmlFor="topic">
        <input id="topic" name="topic" required placeholder="e.g. Describe a book that you have enjoyed reading." className={inputClass} />
      </Field>

      <Field label="Bullet prompts" htmlFor="bullets" hint="One per line, in the order students see them. Include the closing line, such as “and explain why you enjoyed it”.">
        <textarea
          id="bullets"
          name="bullets"
          required
          rows={6}
          placeholder={'what the book was\nwhen you read it\nwhat it was about\nand explain why you enjoyed it'}
          className={textareaClass}
        />
      </Field>

      {error && (
        <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex justify-end border-t pt-6">
        <SubmitButton pendingLabel="Creating…">Create cue card</SubmitButton>
      </div>
    </form>
  );
}