'use client';

import { useState, useTransition } from 'react';
import { LoaderCircle, Pencil } from 'lucide-react';
import { inputClass } from '@/components/admin/ui';
import { updateStudent } from './actions';

export default function EditStudentDialog({
  uid,
  username,
  email,
}: {
  uid: string;
  username: string;
  email: string;
}) {
  const [open, setOpen] = useState(false);
  const [usernameValue, setUsernameValue] = useState(username);
  const [emailValue, setEmailValue] = useState(email);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Edit ${username}`}
        className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
      >
        <Pencil className="size-4" aria-hidden />
      </button>
    );
  }

  function handleSave() {
    setError('');
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set('username', usernameValue);
        formData.set('email', emailValue);
        await updateStudent(uid, formData);
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save changes');
      }
    });
  }

  return (
    <div
      role="dialog"
      aria-label={`Edit ${username}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={() => !pending && setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border bg-card p-6 text-card-foreground shadow-lg"
      >
        <h2 className="text-base font-semibold">Edit student</h2>

        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="edit-username" className="mb-1.5 block text-sm font-medium">
              Username
            </label>
            <input
              id="edit-username"
              value={usernameValue}
              onChange={(e) => setUsernameValue(e.target.value)}
              disabled={pending}
              autoComplete="off"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="edit-email" className="mb-1.5 block text-sm font-medium">
              Email
            </label>
            <input
              id="edit-email"
              type="email"
              value={emailValue}
              onChange={(e) => setEmailValue(e.target.value)}
              disabled={pending}
              autoComplete="off"
              className={inputClass}
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Changing this updates their login email too. The OTP will go to the new address next time.
            </p>
          </div># end
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-lg border border-destructive/20 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={pending}
            className="h-10 rounded-lg border bg-background px-4 text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={pending}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-60"
          >
            {pending && <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}