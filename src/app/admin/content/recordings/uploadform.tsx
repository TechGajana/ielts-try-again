'use client';

import { useRef, useState } from 'react';
import { CircleAlert, CircleCheck, LoaderCircle, Upload } from 'lucide-react';
import { Field, inputClass, textareaClass } from '@/components/admin/ui';
import SubmitButton from '@/components/admin/submit-button';
import { createRecordingAction, getRecordingUploadUrl } from './actions';

export default function UploadForm() {
  const [videoKey, setVideoKey] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [error, setError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError('');
    setVideoKey(null);
    setFileName(file.name);

    const contentType = file.type || 'video/mp4';

    try {
      const { uploadUrl, key } = await getRecordingUploadUrl(file.name, contentType);
      const res = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': contentType }, body: file });
      if (!res.ok) throw new Error(`Upload failed (${res.status})`);
      setVideoKey(key);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleAction(formData: FormData) {
    setError('');
    try {
      await createRecordingAction(formData);
      formRef.current?.reset();
      setVideoKey(null);
      setFileName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the recording');
    }
  }

  const picker = uploading
    ? { icon: <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" aria-hidden />, title: 'Uploading…', sub: fileName, tone: '' }
    : uploadError
      ? { icon: <CircleAlert className="size-5 text-destructive" aria-hidden />, title: uploadError, sub: 'Click to choose the file again', tone: 'border-destructive/40 bg-destructive/5' }
      : videoKey
        ? { icon: <CircleCheck className="size-5 text-emerald-500" aria-hidden />, title: fileName, sub: 'Uploaded. Click to replace it.', tone: 'border-emerald-500/40 bg-emerald-500/5' }
        : { icon: <Upload className="size-5" aria-hidden />, title: 'Choose a video file', sub: 'MP4 or WEBM', tone: '' };

  return (
    <form ref={formRef} action={handleAction} className="space-y-6">
      <Field label="Title" htmlFor="title">
        <input id="title" name="title" required placeholder="e.g. Band 7+ Writing Task 2 Strategy" className={inputClass} />
      </Field>

      <Field label="Description" htmlFor="description" hint="Optional. Shown to students above the video.">
        <textarea id="description" name="description" rows={3} placeholder="What this recording covers" className={textareaClass} />
      </Field>

      <Field label="Video file" htmlFor="video-picker">
        <label
          htmlFor="video-picker"
          className={`flex cursor-pointer items-center gap-4 rounded-xl border border-dashed p-5 transition-colors hover:bg-muted/50 has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/40 ${picker.tone}`}
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted">{picker.icon}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{picker.title}</span>
            <span className="block truncate text-xs text-muted-foreground">{picker.sub}</span>
          </span>
          <input id="video-picker" type="file" accept="video/mp4,video/webm" onChange={handleFileChange} disabled={uploading} className="sr-only" />
        </label>
      </Field>
      <input type="hidden" name="videoKey" value={videoKey ?? ''} />

      {error && (
        <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-4 border-t pt-6">
        {!videoKey && !uploading && <p className="text-sm text-muted-foreground">Upload a video to create the recording.</p>}
        <SubmitButton pendingLabel="Creating…" disabled={!videoKey || uploading}>
          Create recording
        </SubmitButton>
      </div>
    </form>
  );
}