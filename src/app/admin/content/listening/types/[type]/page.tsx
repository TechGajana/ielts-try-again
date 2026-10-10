import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Copy, ListChecks, Plus, Search } from 'lucide-react';
import { adminDb } from '@/lib/firebase-admin';
import { inputClass, PageHeader } from '@/components/admin/ui';
import DeleteTaskButton from '@/components/admin/delete-task-button';
import {
  listeningTypeFromSlug,
  listeningTypeLabel,
  LISTENING_TYPE_DESCRIPTIONS,
  type ListeningDifficulty,
  type ListeningTaskStatus,
} from '@/lib/listening-content';
import {
  deleteListeningTask,
  duplicateListeningTask,
  setListeningTaskStatus,
} from '../../actions';
import ListeningTaskForm from '../../ListeningTaskForm';

type SearchFilters = {
  q?: string;
  status?: string;
  difficulty?: string;
  section?: string;
  minQuestions?: string;
  maxQuestions?: string;
};

export default async function ListeningTypeAdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ type: string }>;
  searchParams: Promise<SearchFilters>;
}) {
  const [{ type: slug }, filters] = await Promise.all([params, searchParams]);
  const questionType = listeningTypeFromSlug(slug);
  if (!questionType) notFound();

  const snap = await adminDb
    .collection('listeningTasks')
    .where('questionType', '==', questionType)
    .orderBy('taskNumber')
    .get();
  const search = (filters.q ?? '').trim().toLocaleLowerCase();
  const minQuestions = Number(filters.minQuestions) > 0 ? Number(filters.minQuestions) : 0;
  const maxQuestions = Number(filters.maxQuestions) > 0 ? Number(filters.maxQuestions) : Number.POSITIVE_INFINITY;
  const tasks = snap.docs.map((doc) => ({ id: doc.id, data: doc.data() })).filter(({ data }) => {
    const status = data.status === 'Draft' ? 'Draft' : 'Published';
    const difficulty = data.difficulty ?? 'Medium';
    const section = data.section ?? 'Part 1';
    const questions = Array.isArray(data.questions) ? data.questions : [];
    const matchesStatus = !filters.status || filters.status === 'all' || status === filters.status;
    const matchesDifficulty = !filters.difficulty || filters.difficulty === 'all' || difficulty === filters.difficulty;
    const matchesSection = !filters.section || filters.section === 'all' || section === filters.section;
    const matchesQuestionCount = questions.length >= minQuestions && questions.length <= maxQuestions;
    const audioName = String(data.audioTitle ?? data.audioKey ?? '').split('/').pop() ?? '';
    const searchable = [
      data.title,
      data.description,
      data.transcript,
      audioName,
      ...questions.flatMap((question: { id?: string; text?: string; matching?: { item?: string }; completion?: { fieldLabel?: string } }) => [
        question.id,
        question.text,
        question.matching?.item,
        question.completion?.fieldLabel,
      ]),
    ].filter(Boolean).join(' ').toLocaleLowerCase();
    return matchesStatus && matchesDifficulty && matchesSection && matchesQuestionCount && (!search || searchable.includes(search));
  });
  const totalQuestions = snap.docs.reduce((total, doc) => {
    const questions = doc.get('questions');
    return total + (Array.isArray(questions) ? questions.length : 0);
  }, 0);
  const published = snap.docs.filter((doc) => doc.get('status') !== 'Draft').length;
  const nextTaskNumber = snap.docs.reduce((maximum, doc) => Math.max(maximum, Number(doc.get('taskNumber')) || 0), 0) + 1;

  return (
    <>
      <Link href="/admin/content/listening" className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> All Listening question types
      </Link>
      <nav aria-label="Breadcrumb" className="mb-5 text-sm text-muted-foreground">
        <Link href="/admin" className="hover:text-foreground">IELTS Admin</Link>
        <span className="px-2" aria-hidden>›</span>
        <Link href="/admin/content/listening" className="hover:text-foreground">Listening</Link>
        <span className="px-2" aria-hidden>›</span>
        <span className="text-foreground">{listeningTypeLabel(questionType)}</span>
      </nav>
      <PageHeader title={listeningTypeLabel(questionType)} description={LISTENING_TYPE_DESCRIPTIONS[questionType]} />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard label="Practice sets" value={snap.size} />
        <StatCard label="Questions" value={totalQuestions} />
        <StatCard label="Published" value={`${published} of ${snap.size}`} />
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
          <ListeningTaskForm fixedQuestionType={questionType} defaultTaskNumber={nextTaskNumber} />
        </div>
      </details>

      <section aria-labelledby="practice-sets-heading">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="practice-sets-heading" className="text-lg font-semibold tracking-tight">Practice sets</h2>
            <p className="mt-1 text-sm text-muted-foreground">{tasks.length} matching of {snap.size} total</p>
          </div>
          <form method="get" className="grid w-full gap-2 sm:w-auto sm:grid-cols-[minmax(12rem,1fr)_auto_auto_auto_auto_auto_auto]">
            <label className="relative">
              <span className="sr-only">Search sets, audio or questions</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <input name="q" defaultValue={filters.q} placeholder="Search content" className={`${inputClass} pl-9`} />
            </label>
            <select name="status" defaultValue={filters.status ?? 'all'} aria-label="Filter by status" className={inputClass}>
              <option value="all">All statuses</option><option value="Published">Published</option><option value="Draft">Draft</option>
            </select>
            <select name="difficulty" defaultValue={filters.difficulty ?? 'all'} aria-label="Filter by difficulty" className={inputClass}>
              <option value="all">All difficulties</option><option>Easy</option><option>Medium</option><option>Hard</option>
            </select>
            <select name="section" defaultValue={filters.section ?? 'all'} aria-label="Filter by IELTS part" className={inputClass}>
              <option value="all">All parts</option><option>Part 1</option><option>Part 2</option><option>Part 3</option><option>Part 4</option>
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
              const status: ListeningTaskStatus = data.status === 'Draft' ? 'Draft' : 'Published';
              const difficulty: ListeningDifficulty = data.difficulty ?? 'Medium';
              const taskLabel = String(data.title || `Practice set ${data.taskNumber}`);
              const audioName = String(data.audioTitle ?? data.audioKey ?? '').split('/').pop();
              const duration = Number(data.audioDurationSeconds);
              return (
                <li key={id} className="rounded-2xl border bg-card p-5 text-card-foreground shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{taskLabel}</h3>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${status === 'Published' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'}`}>{status}</span>
                        <span className="rounded-full bg-muted px-2.5 py-1 text-xs">{difficulty}</span>
                        <span className="rounded-full bg-muted px-2.5 py-1 text-xs">{data.section ?? 'Part 1'}</span>
                      </div>
                      {data.description && <p className="mt-1 text-sm text-muted-foreground">{data.description}</p>}
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5"><ListChecks className="size-3.5" aria-hidden />{questions.length} questions</span>
                        <span>Set {data.taskNumber}</span>
                        <span>{Number(data.timerMinutes) || 8} min time limit</span>
                        {Number.isFinite(duration) && duration > 0 && <span>Audio {Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}</span>}
                        {data.audioFormat && <span>{data.audioFormat}</span>}
                        {audioName && <span className="truncate">{audioName}</span>}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <form action={duplicateListeningTask.bind(null, id)}>
                        <button type="submit" aria-label={`Duplicate ${taskLabel}`} title="Duplicate as draft" className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
                          <Copy className="size-4" aria-hidden />
                        </button>
                      </form>
                      <form action={setListeningTaskStatus.bind(null, id, status === 'Draft' ? 'Published' : 'Draft')}>
                        <button type="submit" className="h-9 rounded-lg border px-3 text-xs font-medium hover:bg-muted">
                          {status === 'Draft' ? 'Publish' : 'Unpublish'}
                        </button>
                      </form>
                      <DeleteTaskButton action={deleteListeningTask.bind(null, id)} label={taskLabel} />
                    </div>
                  </div>
                  <details className="group mt-4 border-t pt-3">
                    <summary className="cursor-pointer list-none text-sm font-medium text-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 [&::-webkit-details-marker]:hidden">
                      Edit · Preview · Answer key
                    </summary>
                    <div className="pt-5">
                      <ListeningTaskForm fixedQuestionType={questionType} taskId={id} />
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
