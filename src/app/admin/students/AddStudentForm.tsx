'use client';

import { useRef, useState } from 'react';
import { Check, Copy, RefreshCw } from 'lucide-react';
import { Field, inputClass } from '@/components/admin/ui';
import SubmitButton from '@/components/admin/submit-button';
import { createAdmin } from './actions';

function randomPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export default function AddAdminForm() {
  const [password, setPassword] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  async function handleAction(formData: FormData) {
    setError('');
    try {
      await createAdmin(formData);
      formRef.current?.reset();
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create admin');
    }
  }

  async function copyPassword() {
    if (!password) return;
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <form ref={formRef} action={handleAction} className="space-y-5">
      <Field label="Email" htmlFor="admin-email" hint="Admins log in with this email directly, no OTP username lookup.">
        <input
          id="admin-email"
          name="email"
          type="email"
          required
          autoComplete="off"
          placeholder="e.g. teacher@ieltstryagain.com"
          className={inputClass}
        />
      </Field>

      <Field label="Password" htmlFor="admin-password" hint="At least 8 characters. Share this with the new admin.">
        <div className="flex gap-2">
          <input
            id="admin-password"
            name="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="off"
            placeholder="Set or generate a password"
            className={inputClass}
          />
          <button
            type="button"
            onClick={() => setPassword(randomPassword())}
            aria-label="Generate password"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
          >
            <RefreshCw className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={copyPassword}
            disabled={!password}
            aria-label="Copy password"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:opacity-40"
          >
            {copied ? (
              <Check className="size-4 text-emerald-500" aria-hidden />
            ) : (
              <Copy className="size-4" aria-hidden />
            )}
          </button>
        </div>
      </Field>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/20 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      <div className="flex justify-end border-t pt-5">
        <SubmitButton pendingLabel="Creating…">Create admin</SubmitButton>
      </div>
    </form>
  );
}