'use client';

import { useRef, useState } from 'react';
import { CircleAlert, CircleCheck, ImageIcon, LoaderCircle } from 'lucide-react';
import { Field, inputClass, textareaClass } from '@/components/admin/ui';
import SubmitButton from '@/components/admin/submit-button';
import { WRITING_CATEGORIES, WRITING_PARTS, type WritingPart } from '@/lib/writing-config';
import { createWritingPrompt, getWritingImageUploadUrl } from './actions';

export default function AddWritingForm() {
  const [part, setPart] = useState<WritingPart>('task1');
  const [imageKey, setImageKey] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [error, setError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  const cfg = WRITING_PARTS[part];
  const categories = WRITING_CATEGORIES.filter((c) => c.part === part);
  const needsImage = part === 'task1';

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError('');
    setImageKey(null);
    setFileName(file.name);
    const contentType = file.type || 'image/png';
    try {
      const { uploadUrl, key } = await getWritingImageUploadUrl(file.name, contentType);
      const res = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': contentType }, body: file });
      if (!res.ok) throw new Error(`Upload failed (${res.status})`);
      setImageKey(key);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleAction(formData: FormData) {
    setError('');
    try {
      await createWritingPrompt(formData);
      formRef.current?.reset();
      setImageKey(null);
      setFileName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the question');
    }
  }

  const picker = uploading
    ? { icon: <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" aria-hidden />, title: 'Uploading…', sub: fileName, tone: '' }
    : uploadError
      ? { icon: <CircleAlert className="size-5 text-destructive" aria-hidden />, title: uploadError, sub: 'Click to choose the file again', tone: 'border-destructive/40 bg-destructive/5' }
      : imageKey
        ? { icon: <CircleCheck className="size-5 text-emerald-500" aria-hidden />, title: fileName, sub: 'Uploaded. Click to replace it.', tone: 'border-emerald-500/40 bg-emerald-500/5' }
        : { icon: <ImageIcon className="size-5" aria-hidden />, title: 'Choose an image', sub: 'PNG, JPG or SVG of the chart, table, map or diagram', tone: '' };

  return (
    <form ref={formRef} action={handleAction} className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Task" htmlFor="taskPart">
          <select
            id="taskPart"
            name="taskPart"
            value={part}
            onChange={(e) => {
              setPart(e.target.value as WritingPart);
              setImageKey(null);
              setFileName('');
            }}
            className={inputClass}
          >
            {(Object.keys(WRITING_PARTS) as WritingPart[]).map((p) => (
              <option key={p} value={p}>
                {WRITING_PARTS[p].label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Category" htmlFor="category">
          <select id="category" name="category" required className={inputClass}>
            {categories.map((c) => (
              <option key={c.slug} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Question number" htmlFor="questionNumber" hint={`1 to ${cfg.perCategory}`}>
          <input id="questionNumber" name="questionNumber" type="number" min={1} max={cfg.perCategory} required className={inputClass} />
        </Field>

        <Field label="Timer (minutes)" htmlFor="timerMinutes">
          <input key={part} id="timerMinutes" name="timerMinutes" type="number" min={1} defaultValue={cfg.timerMinutes} className={inputClass} />
        </Field>
      </div>

      <Field label="Question" htmlFor="prompt" hint="Shown to the student exactly as written, including the standard instruction lines.">
        <textarea id="prompt" name="prompt" required rows={6} placeholder="Paste the full question text" className={textareaClass} />
      </Field>

      {needsImage && (
        <Field label="Visual" htmlFor="image-picker">
          <label
            htmlFor="image-picker"
            className={`flex cursor-pointer items-center gap-4 rounded-xl border border-dashed p-5 transition-colors hover:bg-muted/50 has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/40 ${picker.tone}`}
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted">{picker.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{picker.title}</span>
              <span className="block truncate text-xs text-muted-foreground">{picker.sub}</span>
            </span>
            <input id="image-picker" type="file" accept="image/*" onChange={handleImageChange} disabled={uploading} className="sr-only" />
          </label>
        </Field>
      )}
      <input type="hidden" name="imageKey" value={needsImage ? (imageKey ?? '') : ''} />

      {error && (
        <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-4 border-t pt-6">
        {needsImage && !imageKey && !uploading && <p className="text-sm text-muted-foreground">Upload the visual to create the question.</p>}
        <SubmitButton pendingLabel="Creating…" disabled={uploading || (needsImage && !imageKey)}>
          Create question
        </SubmitButton>
      </div>
    </form>
  );
}