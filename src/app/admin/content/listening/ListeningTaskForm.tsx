'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowDown,
  ArrowUp,
  CircleAlert,
  CircleCheck,
  FileAudio,
  ImagePlus,
  LoaderCircle,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import { Field, inputClass, textareaClass } from '@/components/admin/ui';
import {
  type ListeningDifficulty,
  type ListeningQuestion,
  type ListeningQuestionType,
  type ListeningSection,
  type ListeningTaskStatus,
} from '@/lib/listening-content';
import {
  createListeningTask,
  getAudioUploadUrl,
  getListeningPreviewUrl,
  getListeningTask,
  getMapUploadUrl,
  updateListeningTask,
} from './actions';

type EditorQuestion = ListeningQuestion & { answer: string };
type TaskDetail = Awaited<ReturnType<typeof getListeningTask>>;
type FormValues = {
  taskNumber: string;
  title: string;
  description: string;
  difficulty: ListeningDifficulty;
  section: ListeningSection;
  status: ListeningTaskStatus;
  audioKey: string;
  audioUrl: string;
  audioTitle: string;
  audioFormat: string;
  audioDurationSeconds: string;
  transcript: string;
  transcriptVisibleToStudents: boolean;
  mapKey: string;
  instructions: string;
  timerMinutes: string;
};
type ViewMode = 'admin' | 'student' | 'answers';

const EMPTY_FORM: FormValues = {
  taskNumber: '1',
  title: '',
  description: '',
  difficulty: 'Medium',
  section: 'Part 1',
  status: 'Draft',
  audioKey: '',
  audioUrl: '',
  audioTitle: '',
  audioFormat: '',
  audioDurationSeconds: '',
  transcript: '',
  transcriptVisibleToStudents: false,
  mapKey: '',
  instructions: '',
  timerMinutes: '8',
};

function formatTime(seconds?: number) {
  if (seconds === undefined || !Number.isFinite(seconds)) return '—';
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
}

function splitChoices(value: string) {
  return value.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean);
}

function selectedMultipleAnswers(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((answer): answer is string => typeof answer === 'string') : [];
  } catch {
    return [];
  }
}

function displayAnswer(value: string) {
  const selected = selectedMultipleAnswers(value);
  return selected.length > 1 ? selected.join(', ') : value;
}

function toEditorQuestions(task: TaskDetail): EditorQuestion[] {
  return task.questions.map((question) => ({
    ...question,
    answer: task.correctAnswers[question.id] ?? '',
    options: question.options ?? [],
    alternativeAnswers: question.alternativeAnswers ?? [],
    matching: question.matching ?? { item: question.text, choices: question.options ?? [] },
    mapLabel: question.mapLabel ?? { label: '' },
    completion: question.completion ?? {},
    tableCell: question.tableCell ?? { row: '', column: '' },
    flowStep: question.flowStep ?? { stepText: question.text, position: 1 },
  }));
}

