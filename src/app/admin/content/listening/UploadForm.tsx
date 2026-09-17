'use client';

import { useState } from 'react';
import { getAudioUploadUrl, createListeningTask } from './actions';

const QUESTION_TYPES = [
  'Multiple Choice', 'Matching', 'Plan/Map/Diagram Labelling', 'Form Completion',
  'Note Completion', 'Table Completion', 'Flow-Chart Completion',
  'Summary Completion', 'Sentence Completion', 'Short Answer Questions',
];

export default function UploadForm() {
  const [audioKey, setAudioKey] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState('');

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
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
    </form>
  );
}