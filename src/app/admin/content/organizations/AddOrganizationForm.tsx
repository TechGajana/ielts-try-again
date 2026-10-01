'use client';

import { useRef, useState } from 'react';
import { CircleAlert, CircleCheck, ImageIcon, LoaderCircle } from 'lucide-react';
import { Field, inputClass } from '@/components/admin/ui';
import SubmitButton from '@/components/admin/submit-button';
import { createOrganizationAction, getOrgLogoUploadUrl } from './actions';

export default function AddOrganizationForm() {
  const [logoKey, setLogoKey] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [error, setError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setUploadError('Please upload a PNG, JPG or WEBP image.');
      return;
    }

    setUploading(true);
    setUploadError('');
    setLogoKey(null);
    setFileName(file.name);
    try {
      const { uploadUrl, key } = await getOrgLogoUploadUrl(file.name, file.type);
      const res = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
      if (!res.ok) throw new Error(`Upload failed (${res.status})`);
      setLogoKey(key);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleAction(formData: FormData) {
    setError('');
    try {
      await createOrganizationAction(formData);
      formRef.current?.reset();
      setLogoKey(null);
      setFileName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the institute');
    }
  }

  const picker = uploading
    ? { icon: <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" aria-hidden />, title: 'Uploading…', sub: fileName, tone: '' }
    : uploadError
      ? { icon: <CircleAlert className="size-5 text-destructive" aria-hidden />, title: uploadError, sub: 'Click to choose the file again', tone: 'border-destructive/40 bg-destructive/5' }
      : logoKey
        ? { icon: <CircleCheck className="size-5 text-emerald-500" aria-hidden />, title: fileName, sub: 'Uploaded. Click to replace it.', tone: 'border-emerald-500/40 bg-emerald-500/5' }
        : { icon: <ImageIcon className="size-5" aria-hidden />, title: 'Choose a logo', sub: 'PNG, JPG or WEBP', tone: '' };

  return (
    <form ref={formRef} action={handleAction} className="space-y-6">
      <Field label="Institute name" htmlFor="name">
        <input id="name" name="name" required placeholder="e.g. Crescent Language Academy" className={inputClass} />
      </Field>

      <Field label="Logo" htmlFor="logo-picker">
        <label
          htmlFor="logo-picker"
          className={`flex cursor-pointer items-center gap-4 rounded-xl border border-dashed p-5 transition-colors hover:bg-muted/50 has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/40 ${picker.tone}`}
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted">{picker.icon}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{picker.title}</span>
            <span className="block truncate text-xs text-muted-foreground">{picker.sub}</span>
          </span>
          <input id="logo-picker" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogoChange} disabled={uploading} className="sr-only" />
        </label>
      </Field>
      <input type="hidden" name="logoKey" value={logoKey ?? ''} />

      {error && (
        <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-4 border-t pt-6">
        {!logoKey && !uploading && <p className="text-sm text-muted-foreground">Upload a logo to create the institute.</p>}
        <SubmitButton pendingLabel="Creating…" disabled={!logoKey || uploading}>
          Create institute
        </SubmitButton>
      </div>
    </form>
  );
}