export default function ListeningTaskForm({
  fixedQuestionType,
  taskId,
  defaultTaskNumber = 1,
}: {
  fixedQuestionType: ListeningQuestionType;
  taskId?: string;
  defaultTaskNumber?: number;
}) {
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement>(null);
  const transcriptRef = useRef<HTMLTextAreaElement>(null);
  const [form, setForm] = useState<FormValues>({ ...EMPTY_FORM, taskNumber: String(defaultTaskNumber) });
  const [questions, setQuestions] = useState<EditorQuestion[]>([]);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState('');
  const [mapPreviewUrl, setMapPreviewUrl] = useState('');
  const [audioFileName, setAudioFileName] = useState('');
  const [draggingQuestion, setDraggingQuestion] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(Boolean(taskId));
  const [viewMode, setViewMode] = useState<ViewMode>('admin');
  const [speed, setSpeed] = useState('1');
  const [pending, startTransition] = useTransition();

  const questionsJson = useMemo(() => JSON.stringify(questions), [questions]);
  const formId = taskId ? `edit-listening-${taskId}` : `create-listening-${fixedQuestionType.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  useEffect(() => {
    if (!taskId) return;
    let active = true;
    getListeningTask(taskId)
      .then((task) => {
        if (!active) return;
        setForm({
          taskNumber: String(task.taskNumber),
          title: task.title,
          description: task.description,
          difficulty: task.difficulty,
          section: task.section,
          status: task.status,
          audioKey: task.audioKey,
          audioUrl: task.audioUrl,
          audioTitle: task.audioTitle,
          audioFormat: task.audioFormat,
          audioDurationSeconds: task.audioDurationSeconds ? String(task.audioDurationSeconds) : '',
          transcript: task.transcript,
          transcriptVisibleToStudents: task.transcriptVisibleToStudents,
          mapKey: task.mapKey,
          instructions: task.instructions,
          timerMinutes: String(task.timerMinutes),
        });
        setQuestions(toEditorQuestions(task));
        setAudioPreviewUrl(task.audioPreviewUrl);
        setMapPreviewUrl(task.mapPreviewUrl);
        setAudioFileName(task.audioTitle || task.audioKey.split('/').pop() || '');
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Could not load this practice set.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [taskId]);

  function updateForm(update: Partial<FormValues>) {
    setForm((current) => ({ ...current, ...update }));
  }

  function updateQuestion(index: number, update: Partial<EditorQuestion>) {
    setQuestions((current) => current.map((question, i) => (i === index ? { ...question, ...update } : question)));
  }

  function addQuestion() {
    const id = `q${questions.length + 1}`;
    setQuestions((current) => [
      ...current,
      {
        id,
        type: fixedQuestionType.toLowerCase().replace(/[^a-z0-9]+/g, '-') as ListeningQuestion['type'],
        text: '',
        answer: '',
        answerMode: 'single',
        options: fixedQuestionType === 'Multiple Choice' ? ['', '', ''] : [],
        alternativeAnswers: [],
        matching: { item: '', choices: ['', ''] },
        mapLabel: { label: '' },
        completion: { heading: '', fieldLabel: '' },
        tableCell: { row: '', column: '' },
        flowStep: { stepText: '', position: questions.length + 1 },
      },
    ]);
  }

  function removeQuestion(index: number) {
    const questionNumber = index + 1;
    if (!window.confirm(`Delete question ${questionNumber}? This cannot be undone.`)) return;
    setQuestions((current) => current.filter((_, i) => i !== index));
  }

  function moveQuestion(index: number, direction: -1 | 1) {
    reorderQuestion(index, index + direction);
  }

  function reorderQuestion(from: number, to: number) {
    setQuestions((current) => {
      if (to < 0 || to >= current.length) return current;
      const reordered = [...current];
      const [question] = reordered.splice(from, 1);
      reordered.splice(to, 0, question);
      return reordered.map((item, index) => item.flowStep
        ? { ...item, flowStep: { ...item.flowStep, position: index + 1 } }
        : item);
    });
  }

  async function uploadAudio(file?: File) {
    if (!file) return;
    setUploading(true);
    setUploadError('');
    setError('');
    setAudioFileName(file.name);
    try {
      const { uploadUrl, key, contentType, audioFormat } = await getAudioUploadUrl(file.name, file.type);
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: file,
      });
      if (!response.ok) throw new Error(`Audio upload failed (${response.status}).`);
      const preview = await getListeningPreviewUrl(key);
      updateForm({ audioKey: key, audioUrl: '', audioTitle: file.name, audioFormat: audioFormat ?? '' });
      setAudioPreviewUrl(preview);
    } catch (reason) {
      setUploadError(reason instanceof Error ? reason.message : 'Audio upload failed.');
    } finally {
      setUploading(false);
    }
  }

  async function uploadMap(file?: File) {
    if (!file) return;
    setUploading(true);
    setUploadError('');
    setError('');
    try {
      const { uploadUrl, key, contentType } = await getMapUploadUrl(file.name, file.type);
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: file,
      });
      if (!response.ok) throw new Error(`Map or diagram upload failed (${response.status}).`);
      const preview = await getListeningPreviewUrl(key);
      updateForm({ mapKey: key });
      setMapPreviewUrl(preview);
    } catch (reason) {
      setUploadError(reason instanceof Error ? reason.message : 'Map or diagram upload failed.');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');
    const formData = new FormData(event.currentTarget);
    formData.set('questionType', fixedQuestionType);
    formData.set('questionsJson', questionsJson);
    startTransition(async () => {
      try {
        if (taskId) await updateListeningTask(taskId, formData);
        else await createListeningTask(formData);
        setSuccess(taskId ? 'Practice set saved.' : 'Practice set created.');
        router.refresh();
        if (!taskId) {
          setForm({ ...EMPTY_FORM, taskNumber: String(defaultTaskNumber) });
          setQuestions([]);
          setAudioPreviewUrl('');
          setMapPreviewUrl('');
          setAudioFileName('');
        }
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Could not save this practice set.');
      }
    });
  }

  function setTimestamp(index: number, key: 'audioStartTime' | 'audioEndTime') {
    const currentTime = audioRef.current?.currentTime;
    if (currentTime === undefined || !Number.isFinite(currentTime)) {
      setError('Load and play the audio before setting a timestamp.');
      return;
    }
    updateQuestion(index, { [key]: Math.floor(currentTime) });
  }

  function wrapTranscriptSelection(marker: '**' | '*') {
    const textarea = transcriptRef.current;
    if (!textarea) return;
    const { selectionStart, selectionEnd } = textarea;
    const selectedText = form.transcript.slice(selectionStart, selectionEnd) || 'text';
    const replacement = `${marker}${selectedText}${marker}`;
    updateForm({
      transcript: `${form.transcript.slice(0, selectionStart)}${replacement}${form.transcript.slice(selectionEnd)}`,
    });
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(selectionStart + marker.length, selectionStart + marker.length + selectedText.length);
    });
  }

  if (loading) {
    return <p className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" aria-hidden /> Loading practice set…</p>;
  }

  const audioSource = audioPreviewUrl || form.audioUrl;
  const isMapType = fixedQuestionType === 'Plan/Map/Diagram Labelling';

  return (
    <div className="space-y-5">
      {taskId && (
        <div className="flex flex-wrap gap-2 border-b pb-4" role="tablist" aria-label="Practice set views">
          {([
            ['admin', 'Admin view'],
            ['student', 'Student preview'],
            ['answers', 'Answer key'],
          ] as const).map(([mode, text]) => (
            <button
              key={mode}
              type="button"
              role="tab"
              aria-selected={viewMode === mode}
              onClick={() => setViewMode(mode)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 ${
                viewMode === mode ? 'bg-primary text-primary-foreground' : 'border bg-background hover:bg-muted'
              }`}
            >
              {text}
            </button>
          ))}
        </div>
      )}

      {viewMode === 'student' ? (
        <StudentPreview
          title={form.title || `Practice Set ${form.taskNumber}`}
          section={form.section}
          instructions={form.instructions}
          audioTitle={form.audioTitle || audioFileName}
          audioSource={audioSource}
          audioRef={audioRef}
          speed={speed}
          onSpeedChange={(value) => {
            setSpeed(value);
            if (audioRef.current) audioRef.current.playbackRate = Number(value);
          }}
          mapPreviewUrl={mapPreviewUrl}
          questions={questions}
        />
      ) : viewMode === 'answers' ? (
        <AnswerKey questions={questions} />
      ) : (
        <form id={formId} onSubmit={handleSubmit} className="space-y-8">
          <input type="hidden" name="questionType" value={fixedQuestionType} />
          <input type="hidden" name="audioKey" value={form.audioKey} />
          <input type="hidden" name="audioDurationSeconds" value={form.audioDurationSeconds} />
          <input type="hidden" name="mapKey" value={form.mapKey} />
          <input type="hidden" name="questionsJson" value={questionsJson} />
          <input type="hidden" name="transcriptVisibleToStudents" value={String(form.transcriptVisibleToStudents)} />

          {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"><CircleAlert className="mr-2 inline size-4" aria-hidden />{error}</p>}
          {uploadError && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{uploadError}</p>}
          {success && <p role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-700 dark:text-emerald-400"><CircleCheck className="mr-2 inline size-4" aria-hidden />{success}</p>}

          <section className="space-y-4">
            <div>
              <h2 className="text-base font-semibold">Practice set details</h2>
              <p className="mt-1 text-sm text-muted-foreground">Create the listening set and assign its IELTS section.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Practice set title" htmlFor={`${formId}-title`}>
                <input id={`${formId}-title`} name="title" value={form.title} onChange={(event) => updateForm({ title: event.target.value })} required maxLength={160} placeholder="e.g. University orientation" className={inputClass} />
              </Field>
              <Field label="Practice set number" htmlFor={`${formId}-taskNumber`}>
                <input id={`${formId}-taskNumber`} name="taskNumber" type="number" min={1} required value={form.taskNumber} onChange={(event) => updateForm({ taskNumber: event.target.value })} className={inputClass} />
              </Field>
              <Field label="Difficulty" htmlFor={`${formId}-difficulty`}>
                <select id={`${formId}-difficulty`} name="difficulty" value={form.difficulty} onChange={(event) => updateForm({ difficulty: event.target.value as ListeningDifficulty })} className={inputClass}>
                  <option>Easy</option><option>Medium</option><option>Hard</option>
                </select>
              </Field>
              <Field label="IELTS section" htmlFor={`${formId}-section`}>
                <select id={`${formId}-section`} name="section" value={form.section} onChange={(event) => updateForm({ section: event.target.value as ListeningSection })} className={inputClass}>
                  <option>Part 1</option><option>Part 2</option><option>Part 3</option><option>Part 4</option>
                </select>
              </Field>
              <Field label="Status" htmlFor={`${formId}-status`}>
                <select id={`${formId}-status`} name="status" value={form.status} onChange={(event) => updateForm({ status: event.target.value as ListeningTaskStatus })} className={inputClass}>
                  <option>Draft</option><option>Published</option>
                </select>
              </Field>
              <Field label="Time limit (minutes)" htmlFor={`${formId}-timerMinutes`}>
                <input id={`${formId}-timerMinutes`} name="timerMinutes" type="number" min={1} max={240} required value={form.timerMinutes} onChange={(event) => updateForm({ timerMinutes: event.target.value })} className={inputClass} />
              </Field>
            </div>
            <Field label="Description" htmlFor={`${formId}-description`} hint="Shown in the admin set list.">
              <textarea id={`${formId}-description`} name="description" value={form.description} onChange={(event) => updateForm({ description: event.target.value })} rows={2} maxLength={1000} className={`${textareaClass} min-h-20`} />
            </Field>
            <Field label="Instructions" htmlFor={`${formId}-instructions`} hint="Student directions shown above the questions.">
              <textarea id={`${formId}-instructions`} name="instructions" value={form.instructions} onChange={(event) => updateForm({ instructions: event.target.value })} required rows={2} maxLength={2000} placeholder="e.g. Write no more than two words for each answer." className={`${textareaClass} min-h-20`} />
            </Field>
          </section>

          <section className="space-y-4 border-t pt-6">
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold"><FileAudio className="size-4 text-primary" aria-hidden /> Audio recording</h2>
              <p className="mt-1 text-sm text-muted-foreground">Upload MP3, WAV, M4A or OGG audio, or provide a hosted audio URL.</p>
            </div>
            <Field label="Audio file" htmlFor={`${formId}-audioFile`}>
              <label
                htmlFor={`${formId}-audioFile`}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  void uploadAudio(event.dataTransfer.files[0]);
                }}
                className="flex cursor-pointer items-center gap-4 rounded-xl border border-dashed bg-background p-5 transition-colors hover:bg-muted/50 has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/40"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted">
                  {uploading ? <LoaderCircle className="size-5 animate-spin" aria-hidden /> : <Upload className="size-5" aria-hidden />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{uploading ? 'Uploading audio…' : audioFileName || 'Choose or drop an audio file'}</span>
                  <span className="block text-xs text-muted-foreground">MP3, WAV, M4A or OGG</span>
                </span>
                <input id={`${formId}-audioFile`} type="file" accept=".mp3,.wav,.m4a,.ogg,audio/mpeg,audio/wav,audio/mp4,audio/ogg" disabled={uploading} onChange={(event) => void uploadAudio(event.target.files?.[0])} className="sr-only" />
              </label>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Audio title" htmlFor={`${formId}-audioTitle`}>
                <input id={`${formId}-audioTitle`} name="audioTitle" value={form.audioTitle} onChange={(event) => updateForm({ audioTitle: event.target.value })} placeholder="Audio file title" className={inputClass} />
              </Field>
              <Field label="Audio format" htmlFor={`${formId}-audioFormat`}>
                <select id={`${formId}-audioFormat`} name="audioFormat" value={form.audioFormat} onChange={(event) => updateForm({ audioFormat: event.target.value })} className={inputClass}>
                  <option value="">Choose format</option><option>MP3</option><option>WAV</option><option>M4A</option><option>OGG</option>
                </select>
              </Field>
              <Field label="External audio URL" htmlFor={`${formId}-audioUrl`} hint="Optional. Used when audio is hosted outside this application.">
                <input id={`${formId}-audioUrl`} name="audioUrl" type="url" value={form.audioUrl} onChange={(event) => {
                  updateForm({ audioUrl: event.target.value, ...(event.target.value ? { audioKey: '' } : {}) });
                  setAudioPreviewUrl('');
                }} placeholder="https://example.com/recording.mp3" className={inputClass} />
              </Field>
              <Field label="Audio duration (seconds)" htmlFor={`${formId}-audioDuration`}>
                <input id={`${formId}-audioDuration`} type="number" min={0} step="1" value={form.audioDurationSeconds} onChange={(event) => updateForm({ audioDurationSeconds: event.target.value })} placeholder="Read from audio player" className={inputClass} />
              </Field>
            </div>
            {audioSource && (
              <div className="rounded-xl border bg-card p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">{form.audioTitle || audioFileName || 'Audio preview'} <span className="ml-2 text-xs font-normal text-muted-foreground">{form.audioFormat} · {formatTime(Number(form.audioDurationSeconds))}</span></p>
                  <button type="button" onClick={() => {
                    updateForm({ audioKey: '', audioUrl: '', audioTitle: '', audioFormat: '', audioDurationSeconds: '' });
                    setAudioPreviewUrl('');
                    setAudioFileName('');
                  }} className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">Remove audio</button>
                </div>
                <audio
                  ref={audioRef}
                  src={audioSource}
                  controls
                  preload="metadata"
                  className="w-full"
                  onLoadedMetadata={(event) => {
                    const duration = event.currentTarget.duration;
                    if (Number.isFinite(duration)) updateForm({ audioDurationSeconds: String(Math.round(duration)) });
                  }}
                />
                <label className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                  Playback speed
                  <select value={speed} onChange={(event) => {
                    setSpeed(event.target.value);
                    if (audioRef.current) audioRef.current.playbackRate = Number(event.target.value);
                  }} className="h-9 rounded-lg border bg-background px-2 text-foreground">
                    <option value="0.75">0.75×</option><option value="1">1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option><option value="2">2×</option>
                  </select>
                </label>
              </div>
            )}
          </section>

          {isMapType && (
            <section className="space-y-4 border-t pt-6">
              <div>
                <h2 className="flex items-center gap-2 text-base font-semibold"><ImagePlus className="size-4 text-primary" aria-hidden /> Plan, map or diagram</h2>
                <p className="mt-1 text-sm text-muted-foreground">Upload the image students use to identify locations or labels.</p>
              </div>
              <Field label="Map or diagram image" htmlFor={`${formId}-mapFile`}>
                <input id={`${formId}-mapFile`} type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void uploadMap(event.target.files?.[0])} className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-4 file:py-2 file:text-sm file:font-medium" />
              </Field>
              {mapPreviewUrl && <MapDiagramPreview src={mapPreviewUrl} questions={questions} />}
            </section>
          )}

          <section className="space-y-4 border-t pt-6">
            <div>
              <h2 className="text-base font-semibold">Transcript</h2>
              <p className="mt-1 text-sm text-muted-foreground">Optional administrator reference. Hidden from students by default.</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => wrapTranscriptSelection('**')} className="rounded-md border px-3 py-1.5 text-sm font-semibold hover:bg-muted" aria-label="Bold selected transcript text">B</button>
              <button type="button" onClick={() => wrapTranscriptSelection('*')} className="rounded-md border px-3 py-1.5 text-sm italic hover:bg-muted" aria-label="Italicize selected transcript text">I</button>
            </div>
            <textarea ref={transcriptRef} id={`${formId}-transcript`} name="transcript" value={form.transcript} onChange={(event) => updateForm({ transcript: event.target.value })} rows={8} placeholder={'Speaker 1:\nGood morning everyone…'} className={textareaClass} />
            <label className="flex items-start gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={form.transcriptVisibleToStudents} onChange={(event) => updateForm({ transcriptVisibleToStudents: event.target.checked })} className="mt-0.5 size-4 accent-primary" />
              Allow students to view this transcript during practice
            </label>
          </section>

          <section className="space-y-4 border-t pt-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Questions</h2>
                <p className="mt-1 text-sm text-muted-foreground">{fixedQuestionType} · {questions.length} of 100 questions</p>
              </div>
              <button type="button" disabled={questions.length >= 100} onClick={addQuestion} className="inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-medium hover:bg-muted disabled:opacity-50">
                <Plus className="size-4" aria-hidden /> Add question
              </button>
            </div>
            <ol className="space-y-4">
              {questions.map((question, index) => (
                <li
                  key={question.id}
                  draggable
                  onDragStart={() => setDraggingQuestion(index)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    if (draggingQuestion !== null) reorderQuestion(draggingQuestion, index);
                    setDraggingQuestion(null);
                  }}
                  onDragEnd={() => setDraggingQuestion(null)}
                  className={`rounded-2xl border bg-card p-4 text-card-foreground shadow-sm ${draggingQuestion === index ? 'opacity-50' : ''}`}
                >
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-semibold">Question {index + 1}</h3>
                    <div className="flex items-center gap-1">
                      <button type="button" disabled={index === 0} onClick={() => moveQuestion(index, -1)} aria-label={`Move question ${index + 1} up`} className="flex size-9 items-center justify-center rounded-lg border hover:bg-muted disabled:opacity-40"><ArrowUp className="size-4" aria-hidden /></button>
                      <button type="button" disabled={index === questions.length - 1} onClick={() => moveQuestion(index, 1)} aria-label={`Move question ${index + 1} down`} className="flex size-9 items-center justify-center rounded-lg border hover:bg-muted disabled:opacity-40"><ArrowDown className="size-4" aria-hidden /></button>
                      <button type="button" onClick={() => removeQuestion(index)} aria-label={`Delete question ${index + 1}`} className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="size-4" aria-hidden /></button>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Question text" htmlFor={`${formId}-${question.id}-text`} className="md:col-span-2">
                      <textarea id={`${formId}-${question.id}-text`} value={question.text} onChange={(event) => updateQuestion(index, { text: event.target.value })} rows={2} required maxLength={2000} placeholder="Enter the prompt students will answer." className={`${textareaClass} min-h-20`} />
                    </Field>
                    {fixedQuestionType === 'Multiple Choice' && (
                      <>
                        <Field label="Answer selection" htmlFor={`${formId}-${question.id}-answer-mode`}>
                          <select
                            id={`${formId}-${question.id}-answer-mode`}
                            value={question.answerMode ?? 'single'}
                            onChange={(event) => updateQuestion(index, {
                              answerMode: event.target.value as 'single' | 'multiple',
                              answer: '',
                            })}
                            className={inputClass}
                          >
                            <option value="single">Single answer</option>
                            <option value="multiple">Multiple answers</option>
                          </select>
                        </Field>
                        <Field label="Options (3–5, one per line)" htmlFor={`${formId}-${question.id}-options`} className="md:col-span-2">
                          <textarea id={`${formId}-${question.id}-options`} value={(question.options ?? []).join('\n')} onChange={(event) => updateQuestion(index, { options: splitChoices(event.target.value) })} rows={4} placeholder={'A. ...\nB. ...\nC. ...'} className={textareaClass} />
                        </Field>
                      </>
                    )}
                    {fixedQuestionType === 'Matching' && (
                      <>
                        <Field label="Item to match" htmlFor={`${formId}-${question.id}-matching-item`}>
                          <input id={`${formId}-${question.id}-matching-item`} value={question.matching?.item ?? ''} onChange={(event) => updateQuestion(index, { matching: { ...(question.matching ?? { choices: [] }), item: event.target.value } })} className={inputClass} placeholder="e.g. Sarah" />
                        </Field>
                        <Field label="Matching choices (one per line)" htmlFor={`${formId}-${question.id}-matching-choices`}>
                          <textarea id={`${formId}-${question.id}-matching-choices`} value={(question.matching?.choices ?? []).join('\n')} onChange={(event) => {
                            const choices = splitChoices(event.target.value);
                            updateQuestion(index, { matching: { ...(question.matching ?? { item: '' }), choices }, options: choices });
                          }} rows={3} placeholder={'A. Finance\nB. Marketing'} className={textareaClass} />
                        </Field>
                      </>
                    )}
                    {isMapType && (
                      <>
                        <Field label="Map label" htmlFor={`${formId}-${question.id}-map-label`}>
                          <input id={`${formId}-${question.id}-map-label`} value={question.mapLabel?.label ?? ''} onChange={(event) => updateQuestion(index, { mapLabel: { ...(question.mapLabel ?? {}), label: event.target.value } })} className={inputClass} placeholder="e.g. Entrance" />
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Marker left (%)" htmlFor={`${formId}-${question.id}-map-x`}>
                            <input id={`${formId}-${question.id}-map-x`} type="number" min={0} max={100} value={question.mapLabel?.x ?? ''} onChange={(event) => updateQuestion(index, { mapLabel: { ...(question.mapLabel ?? { label: '' }), x: event.target.value === '' ? undefined : Number(event.target.value) } })} className={inputClass} />
                          </Field>
                          <Field label="Marker top (%)" htmlFor={`${formId}-${question.id}-map-y`}>
                            <input id={`${formId}-${question.id}-map-y`} type="number" min={0} max={100} value={question.mapLabel?.y ?? ''} onChange={(event) => updateQuestion(index, { mapLabel: { ...(question.mapLabel ?? { label: '' }), y: event.target.value === '' ? undefined : Number(event.target.value) } })} className={inputClass} />
                          </Field>
                        </div>
                      </>
                    )}
                    {['Form Completion', 'Note Completion', 'Summary Completion'].includes(fixedQuestionType) && (
                      <>
                        <Field label="Section / summary heading" htmlFor={`${formId}-${question.id}-heading`}>
                          <input id={`${formId}-${question.id}-heading`} value={question.completion?.heading ?? ''} onChange={(event) => updateQuestion(index, { completion: { ...(question.completion ?? {}), heading: event.target.value } })} className={inputClass} placeholder="e.g. Student registration" />
                        </Field>
                        <Field label={fixedQuestionType === 'Form Completion' ? 'Form field label' : 'Note or blank label'} htmlFor={`${formId}-${question.id}-field`}>
                          <input id={`${formId}-${question.id}-field`} value={question.completion?.fieldLabel ?? ''} onChange={(event) => updateQuestion(index, { completion: { ...(question.completion ?? {}), fieldLabel: event.target.value } })} className={inputClass} placeholder="e.g. Start date" />
                        </Field>
                      </>
                    )}
                    {fixedQuestionType === 'Table Completion' && (
                      <>
                        <Field label="Table row label" htmlFor={`${formId}-${question.id}-row`}>
                          <input id={`${formId}-${question.id}-row`} value={question.tableCell?.row ?? ''} onChange={(event) => updateQuestion(index, { tableCell: { ...(question.tableCell ?? { column: '' }), row: event.target.value } })} className={inputClass} />
                        </Field>
                        <Field label="Table column label" htmlFor={`${formId}-${question.id}-column`}>
                          <input id={`${formId}-${question.id}-column`} value={question.tableCell?.column ?? ''} onChange={(event) => updateQuestion(index, { tableCell: { ...(question.tableCell ?? { row: '' }), column: event.target.value } })} className={inputClass} />
                        </Field>
                      </>
                    )}
                    {fixedQuestionType === 'Flow-Chart Completion' && (
                      <Field label="Flow-chart step" htmlFor={`${formId}-${question.id}-step`} className="md:col-span-2">
                        <input id={`${formId}-${question.id}-step`} value={question.flowStep?.stepText ?? ''} onChange={(event) => updateQuestion(index, { flowStep: { ...(question.flowStep ?? { position: index + 1 }), stepText: event.target.value } })} className={inputClass} placeholder="e.g. Initial review" />
                      </Field>
                    )}
                    {fixedQuestionType === 'Multiple Choice' && question.answerMode === 'multiple' ? (
                      <fieldset className="space-y-2">
                        <legend className="mb-1.5 text-sm font-medium">Correct options (select at least two)</legend>
                        {(question.options ?? []).filter(Boolean).map((option) => {
                          const checked = selectedMultipleAnswers(question.answer).includes(option);
                          return (
                            <label key={option} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(event) => {
                                  const current = selectedMultipleAnswers(question.answer);
                                  const next = event.target.checked
                                    ? [...current, option]
                                    : current.filter((item) => item !== option);
                                  updateQuestion(index, { answer: JSON.stringify(next) });
                                }}
                                className="size-4 accent-primary"
                              />
                              {option}
                            </label>
                          );
                        })}
                      </fieldset>
                    ) : (
                      <Field label="Correct answer" htmlFor={`${formId}-${question.id}-answer`}>
                        <input id={`${formId}-${question.id}-answer`} value={question.answer} onChange={(event) => updateQuestion(index, { answer: event.target.value })} required maxLength={500} className={inputClass} />
                      </Field>
                    )}
                    <Field label="Word limit" htmlFor={`${formId}-${question.id}-word-limit`}>
                      <select id={`${formId}-${question.id}-word-limit`} value={question.wordLimit && question.wordLimit > 3 ? 'custom' : question.wordLimit ?? 0} onChange={(event) => updateQuestion(index, { wordLimit: event.target.value === 'custom' ? Math.max(question.wordLimit ?? 0, 4) : Number(event.target.value) || undefined })} className={inputClass}>
                        <option value={0}>No limit</option><option value={1}>One word</option><option value={2}>No more than two words</option><option value={3}>No more than three words</option><option value="custom">Custom</option>
                      </select>
                    </Field>
                    {question.wordLimit !== undefined && question.wordLimit > 3 && (
                      <Field label="Custom maximum words" htmlFor={`${formId}-${question.id}-custom-word-limit`}>
                        <input id={`${formId}-${question.id}-custom-word-limit`} type="number" min={1} max={100} value={question.wordLimit} onChange={(event) => updateQuestion(index, { wordLimit: Number(event.target.value) || undefined })} className={inputClass} />
                      </Field>
                    )}
                    <Field label="Alternative accepted answers (one per line)" htmlFor={`${formId}-${question.id}-alternatives`} className="md:col-span-2">
                      <textarea id={`${formId}-${question.id}-alternatives`} value={(question.alternativeAnswers ?? []).join('\n')} onChange={(event) => updateQuestion(index, { alternativeAnswers: splitChoices(event.target.value) })} rows={2} className={`${textareaClass} min-h-20`} placeholder="e.g. 12 September" />
                    </Field>
                    <Field label="Explanation" htmlFor={`${formId}-${question.id}-explanation`} className="md:col-span-2">
                      <textarea id={`${formId}-${question.id}-explanation`} value={question.explanation ?? ''} onChange={(event) => updateQuestion(index, { explanation: event.target.value })} rows={2} className={`${textareaClass} min-h-20`} placeholder="Explain why this answer is correct." />
                    </Field>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <TimestampField
                      id={`${formId}-${question.id}-start`}
                      label="Audio start (seconds)"
                      value={question.audioStartTime}
                      onChange={(value) => updateQuestion(index, { audioStartTime: value === '' ? undefined : Number(value) })}
                      onSet={() => setTimestamp(index, 'audioStartTime')}
                    />
                    <TimestampField
                      id={`${formId}-${question.id}-end`}
                      label="Audio end (seconds)"
                      value={question.audioEndTime}
                      onChange={(value) => updateQuestion(index, { audioEndTime: value === '' ? undefined : Number(value) })}
                      onSet={() => setTimestamp(index, 'audioEndTime')}
                    />
                  </div>
                </li>
              ))}
            </ol>
            {!questions.length && (
              <div className="rounded-xl border border-dashed p-8 text-center">
                <p className="font-medium">No questions added yet.</p>
                <p className="mt-1 text-sm text-muted-foreground">Add your first {fixedQuestionType} question to this set.</p>
              </div>
            )}
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-6">
            <p className="text-sm text-muted-foreground">Required: title, audio, instructions and at least one complete question.</p>
            <button type="submit" disabled={pending || uploading} className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60">
              {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
              {pending ? 'Saving…' : taskId ? 'Save practice set' : 'Create practice set'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function TimestampField({
  id,
  label,
  value,
  onChange,
  onSet,
}: {
  id: string;
  label: string;
  value?: number;
  onChange: (value: string) => void;
  onSet: () => void;
}) {
  return (
    <Field label={label} htmlFor={id}>
      <div className="flex gap-2">
        <input id={id} type="number" min={0} step="1" value={value ?? ''} onChange={(event) => onChange(event.target.value)} className={inputClass} />
        <button type="button" onClick={onSet} className="shrink-0 rounded-lg border px-3 text-xs font-medium hover:bg-muted">Set from audio</button>
      </div>
    </Field>
  );
}

function StudentPreview({
  title,
  section,
  instructions,
  audioTitle,
  audioSource,
  audioRef,
  speed,
  onSpeedChange,
  mapPreviewUrl,
  questions,
}: {
  title: string;
  section: ListeningSection;
  instructions: string;
  audioTitle: string;
  audioSource: string;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  speed: string;
  onSpeedChange: (value: string) => void;
  mapPreviewUrl: string;
  questions: EditorQuestion[];
}) {
  return (
    <section className="space-y-6 rounded-2xl border bg-card p-5 text-card-foreground shadow-sm sm:p-7">
      <div>
        <p className="text-sm font-medium text-primary">IELTS Listening Practice · {section}</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight">{title}</h2>
      </div>
      {audioSource ? (
        <div className="rounded-xl border bg-background p-4">
          <p className="mb-2 text-sm font-medium">{audioTitle || 'Listening recording'}</p>
          <audio ref={audioRef} src={audioSource} controls preload="metadata" className="w-full" />
          <label className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            Playback speed
            <select value={speed} onChange={(event) => {
              onSpeedChange(event.target.value);
              if (audioRef.current) audioRef.current.playbackRate = Number(event.target.value);
            }} className="h-9 rounded-lg border bg-background px-2 text-foreground">
              <option value="0.75">0.75×</option><option value="1">1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option><option value="2">2×</option>
            </select>
          </label>
        </div>
      ) : (
        <p className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">Upload or link audio to preview this practice set.</p>
      )}
      {instructions && <p className="rounded-lg bg-muted/60 p-4 text-sm leading-relaxed">{instructions}</p>}
      {mapPreviewUrl && <MapDiagramPreview src={mapPreviewUrl} questions={questions} />}
      <ol className="space-y-5">
        {questions.map((question, index) => (
          <li key={question.id} className="rounded-xl border p-4">
            <p className="font-medium"><span className="mr-2 tabular-nums text-muted-foreground">{index + 1}.</span>{question.text}</p>
            {question.matching && <p className="mt-2 text-sm text-muted-foreground">{question.matching.item}</p>}
            {question.completion?.heading && <p className="mt-3 font-semibold">{question.completion.heading}</p>}
            {question.completion?.fieldLabel && <p className="mt-2 text-sm">{question.completion.fieldLabel}</p>}
            {question.tableCell && <p className="mt-2 text-sm text-muted-foreground">{question.tableCell.row} · {question.tableCell.column}</p>}
            {question.flowStep && <p className="mt-2 rounded-lg border border-dashed p-3 text-sm">{question.flowStep.position}. {question.flowStep.stepText}</p>}
            {question.options?.length ? (
              <fieldset className="mt-3 space-y-2">
                <legend className="sr-only">Choose an answer</legend>
                {question.options.map((option) => <label key={option} className="flex items-start gap-2 text-sm"><input type={question.answerMode === 'multiple' ? 'checkbox' : 'radio'} name={`preview-${question.id}`} disabled className="mt-1 accent-primary" />{option}</label>)}
              </fieldset>
            ) : (
              <div className="mt-3 h-10 rounded-lg border border-dashed" aria-label="Answer field preview" />
            )}
          </li>
        ))}
      </ol>
      <p className="text-xs text-muted-foreground">Preview only. Student answers are not submitted or stored.</p>
    </section>
  );
}

function AnswerKey({ questions }: { questions: EditorQuestion[] }) {
  return (
    <section className="rounded-2xl border bg-card p-5 text-card-foreground shadow-sm sm:p-7">
      <h2 className="text-xl font-semibold tracking-tight">Answer key</h2>
      {!questions.length ? (
        <p className="mt-4 text-sm text-muted-foreground">Add questions to view the answer key.</p>
      ) : (
        <ol className="mt-5 divide-y">
          {questions.map((question, index) => (
            <li key={question.id} className="py-4 first:pt-0 last:pb-0">
              <p className="font-medium"><span className="mr-2 tabular-nums text-muted-foreground">{index + 1}.</span>{question.text}</p>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div><dt className="text-xs text-muted-foreground">Correct answer</dt><dd className="font-semibold">{displayAnswer(question.answer) || 'Not set'}</dd></div>
                {question.alternativeAnswers?.length ? <div><dt className="text-xs text-muted-foreground">Accepted alternatives</dt><dd>{question.alternativeAnswers.join(', ')}</dd></div> : null}
                {question.explanation ? <div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">Explanation</dt><dd>{question.explanation}</dd></div> : null}
                {question.audioStartTime !== undefined || question.audioEndTime !== undefined ? <div><dt className="text-xs text-muted-foreground">Audio reference</dt><dd>{formatTime(question.audioStartTime)} – {formatTime(question.audioEndTime)}</dd></div> : null}
              </dl>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function MapDiagramPreview({ src, questions }: { src: string; questions: ListeningQuestion[] }) {
  return (
    <div className="relative inline-block max-w-full overflow-hidden rounded-xl border bg-background">
      <img src={src} alt="Listening map or diagram" className="block max-h-96 max-w-full object-contain" />
      {questions.map((question, index) => {
        const { x, y } = question.mapLabel ?? {};
        if (x === undefined || y === undefined) return null;
        return (
          <span
            key={question.id}
            className="absolute flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-primary text-xs font-bold text-primary-foreground shadow"
            style={{ left: `${x}%`, top: `${y}%` }}
            aria-label={`Question ${index + 1} marker`}
          >
            {index + 1}
          </span>
        );
      })}
    </div>
  );
}
