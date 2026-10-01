import { AddTaskPanel, PageHeader } from '@/components/admin/ui';
import DeleteTaskButton from '@/components/admin/delete-task-button';
import { listRecordings } from '@/lib/recordings';
import UploadForm from './uploadform';
import { deleteRecordingAction } from './actions';

export default async function AdminRecordingsPage() {
  const recordings = await listRecordings();

  return (
    <>
      <PageHeader
        title="Recorded courses"
        description="Upload video lessons. Students only see a video once you grant them access from the Students page."
      />

      <AddTaskPanel title="Add a recording">
        <UploadForm />
      </AddTaskPanel>

      <h2 className="mb-5 text-lg font-semibold tracking-tight">Existing recordings ({recordings.length})</h2>

      {recordings.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-muted/40 p-10 text-center">
          <p className="font-medium">No recordings yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Add the first one above.</p>
        </div>
      ) : (
        <ul className="divide-y overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-sm">
          {recordings.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{r.title}</p>
                {r.description && <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{r.description}</p>}
              </div>
              <DeleteTaskButton action={deleteRecordingAction.bind(null, r.id)} label={r.title} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}