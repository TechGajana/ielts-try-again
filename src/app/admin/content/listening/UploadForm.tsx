'use client';

import { useState } from 'react';
<<<<<<< HEAD
import { CircleAlert, CircleCheck, LoaderCircle, Upload } from 'lucide-react';
import { LISTENING_QUESTION_TYPES } from '@/lib/question-types';
import { Field, QuestionsSection, TaskBasics, inputClass } from '@/components/admin/ui';
import SubmitButton from '@/components/admin/submit-button';
import { getAudioUploadUrl, createListeningTask } from './actions';

=======
import { getAudioUploadUrl, createListeningTask } from './actions';

const QUESTION_TYPES = [
  'Multiple Choice', 'Matching', 'Plan/Map/Diagram Labelling', 'Form Completion',
  'Note Completion', 'Table Completion', 'Flow-Chart Completion',
  'Summary Completion', 'Sentence Completion', 'Short Answer Questions',
];

>>>>>>> 71d9a4ff2580737881c1d12e6324e871d2954744
export default function UploadForm() {
  const [audioKey, setAudioKey] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState('');
<<<<<<< HEAD
  const [uploadError, setUploadError] = useState('');
=======
>>>>>>> 71d9a4ff2580737881c1d12e6324e871d2954744

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
<<<<<<< HEAD
    setUploadError('');
    setAudioKey(null);
    setFileName(file.name);

    try {
      const { uploadUrl, key } = await getAudioUploadUrl(file.name, file.type);

      const res = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!res.ok) throw new Error(`Upload failed (${res.status})`);

      setAudioKey(key);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  // Create the task, then clear the audio so the next task can't reuse it by accident
  async function handleAction(formData: FormData) {
    await createListeningTask(formData);
    setAudioKey(null);
    setFileName('');
  }

  const pickerState = uploading
    ? {
        icon: <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" aria-hidden />,
        title: 'Uploading…',
        sub: fileName,
        tone: '',
      }
    : uploadError
      ? {
          icon: <CircleAlert className="size-5 text-destructive" aria-hidden />,
          title: uploadError,
          sub: 'Click to choose the file again',
          tone: 'border-destructive/40 bg-destructive/5',
        }
      : audioKey
        ? {
            icon: <CircleCheck className="size-5 text-emerald-500" aria-hidden />,
            title: fileName,
            sub: 'Uploaded. Click to replace it.',
            tone: 'border-emerald-500/40 bg-emerald-500/5',
          }
        : {
            icon: <Upload className="size-5" aria-hidden />,
            title: 'Choose an audio file',
            sub: 'MP3, WAV or M4A',
            tone: '',
          };

  return (
    <form action={handleAction} className="space-y-8">
      <TaskBasics types={LISTENING_QUESTION_TYPES} defaultTimer={8} />

      <Field label="Audio file" htmlFor="audio">
        <label
          htmlFor="audio"
          className={`flex cursor-pointer items-center gap-4 rounded-xl border border-dashed p-5 transition-colors hover:bg-muted/50 has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/40 ${pickerState.tone}`}
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted">
            {pickerState.icon}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{pickerState.title}</span>
            <span className="block truncate text-xs text-muted-foreground">{pickerState.sub}</span>
          </span>
          <input
            id="audio"
            type="file"
            accept="audio/*"
            onChange={handleFileChange}
            disabled={uploading}
            className="sr-only"
          />
        </label>
      </Field>
      <input type="hidden" name="audioKey" value={audioKey ?? ''} />

      <Field label="Instructions" htmlFor="instructions" hint="Shown to students above the questions.">
        <input
          id="instructions"
          name="instructions"
          required
          placeholder="e.g. Write no more than two words for each answer."
          className={inputClass}
        />
      </Field>

      <QuestionsSection />

      <div className="flex items-center justify-end gap-4 border-t pt-6">
        {!audioKey && !uploading && (
          <p className="text-sm text-muted-foreground">Upload an audio file to create the task.</p>
        )}
        <SubmitButton pendingLabel="Creating…" disabled={!audioKey || uploading}>
          Create task
        </SubmitButton>
      </div>
=======
    setFileName(file.name);

    const { uploadUrl, key } = await getAudioUploadUrl(file.name, file.type);

    await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    });

    setAudioKey(key);
    setUploading(false);
  }

  return (
    <form action={createListeningTask} className="space-y-3">
      <select name="questionType" required className="border rounded p-2 w-full">
        {QUESTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      <input name="taskNumber" type="number" placeholder="Task Number (1-10)" required className="border rounded p-2 w-full" />

      <div>
        <label className="block text-sm mb-1">Audio File</label>
        <input type="file" accept="audio/*" onChange={handleFileChange} className="border rounded p-2 w-full" />
        {uploading && <p className="text-sm text-yellow-600">Uploading {fileName}...</p>}
        {audioKey && <p className="text-sm text-green-600">Uploaded ✓ ({audioKey})</p>}
      </div>
      <input type="hidden" name="audioKey" value={audioKey ?? ''} />

      <input name="instructions" placeholder="Instructions" required className="border rounded p-2 w-full" />
      <input name="timerMinutes" type="number" defaultValue={8} className="border rounded p-2 w-full" />

      <p className="font-medium pt-2">Questions (Q1-Q10)</p>
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
        <div key={n} className="border-t pt-2">
          <input name={`q${n}_text`} placeholder={`Q${n} text`} className="border rounded p-2 w-full mb-1" />
          <input name={`q${n}_options`} placeholder={`Q${n} options (comma-separated)`} className="border rounded p-2 w-full mb-1" />
          <input name={`q${n}_answer`} placeholder={`Q${n} correct answer`} className="border rounded p-2 w-full" />
        </div>
      ))}

      <button
        type="submit"
        disabled={!audioKey || uploading}
        className="bg-black text-white rounded px-4 py-2 mt-2 disabled:opacity-50"
      >
        Create Task
      </button>
>>>>>>> 71d9a4ff2580737881c1d12e6324e871d2954744
    </form>
  );
}