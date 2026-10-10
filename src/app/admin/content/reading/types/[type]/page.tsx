import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Copy, ListChecks, Plus, Search } from 'lucide-react';
import { adminDb } from '@/lib/firebase-admin';
import { inputClass, PageHeader } from '@/components/admin/ui';
import DeleteTaskButton from '@/components/admin/delete-task-button';
import {
  READING_TYPE_DESCRIPTIONS,
  readingTypeFromSlug,
} from '@/lib/reading-content';
import { deleteReadingTask, duplicateReadingTask } from '../../actions';
import ReadingTaskForm from '../../ReadingTaskForm';

export default async function ReadingTypeAdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ type: string }>;
  searchParams: Promise<{ q?: string; status?: string; difficulty?: string; minQuestions?: string; maxQuestions?: string }>;
}) {
  const [{ type: slug }, filters] = await Promise.all([params, searchParams]);
  const questionType = readingTypeFromSlug(slug);
  if (!questionType) notFound();

  const snap = await adminDb
    .collection('readingTasks')
    .where('questionType', '==', questionType)
    .orderBy('taskNumber')
    .get();

  const search = (filters.q ?? '').trim().toLocaleLowerCase();
  const minQuestions = Number(filters.minQuestions) > 0 ? Number(filters.minQuestions) : 0;
  const maxQuestions = Number(filters.maxQuestions) > 0 ? Number(filters.maxQuestions) : Number.POSITIVE_INFINITY;
  const tasks = snap.docs
    .map((doc) => ({ id: doc.id, data: doc.data() }))
    .filter((task) => {
      const status = task.data.status === 'Draft' ? 'Draft' : 'Published';
      const difficulty = task.data.difficulty ?? 'Medium';
      const matchesStatus = !filters.status || filters.status === 'all' || status === filters.status;
      const matchesDifficulty = !filters.difficulty || filters.difficulty === 'all' || difficulty === filters.difficulty;
      const questions = Array.isArray(task.data.questions) ? task.data.questions : [];
      const matchesQuestionCount = questions.length >= minQuestions && questions.length <= maxQuestions;
      const searchable = [
        task.data.title,
        task.data.description,
        task.data.passage,
        ...questions.flatMap((question: { id?: string; text?: string }) => [question.id, question.text]),
      ].filter(Boolean).join(' ').toLocaleLowerCase();
      return matchesStatus && matchesDifficulty && matchesQuestionCount && (!search || searchable.includes(search));
    });
  const totalQuestions = snap.docs.reduce(
    (total, doc) => total + (Array.isArray(doc.get('questions')) ? doc.get('questions').length : 0),
    0,
  );
  const published = snap.docs.filter((doc) => doc.get('status') !== 'Draft').length;

  return (
    <>
      <Link href="/admin/content/reading" className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> All reading question types
      </Link>
      <div className="mb-5 text-sm text-muted-foreground">
        <Link href="/admin/content/reading" className="hover:text-foreground">Reading</Link>
        <span className="px-2" aria-hidden>›</span>
        <span className="text-foreground">{questionType}</span>
      </div>
      <PageHeader title={questionType} description={READING_TYPE_DESCRIPTIONS[questionType]} />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Practice sets</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{snap.size}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Questions</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{totalQuestions}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Published</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{published} <span className="text-sm font-normal text-muted-foreground">of {snap.size}</span></p>
        </div>
      </div>

      <details className="group mb-8 overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-4 font-medium focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Plus className="size-4" aria-hidden /></span>
            Add a practice set
          </span>
          <span className="text-sm text-muted-foreground group-open:hidden">Expand</span>
          <span className="hidden text-sm text-muted-foreground group-open:inline">Collapse</span>
        </summary>
        <div className="border-t p-6">
          <ReadingTaskForm fixedQuestionType={questionType} />
        </div>
      </details>

      <section aria-labelledby="practice-sets-heading">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="practice-sets-heading" className="text-lg font-semibold tracking-tight">Practice sets</h2>
            <p className="mt-1 text-sm text-muted-foreground">{tasks.length} matching of {snap.size} total</p>
          </div>
          <form method="get" className="grid w-full gap-2 sm:w-auto sm:grid-cols-[minmax(12rem,1fr)_auto_auto_auto_auto_auto]">
            <label className="relative">
              <span className="sr-only">Search sets, passages or questions</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <input name="q" defaultValue={filters.q} placeholder="Search content" className={`${inputClass} pl-9`} />
            </label>
            <select name="status" defaultValue={filters.status ?? 'all'} aria-label="Filter by status" className={inputClass}>
              <option value="all">All statuses</option><option value="Published">Published</option><option value="Draft">Draft</option>
            </select>
            <select name="difficulty" defaultValue={filters.difficulty ?? 'all'} aria-label="Filter by difficulty" className={inputClass}>
              <option value="all">All difficulties</option><option>Easy</option><option>Medium</option><option>Hard</option>
            </select>
            <input name="minQuestions" type="number" min={0} defaultValue={filters.minQuestions} aria-label="Minimum questions" placeholder="Min Qs" className={inputClass} />
            <input name="maxQuestions" type="number" min={1} defaultValue={filters.maxQuestions} aria-label="Maximum questions" placeholder="Max Qs" className={inputClass} />
            <button type="submit" className="h-11 rounded-lg border px-4 text-sm font-medium hover:bg-muted">Filter</button>
          </form>
        </div>

        {tasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-muted/40 p-10 text-center">
            <p className="font-medium">{snap.empty ? 'No practice sets available.' : 'No sets match these filters.'}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {snap.empty ? `Create your first ${questionType} practice set.` : 'Try changing your search or filters.'}
            </p>
            {snap.empty && <p className="mt-4 text-sm text-primary">Use “Add a practice set” above to get started.</p>}
          </div>
        ) : (
          <ul className="space-y-3">
            {tasks.map(({ id, data }) => {
                const questions = Array.isArray(data.questions) ? data.questions : [];
                const status = data.status === 'Draft' ? 'Draft' : 'Published';
                const difficulty = data.difficulty ?? 'Medium';
                const taskLabel = data.title || `Task ${data.taskNumber}`;
              return (
                  <li key={id} className="rounded-2xl border bg-card p-5 text-card-foreground shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{taskLabel}</h3>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${status === 'Published' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'}`}>{status}</span>
                        <span className="rounded-full bg-muted px-2.5 py-1 text-xs">{difficulty}</span>
                      </div>
                      {data.description && <p className="mt-1 text-sm text-muted-foreground">{data.description}</p>}
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5"><ListChecks className="size-3.5" aria-hidden />{questions.length} questions</span>
                        <span>Task {data.taskNumber}</span>
                        <span>{data.timerMinutes ?? 10} minutes</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <ReadingTaskForm taskId={id} label={taskLabel} />
                      <form action={duplicateReadingTask.bind(null, id)}>
                        <button type="submit" aria-label={`Duplicate ${taskLabel}`} title="Duplicate as draft" className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
                          <Copy className="size-4" aria-hidden />
                        </button>
                      </form>
                      <DeleteTaskButton action={deleteReadingTask.bind(null, id)} label={taskLabel} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
