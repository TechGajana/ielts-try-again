'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, CircleAlert, ImageIcon, LoaderCircle, Pencil, Plus, X } from 'lucide-react';
import { Field, inputClass, textareaClass } from '@/components/admin/ui';
import { READING_QUESTION_TYPES } from '@/lib/question-types';
import { READING_TYPE_DESCRIPTIONS, type ReadingQuestion } from '@/lib/reading-content';
import ReadingPassage from '@/components/practice/reading-passage';
import {
  createReadingTask,
  getDiagramKeyUploadUrl,
  getDiagramPreviewUrl,
  getReadingTask,
  updateReadingTask,
} from './actions';

type EditorQuestion = ReadingQuestion & { answer: string };
type TaskDetail = Awaited<ReturnType<typeof getReadingTask>>;

const toEditorQuestions = (task: TaskDetail): EditorQuestion[] =>
  task.questions.map((question) => ({
    ...question,
    answer: task.correctAnswers[question.id] ?? '',
  }));

function defaultOptions(questionType: string): string[] {
  if (questionType === 'Identifying Information') return ['TRUE', 'FALSE', 'NOT GIVEN'];
  if (questionType === "Identifying Writer's Views") return ['YES', 'NO', 'NOT GIVEN'];
  return [];
}

export default function ReadingTaskForm({
  fixedQuestionType,
  taskId,
  label,
}: {
  fixedQuestionType?: string;
  taskId?: string;
  label?: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(!taskId);
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [selectedQuestionType, setSelectedQuestionType] = useState(fixedQuestionType ?? READING_QUESTION_TYPES[0]);
  const [questions, setQuestions] = useState<EditorQuestion[]>([]);
  const [passage, setPassage] = useState('');
  const [diagramKey, setDiagramKey] = useState('');
  const [diagramUrl, setDiagramUrl] = useState('');
  const [diagramName, setDiagramName] = useState('');
  const [draggingQuestion, setDraggingQuestion] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [pending, startTransition] = useTransition();

  const questionType = fixedQuestionType ?? task?.questionType ?? selectedQuestionType;
  const questionDescription = READING_TYPE_DESCRIPTIONS[questionType as keyof typeof READING_TYPE_DESCRIPTIONS];
  const formId = taskId ? `edit-reading-task-${taskId}` : 'create-reading-task';
  const questionsJson = useMemo(() => JSON.stringify(questions), [questions]);

  useEffect(() => {
    if (!taskId || !open) return;
    let active = true;
    getReadingTask(taskId)
      .then(async (loadedTask) => {
        if (!active) return;
        setTask(loadedTask);
        setSelectedQuestionType(loadedTask.questionType);
        setQuestions(toEditorQuestions(loadedTask).map((question) => ({
          ...question,
          options: question.options?.length ? question.options : defaultOptions(loadedTask.questionType),
        })));
        setPassage(loadedTask.passage);
        setDiagramKey(loadedTask.diagramKey);
        if (loadedTask.diagramKey) {
          const preview = await getDiagramPreviewUrl(loadedTask.diagramKey);
          if (active) setDiagramUrl(preview);
        }
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Could not load task.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [taskId, open]);

  function updateQuestion(index: number, update: Partial<EditorQuestion>) {
    setQuestions((current) => current.map((question, i) => (i === index ? { ...question, ...update } : question)));
  }

  function insertPassageMarkup(before: string, after = before) {
    const textarea = document.getElementById(`${formId}-passage`) as HTMLTextAreaElement | null;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = passage.slice(start, end) || 'text';
    const replacement = `${before}${selected}${after}`;
    setPassage(`${passage.slice(0, start)}${replacement}${passage.slice(end)}`);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  }

  function moveQuestion(index: number, direction: -1 | 1) {
    reorderQuestion(index, index + direction);
  }

  function reorderQuestion(from: number, to: number) {
    setQuestions((current) => {
      if (to < 0 || to >= current.length) return current;
      const reordered = [...current];
      const [moved] = reordered.splice(from, 1);
      reordered.splice(to, 0, moved);
      return reordered;
    });
  }

  async function handleDiagramChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError('');
    setDiagramKey('');
    setDiagramUrl('');
    setDiagramName(file.name);
    try {
      const contentType = file.type || 'image/png';
      const { uploadUrl, key } = await getDiagramKeyUploadUrl(file.name, contentType);
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: file,
      });
      if (!response.ok) throw new Error(`Upload failed (${response.status}).`);
      const preview = await getDiagramPreviewUrl(key);
      setDiagramKey(key);
      setDiagramUrl(preview);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Diagram upload failed.');
    } finally {
      setUploading(false);
    }
  }

  function handleSubmit(formData: FormData) {
    setError('');
    if (questions.length === 0) {
      setError('Add at least one question to this practice set.');
      return;
    }
    const emptyQuestion = questions.findIndex((question) => !question.text.trim());
    if (emptyQuestion >= 0) {
      setError(`Enter the text for question ${emptyQuestion + 1}.`);
      return;
    }
    const emptyAnswer = questions.findIndex((question) => !question.answer.trim());
    if (emptyAnswer >= 0) {
      setError(`Add a correct answer for question ${emptyAnswer + 1}.`);
      return;
    }
    if (questionType === 'Multiple Choice') {
      const invalid = questions.findIndex((question) =>
        (question.options?.length ?? 0) < 2 ||
        !question.options?.some((option) => option.toLocaleLowerCase() === question.answer.trim().toLocaleLowerCase()),
      );
      if (invalid >= 0) {
        setError(`Multiple-choice question ${invalid + 1} needs at least two options, and its answer must match one.`);
        return;
      }
    }
    const constrainedAnswers =
      questionType === 'Identifying Information'
        ? ['TRUE', 'FALSE', 'NOT GIVEN']
        : questionType === "Identifying Writer's Views"
          ? ['YES', 'NO', 'NOT GIVEN']
          : null;
    if (constrainedAnswers) {
      const invalid = questions.findIndex((question) =>
        !constrainedAnswers.includes(question.answer.trim().toLocaleUpperCase()),
      );
      if (invalid >= 0) {
        setError(`Choose a valid answer for question ${invalid + 1}.`);
        return;
      }
    }
    if (questionType.startsWith('Matching')) {
      const invalid = questions.findIndex((question) =>
        (question.options?.length ?? 0) < 2 ||
        !question.options?.some((option) => option.toLocaleLowerCase() === question.answer.trim().toLocaleLowerCase()),
      );
      if (invalid >= 0) {
        setError(`Matching question ${invalid + 1} needs at least two choices, and its answer must match a choice.`);
        return;
      }
    }
    if (questionType === 'Diagram Label Completion' && !diagramKey) {
      setError('Upload a diagram before saving this question type.');
      return;
    }
    formData.set('questionsJson', questionsJson);
    formData.set('diagramKey', diagramKey);
    startTransition(async () => {
      try {
        if (taskId) await updateReadingTask(taskId, formData);
        else await createReadingTask(formData);
        if (taskId) {
          setOpen(false);
        } else {
          formRef.current?.reset();
          setQuestions([]);
          setPassage('');
          setDiagramKey('');
          setDiagramUrl('');
          setDiagramName('');
          setPreview(false);
        }
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save the practice set.');
      }
    });
  }

  if (taskId && !open) {
    return (
      <button
        type="button"
          onClick={() => {
            setLoading(true);
            setError('');
            setOpen(true);
          }}
        aria-label={`Edit ${label ?? 'reading task'}`}
        className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
      >
        <Pencil className="size-4" aria-hidden />
      </button>
    );
  }

  const editor = (
    <form id={formId} ref={formRef} action={handleSubmit} className="space-y-7">
      {!fixedQuestionType && (
        <Field label="Question type" htmlFor={`${formId}-questionType`}>
          <select
            id={`${formId}-questionType`}
            name="questionType"
            value={selectedQuestionType}
            onChange={(event) => {
              setSelectedQuestionType(event.target.value);
            }}
            className={inputClass}
            required
          >
            {READING_QUESTION_TYPES.map((type) => <option key={type}>{type}</option>)}
          </select>
        </Field>
      )}
      {fixedQuestionType && <input type="hidden" name="questionType" value={fixedQuestionType} />}

      {questionDescription && (
        <p className="rounded-lg bg-muted/60 px-4 py-3 text-sm text-muted-foreground">{questionDescription}</p>
      )}

      <section className="space-y-4" aria-labelledby={`${formId}-basics`}>
        <h3 id={`${formId}-basics`} className="text-base font-semibold">Practice set details</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Practice set title *" htmlFor={`${formId}-title`}>
            <input id={`${formId}-title`} name="title" required defaultValue={task?.title ?? ''} placeholder="e.g. Climate and agriculture" className={inputClass} />
          </Field>
          <Field label="Task number *" htmlFor={`${formId}-taskNumber`}>
            <input id={`${formId}-taskNumber`} name="taskNumber" type="number" min={1} required defaultValue={task?.taskNumber} className={inputClass} />
          </Field>
          <Field label="Difficulty" htmlFor={`${formId}-difficulty`}>
            <select id={`${formId}-difficulty`} name="difficulty" defaultValue={task?.difficulty ?? 'Medium'} className={inputClass}>
              <option>Easy</option><option>Medium</option><option>Hard</option>
            </select>
          </Field>
          <Field label="Estimated time (minutes)" htmlFor={`${formId}-timerMinutes`}>
            <input id={`${formId}-timerMinutes`} name="timerMinutes" type="number" min={1} max={240} required defaultValue={task?.timerMinutes ?? 10} className={inputClass} />
          </Field>
          <Field label="Status" htmlFor={`${formId}-status`}>
            <select id={`${formId}-status`} name="status" defaultValue={task?.status ?? 'Published'} className={inputClass}>
              <option>Draft</option><option>Published</option>
            </select>
          </Field>
          <Field label="Description" htmlFor={`${formId}-description`}>
            <input id={`${formId}-description`} name="description" defaultValue={task?.description ?? ''} placeholder="Optional overview shown to students" className={inputClass} />
          </Field>
        </div>
      </section>

      <section className="space-y-4" aria-labelledby={`${formId}-passage-heading`}>
        <h3 id={`${formId}-passage-heading`} className="text-base font-semibold">Passage and instructions</h3>
        <Field label="Passage *" htmlFor={`${formId}-passage`} hint="Supports Markdown: **bold**, *italic*, ==highlight==, # headings, - lists and [links](https://example.com).">
          <div className="mb-2 flex flex-wrap gap-1">
            <button type="button" onClick={() => insertPassageMarkup('**')} className="h-8 rounded border px-2 text-xs font-semibold hover:bg-muted">Bold</button>
            <button type="button" onClick={() => insertPassageMarkup('*')} className="h-8 rounded border px-2 text-xs italic hover:bg-muted">Italic</button>
            <button type="button" onClick={() => insertPassageMarkup('==')} className="h-8 rounded border px-2 text-xs hover:bg-muted">Highlight</button>
            <button type="button" onClick={() => insertPassageMarkup('## ', '')} className="h-8 rounded border px-2 text-xs hover:bg-muted">Heading</button>
            <button type="button" onClick={() => insertPassageMarkup('- ', '')} className="h-8 rounded border px-2 text-xs hover:bg-muted">List item</button>
            <button type="button" onClick={() => insertPassageMarkup('[', '](https://example.com)')} className="h-8 rounded border px-2 text-xs underline hover:bg-muted">Link</button>
          </div>
          <textarea id={`${formId}-passage`} name="passage" required rows={10} value={passage} onChange={(event) => setPassage(event.target.value)} placeholder="Paste the complete reading passage" className={textareaClass} />
        </Field>
        <Field label="Instructions *" htmlFor={`${formId}-instructions`}>
          <input id={`${formId}-instructions`} name="instructions" required defaultValue={task?.instructions ?? ''} placeholder="e.g. Choose the correct letter, A, B, C or D." className={inputClass} />
        </Field>
      </section>

      {questionType === 'Summary/Note/Table/Flow-Chart Completion' && (
        <Field label="Completion type" htmlFor={`${formId}-completionType`}>
          <select id={`${formId}-completionType`} name="completionType" defaultValue={task?.completionType ?? 'Summary'} className={inputClass}>
            <option>Summary</option><option>Note</option><option>Table</option><option>Flow Chart</option>
          </select>
        </Field>
      )}

      {questionType === 'Diagram Label Completion' && (
        <Field label="Diagram image *" htmlFor={`${formId}-diagram`} hint="PNG, JPG, WEBP or SVG.">
          <label htmlFor={`${formId}-diagram`} className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed p-4 hover:bg-muted/40">
            {uploading ? <LoaderCircle className="size-5 animate-spin" aria-hidden /> : <ImageIcon className="size-5" aria-hidden />}
            <span className="text-sm">{diagramName || (diagramKey ? 'Diagram uploaded — choose to replace it' : 'Choose a diagram')}</span>
            <input id={`${formId}-diagram`} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleDiagramChange} disabled={uploading} className="sr-only" />
          </label>
          {diagramUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- signed R2 URL
            <img src={diagramUrl} alt="Diagram preview" className="mt-3 max-h-64 rounded-lg border object-contain" />
          )}
          {uploadError && <p role="alert" className="mt-2 text-sm text-destructive">{uploadError}</p>}
        </Field>
      )}

      <section aria-labelledby={`${formId}-questions-heading`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 id={`${formId}-questions-heading`} className="text-base font-semibold">Questions and answers</h3>
            <p className="mt-1 text-sm text-muted-foreground">Add up to 100 questions. Drag-free reorder controls are provided for keyboard and touch access.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setPreview((current) => !current)} className="h-9 rounded-lg border px-3 text-sm font-medium hover:bg-muted">
              {preview ? 'Edit content' : 'Preview'}
            </button>
            {!preview && (
              <button
                type="button"
                disabled={questions.length >= 100}
                onClick={() => setQuestions((current) => [...current, {
                  id: `q${current.length + 1}`,
                  text: '',
                  answer: '',
                  options: defaultOptions(questionType),
                }])}
                className="inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium hover:bg-muted disabled:opacity-50"
              >
                <Plus className="size-4" aria-hidden /> Add question
              </button>
            )}
          </div>
        </div>

        <input type="hidden" name="questionsJson" value={questionsJson} />
        {preview ? (
          <div className="mt-4 space-y-5 rounded-xl border bg-background p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Passage preview</p>
              {passage
                ? <ReadingPassage passage={passage} format="markdown" />
                : <p className="mt-2 text-sm text-muted-foreground">Your passage will appear here.</p>}
            </div>
            <ol className="space-y-3">
              {questions.map((question, index) => (
                <li key={`${question.id}-preview-${index}`} className="rounded-lg border p-4">
                  <p className="text-sm font-medium">{index + 1}. {question.text || 'Question text'}</p>
                  {question.options?.map((option) => <p key={option} className="mt-1 pl-5 text-sm text-muted-foreground">{option}</p>)}
                </li>
              ))}
            </ol>
          </div>
        ) : questions.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Add the first question to this practice set.</p>
        ) : (
          <ol className="mt-4 space-y-4">
            {questions.map((question, index) => (
              <li
                key={`${question.id}-${index}`}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData('text/plain', String(index));
                  event.dataTransfer.effectAllowed = 'move';
                  setDraggingQuestion(index);
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const from = Number(event.dataTransfer.getData('text/plain'));
                  if (Number.isInteger(from)) reorderQuestion(from, index);
                  setDraggingQuestion(null);
                }}
                onDragEnd={() => setDraggingQuestion(null)}
                className={`rounded-xl border bg-background p-4 ${draggingQuestion === index ? 'opacity-50' : ''}`}
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h4 className="text-sm font-semibold">Question {index + 1}</h4>
                  <div className="flex items-center gap-1">
                    <button type="button" aria-label={`Move question ${index + 1} up`} disabled={index === 0} onClick={() => moveQuestion(index, -1)} className="flex size-8 items-center justify-center rounded-md hover:bg-muted disabled:opacity-40"><ArrowUp className="size-4" aria-hidden /></button>
                    <button type="button" aria-label={`Move question ${index + 1} down`} disabled={index === questions.length - 1} onClick={() => moveQuestion(index, 1)} className="flex size-8 items-center justify-center rounded-md hover:bg-muted disabled:opacity-40"><ArrowDown className="size-4" aria-hidden /></button>
                    <button type="button" aria-label={`Remove question ${index + 1}`} onClick={() => setQuestions((current) => current.filter((_, i) => i !== index))} className="flex size-8 items-center justify-center rounded-md text-destructive hover:bg-destructive/10"><X className="size-4" aria-hidden /></button>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Question *" htmlFor={`${formId}-q${index}-text`} className="md:col-span-2">
                    <textarea
                      id={`${formId}-q${index}-text`}
                      value={question.text}
                      onChange={(event) => updateQuestion(index, { text: event.target.value })}
                      rows={2}
                      placeholder={questionType.includes('Matching') ? 'Statement or paragraph to match' : 'Enter the question or sentence with a blank'}
                      className={textareaClass}
                    />
                  </Field>
                  <Field
                    label={questionType.includes('Matching') ? 'Matching choices (one per line)' : 'Answer choices (one per line)'}
                    htmlFor={`${formId}-q${index}-options`}
                    hint={questionType.includes('Matching') ? 'Include the paragraph, heading, feature, or sentence-ending labels.' : undefined}
                  >
                    <textarea
                      id={`${formId}-q${index}-options`}
                      value={question.options?.join('\n') ?? ''}
                      onChange={(event) => updateQuestion(index, { options: event.target.value.split('\n').map((option) => option.trim()).filter(Boolean) })}
                      rows={3}
                      placeholder={questionType === 'Identifying Information' ? 'TRUE\nFALSE\nNOT GIVEN' : questionType === "Identifying Writer's Views" ? 'YES\nNO\nNOT GIVEN' : questionType === 'Multiple Choice' ? 'Option A\nOption B\nOption C\nOption D' : 'Optional answer choices'}
                      className={textareaClass}
                    />
                  </Field>
                  <div className="space-y-3">
                    <Field label={`${questionType.includes('Matching') ? 'Correct match' : 'Correct answer'} *`} htmlFor={`${formId}-q${index}-answer`}>
                      <input id={`${formId}-q${index}-answer`} value={question.answer} onChange={(event) => updateQuestion(index, { answer: event.target.value })} className={inputClass} />
                    </Field>
                    <Field label="Alternative accepted answers" htmlFor={`${formId}-q${index}-alternatives`} hint="One accepted answer per line.">
                      <textarea id={`${formId}-q${index}-alternatives`} value={question.alternativeAnswers?.join('\n') ?? ''} onChange={(event) => updateQuestion(index, { alternativeAnswers: event.target.value.split('\n').map((answer) => answer.trim()).filter(Boolean) })} rows={2} className={textareaClass} />
                    </Field>
                  </div>
                  <div className="space-y-3">
                    <Field label="Maximum words" htmlFor={`${formId}-q${index}-wordLimit`}>
                      <input id={`${formId}-q${index}-wordLimit`} type="number" min={1} value={question.wordLimit ?? ''} onChange={(event) => updateQuestion(index, { wordLimit: Number(event.target.value) || undefined })} className={inputClass} />
                    </Field>
                    <Field label="Explanation" htmlFor={`${formId}-q${index}-explanation`}>
                      <textarea id={`${formId}-q${index}-explanation`} value={question.explanation ?? ''} onChange={(event) => updateQuestion(index, { explanation: event.target.value })} rows={3} className={textareaClass} />
                    </Field>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {error && <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">{error}</p>}
      <div className="flex justify-end border-t pt-5">
        <button type="submit" disabled={pending || uploading || loading} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
          {(pending || loading) && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
          {taskId ? 'Save practice set' : 'Create practice set'}
        </button>
      </div>
    </form>
  );

  if (!taskId) return editor;
  return (
    <>
      {open && (
        <div role="dialog" aria-modal="true" aria-label={`Edit ${label ?? 'reading task'}`} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !pending && setOpen(false)}>
          <div onClick={(event) => event.stopPropagation()} className="flex max-h-[92vh] w-full max-w-4xl flex-col rounded-2xl border bg-card text-card-foreground shadow-lg">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-base font-semibold">Edit {label ?? 'practice set'}</h2>
              <button type="button" onClick={() => setOpen(false)} disabled={pending} aria-label="Close edit dialog" className="flex size-8 items-center justify-center rounded-lg hover:bg-muted"><X className="size-4" aria-hidden /></button>
            </div>
            <div className="min-h-0 overflow-y-auto p-6">
              {error && !task && <p role="alert" className="mb-4 flex items-center gap-2 text-sm text-destructive"><CircleAlert className="size-4" aria-hidden />{error}</p>}
              {loading && <p className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" aria-hidden />Loading practice set…</p>}
              {task && editor}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
