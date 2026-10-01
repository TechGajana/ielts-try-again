import { AddTaskPanel, PageHeader } from '@/components/admin/ui';
import DeleteTaskButton from '@/components/admin/delete-task-button';
import LocalTime from '@/components/local-time';
import { listLiveClasses } from '@/lib/live-classes';
import LiveClassForm from './LiveClassForm';
import { deleteLiveClassAction } from './actions';

export default async function AdminLiveClassesPage() {
  const classes = await listLiveClasses();

  return (
    <>
      <PageHeader
        title="Live classes"
        description="Schedule classes with a meeting link. Students only see a class once you grant them access from the Students page."
      />

      <AddTaskPanel title="Schedule a class">
        <LiveClassForm />
      </AddTaskPanel>

      <h2 className="mb-5 text-lg font-semibold tracking-tight">Scheduled classes ({classes.length})</h2>

      {classes.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-muted/40 p-10 text-center">
          <p className="font-medium">No live classes yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Schedule the first one above.</p>
        </div>
      ) : (
        <ul className="divide-y overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-sm">
          {classes.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{c.title}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {c.platform} · <LocalTime ms={c.scheduledAt} />
                </p>
              </div>
              <DeleteTaskButton action={deleteLiveClassAction.bind(null, c.id)} label={c.title} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}