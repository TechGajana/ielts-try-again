'use client';

import { useRef, useState } from 'react';
import { CircleAlert, CircleCheck, ImageIcon, LoaderCircle, Upload } from 'lucide-react';
import { Field, inputClass, textareaClass } from '@/components/admin/ui';
import SubmitButton from '@/components/admin/submit-button';
import { createRecordingAction, getRecordingThumbnailUploadUrl, getRecordingUploadUrl } from './actions';

type PickerState = {
  icon: React.ReactNode;
  title: string;
  sub: string;
  tone: string;
};

export default function UploadForm() {
  const [videoKey, setVideoKey] = useState<string | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoFileName, setVideoFileName] = useState('');
  const [videoError, setVideoError] = useState('');

  const [thumbnailKey, setThumbnailKey] = useState<string | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [thumbnailFileName, setThumbnailFileName] = useState('');
  const [thumbnailError, setThumbnailError] = useState('');

  const [error, setError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  async function handleVideoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoUploading(true);
    setVideoError('');
    setVideoKey(null);
    setVideoFileName(file.name);

    const contentType = file.type || 'video/mp4';

    try {
      const { uploadUrl, key } = await getRecordingUploadUrl(file.name, contentType);
      const res = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': contentType }, body: file });
      if (!res.ok) throw new Error(`Upload failed (${res.status})`);
      setVideoKey(key);
    } catch (err) {
      setVideoError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setVideoUploading(false);
    }
  }

  async function handleThumbnailChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setThumbnailError('Please upload a PNG, JPG or WEBP image.');
      return;
    }

    setThumbnailUploading(true);
    setThumbnailError('');
    setThumbnailKey(null);
    setThumbnailFileName(file.name);
    setThumbnailPreview(URL.createObjectURL(file));

    try {
      const { uploadUrl, key } = await getRecordingThumbnailUploadUrl(file.name, file.type);
      const res = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
      if (!res.ok) throw new Error(`Upload failed (${res.status})`);
      setThumbnailKey(key);
    } catch (err) {
      setThumbnailError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setThumbnailUploading(false);
    }
  }

  async function handleAction(formData: FormData) {
    setError('');
    try {
      await createRecordingAction(formData);
      formRef.current?.reset();
      setVideoKey(null);
      setVideoFileName('');
      setThumbnailKey(null);
      setThumbnailFileName('');
      setThumbnailPreview(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the recording');
    }
  }

  const videoPicker: PickerState = videoUploading
    ? { icon: <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" aria-hidden />, title: 'Uploading…', sub: videoFileName, tone: '' }
    : videoError
      ? { icon: <CircleAlert className="size-5 text-destructive" aria-hidden />, title: videoError, sub: 'Click to choose the file again', tone: 'border-destructive/40 bg-destructive/5' }
      : videoKey
        ? { icon: <CircleCheck className="size-5 text-emerald-500" aria-hidden />, title: videoFileName, sub: 'Uploaded. Click to replace it.', tone: 'border-emerald-500/40 bg-emerald-500/5' }
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
          className={`flex cursor-pointer items-center gap-4 rounded-xl border border-dashed p-5 transition-colors hover:bg-muted/50 has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/40 ${videoPicker.tone}`}
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted">{videoPicker.icon}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{videoPicker.title}</span>
            <span className="block truncate text-xs text-muted-foreground">{videoPicker.sub}</span>
          </span>
          <input id="video-picker" type="file" accept="video/mp4,video/webm" onChange={handleVideoChange} disabled={videoUploading} className="sr-only" />
        </label>
      </Field>
      <input type="hidden" name="videoKey" value={videoKey ?? ''} />

      <Field label="Thumbnail" htmlFor="thumbnail-picker" hint="Optional, but recommended. Shown on the recordings list so students can recognize the lesson at a glance.">
        <label
          htmlFor="thumbnail-picker"
          className={`flex cursor-pointer items-center gap-4 rounded-xl border border-dashed p-4 transition-colors hover:bg-muted/50 has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/40 ${
            thumbnailError ? 'border-destructive/40 bg-destructive/5' : ''
          }`}
        >
          <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
            {thumbnailPreview ? (
              // eslint-disable-next-line @next/next/no-img-element -- local object URL preview, not a static asset
              <img src={thumbnailPreview} alt="" className="size-full object-cover" />
            ) : (
              <ImageIcon className="size-5 text-muted-foreground" aria-hidden />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">
              {thumbnailUploading ? 'Uploading…' : thumbnailError || thumbnailFileName || 'Choose a thumbnail image'}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {thumbnailUploading
                ? thumbnailFileName
                : thumbnailKey
                  ? 'Uploaded. Click to replace it.'
                  : thumbnailError
                    ? 'Click to choose the file again'
                    : 'PNG, JPG or WEBP · 16:9 works best'}
            </span>
          </span>
          {thumbnailUploading && <LoaderCircle className="size-4 shrink-0 animate-spin motion-reduce:animate-none text-muted-foreground" aria-hidden />}
          {!thumbnailUploading && thumbnailKey && <CircleCheck className="size-4 shrink-0 text-emerald-500" aria-hidden />}
          <input
            id="thumbnail-picker"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleThumbnailChange}
            disabled={thumbnailUploading}
            className="sr-only"
          />
        </label>
      </Field>
      <input type="hidden" name="thumbnailKey" value={thumbnailKey ?? ''} />

      {error && (
        <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-4 border-t pt-6">
        {!videoKey && !videoUploading && <p className="text-sm text-muted-foreground">Upload a video to create the recording.</p>}
        <SubmitButton pendingLabel="Creating…" disabled={!videoKey || videoUploading || thumbnailUploading}>
          Create recording
        </SubmitButton>
      </div>
    </form>
  );
}