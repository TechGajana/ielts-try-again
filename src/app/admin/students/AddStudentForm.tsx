'use client';

import { useRef, useState } from 'react';
import { Check, Copy, RefreshCw } from 'lucide-react';
import { Field, inputClass } from '@/components/admin/ui';
import SubmitButton from '@/components/admin/submit-button';
import AccessPicker, { type AccessGroup } from './AccessPicker';
import { createStudent } from './actions';

function randomPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export default function AddStudentForm({
  organizations,
  accessGroups,
}: {
  organizations: { id: string; name: string }[];
  accessGroups: AccessGroup[];
}) {
  const [password, setPassword] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const formRef = useRef<HTMLFormElement>(null);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAction(formData: FormData) {
    setError('');
    try {
      await createStudent(formData);
      formRef.current?.reset();
      setPassword('');
      setSelected(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create student');
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
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Username" htmlFor="username" hint="What the student types to log in.">
          <input id="username" name="username" required autoComplete="off" placeholder="e.g. arjun.k" className={inputClass} />
        </Field>

        <Field label="Email" htmlFor="email" hint="Used to send the one-time login code.">
          <input id="email" name="email" type="email" required autoComplete="off" placeholder="e.g. arjun@example.com" className={inputClass} />
        </Field>
      </div>

      <Field label="Institute" htmlFor="organizationId" hint="Optional. Shows that institute's logo on the student's dashboard.">
        <select id="organizationId" name="organizationId" defaultValue="" className={inputClass}>
          <option value="">No institute</option>
          {organizations.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Password" htmlFor="password" hint="At least 8 characters. Share this with the student.">
        <div className="flex gap-2">
          <input
            id="password"
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
            {copied ? <Check className="size-4 text-emerald-500" aria-hidden /> : <Copy className="size-4" aria-hidden />}
          </button>
        </div>
      </Field>

      <div>
        <p className="mb-1.5 text-sm font-medium">Course access</p>
        <p className="mb-2.5 text-xs text-muted-foreground">
          Optional. The student only sees what is ticked here. You can change this later from the Students table.
        </p>
        <div className="max-h-64 overflow-y-auto rounded-lg border p-3.5">
          <AccessPicker groups={accessGroups} selected={selected} onToggle={toggle} />
        </div>
        {[...selected].map((id) => (
          <input key={id} type="hidden" name="courseIds" value={id} />
        ))}
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex justify-end border-t pt-5">
        <SubmitButton pendingLabel="Creating…">Create student</SubmitButton>
      </div>
    </form>
  );
}