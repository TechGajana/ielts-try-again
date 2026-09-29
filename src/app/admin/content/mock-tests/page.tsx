import { adminDb } from '@/lib/firebase-admin';
import { AddTaskPanel, PageHeader } from '@/components/admin/ui';
import DeleteTaskButton from '@/components/admin/delete-task-button';
import { TOTAL_MOCKS } from '@/lib/mock-config';
import AddMockForm from './AddMockForm';
import { deleteMockTest } from './actions';

export default async function AdminMockTestsPage() {
  const [mocksSnap, listeningSnap, readingSnap, writingSnap] = await Promise.all([
    adminDb.collection('mockTests').orderBy('mockNumber').get(),
    adminDb.collection('listeningTasks').select('questionType', 'taskNumber').get(),
    adminDb.collection('readingTasks').select('questionType', 'taskNumber').get(),
    adminDb.collection('writingPrompts').select('taskPart', 'category', 'questionNumber', 'prompt').get(),
  ]);

  const byLabel = (a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label, undefined, { numeric: true });

  const taskOptions = (docs: typeof listeningSnap.docs) =>
    docs.map((d) => ({ id: d.id, label: `${d.get('questionType')} · Task ${d.get('taskNumber')}` })).sort(byLabel);

  const promptOptions = (part: string) =>
    writingSnap.docs
      .filter((d) => d.get('taskPart') === part)
      .map((d) => ({
        id: d.id,
        label: `${d.get('category')} · Q${d.get('questionNumber')} · ${String(d.get('prompt')).slice(0, 50)}`,
      }))
      .sort(byLabel);

  const mocks = mocksSnap.docs.map((d) => {
    const countQ = (parts: { questions?: unknown[] }[] | undefined) =>
      (parts ?? []).reduce((sum, p) => sum + (p.questions?.length ?? 0), 0);
    return {
      id: d.id,
      mockNumber: d.get('mockNumber') as number,
      title: d.get('title') as string,
      listeningParts: (d.get('listening') ?? []).length as number,
      listeningQuestions: countQ(d.get('listening')),
      readingParts: (d.get('reading') ?? []).length as number,
      readingQuestions: countQ(d.get('reading')),
    };
  });

  return (
    <>
      <PageHeader
        title="Mock tests"
        description="Build the five full-length mock tests from your existing Listening, Reading and Writing content."
      />

      <div className="mb-8 rounded-2xl border bg-card p-5 text-card-foreground shadow-sm">
        <p className="text-3xl font-bold tabular-nums tracking-tight">
          {mocks.length}
          <span className="text-base font-normal text-muted-foreground"> / {TOTAL_MOCKS}</span>
        </p>
        <p className="mt-0.5 text-sm text-muted-foreground">Mock tests created</p>
      </div>

      <AddTaskPanel title="Add a mock test">
        <AddMockForm
          listening={taskOptions(listeningSnap.docs)}
          reading={taskOptions(readingSnap.docs)}
          task1={promptOptions('task1')}
          task2={promptOptions('task2')}
        />
      </AddTaskPanel>

      <h2 className="mb-5 text-lg font-semibold tracking-tight">Existing mock tests ({mocks.length})</h2>

      {mocks.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-muted/40 p-10 text-center">
          <p className="font-medium">No mock tests yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Add the first one above.</p>
        </div>
      ) : (
        <ul className="divide-y overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-sm">
          {mocks.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-4 px-5 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium tabular-nums">
                  {m.mockNumber}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{m.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Listening: {m.listeningParts} parts, {m.listeningQuestions} questions · Reading: {m.readingParts} passages,{' '}
                    {m.readingQuestions} questions · Writing: Task 1 and Task 2
                  </p>
                </div>
              </div>
              <DeleteTaskButton action={deleteMockTest.bind(null, m.id)} label={`mock test ${m.mockNumber}`} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}