'use client';

import { useRef, useState } from 'react';
import { Field, inputClass, textareaClass } from '@/components/admin/ui';
import SubmitButton from '@/components/admin/submit-button';
import { LIVE_PLATFORMS } from '@/lib/live-platforms';
import { createLiveClassAction } from './actions';

export default function LiveClassForm() {
  const [when, setWhen] = useState('');
  const [error, setError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  async function handleAction(formData: FormData) {
    setError('');
    try {
      await createLiveClassAction(formData);
      formRef.current?.reset();
      setWhen('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not schedule the class');
    }
  }

  return (
    <form ref={formRef} action={handleAction} className="space-y-6">
      <Field label="Title" htmlFor="title">
        <input id="title" name="title" required placeholder="e.g. Speaking Part 2 Live Practice" className={inputClass} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Platform" htmlFor="platform">
          <select id="platform" name="platform" defaultValue="Zoom" className={inputClass}>
            {LIVE_PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Date and time" htmlFor="when" hint="In your local time. Students see it in theirs.">
          <input
            id="when"
            type="datetime-local"
            required
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>
      {/* Sent as epoch milliseconds so the timezone is never ambiguous */}
      <input type="hidden" name="scheduledAt" value={when ? String(new Date(when).getTime()) : ''} />

      <Field label="Meeting link" htmlFor="meetingUrl">
        <input
          id="meetingUrl"
          name="meetingUrl"
          type="url"
          required
          placeholder="https://zoom.us/j/..."
          className={inputClass}
        />
      </Field>

      <Field label="Details" htmlFor="details" hint="Optional. Meeting ID, passcode, instructions.">
        <textarea id="details" name="details" rows={3} placeholder="Meeting ID: 123 456 789&#10;Passcode: ielts" className={textareaClass} />
      </Field>

      {error && (
        <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex justify-end border-t pt-6">
        <SubmitButton pendingLabel="Scheduling…">Schedule class</SubmitButton>
      </div>
    </form>
  );
}