import { Clock, ListChecks, Music } from 'lucide-react';
import type { ReactNode } from 'react';
import DeleteTaskButton from './delete-task-button';

export type AdminTask = {
  id: string;
  questionType: string;
  taskNumber: number;
  questionCount: number;
  timerMinutes?: number;
  audioName?: string;
};

export default function TaskList({
  tasks,
  types,
  deleteAction,
  renderEdit,
}: {
  tasks: AdminTask[];
  types: readonly string[];
  deleteAction: (taskId: string) => Promise<void>;
  renderEdit?: (task: AdminTask) => ReactNode;
}) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed bg-muted/40 p-10 text-center">
        <p className="font-medium">No tasks yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Use &ldquo;Add&rdquo; above to create the first one.
        </p>
      </div>
    );
  }

  // Known types first (in your order), then anything else found in the database
  const order = [...types, ...tasks.map((t) => t.questionType).filter((t) => !types.includes(t))];
  const groups = [...new Set(order)]
    .map((type) => ({ type, items: tasks.filter((t) => t.questionType === type) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="space-y-8">
      {groups.map(({ type, items }) => (
        <section key={type} aria-label={type}>
          <div className="mb-3 flex items-baseline justify-between gap-4">
            <h3 className="text-sm font-semibold">{type}</h3>
            <span className="text-xs tabular-nums text-muted-foreground">
              {items.length} {items.length === 1 ? 'task' : 'tasks'}
            </span>
          </div>

          <ul className="divide-y overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-sm">
            {items.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Task {t.taskNumber}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <ListChecks className="size-3.5" aria-hidden />
                      {t.questionCount} questions
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="size-3.5" aria-hidden />
                      {t.timerMinutes ?? '–'} min
                    </span>
                    {t.audioName && (
                      <span className="inline-flex min-w-0 items-center gap-1.5">
                        <Music className="size-3.5 shrink-0" aria-hidden />
                        <span className="truncate">{t.audioName}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  {renderEdit?.(t)}
                  <DeleteTaskButton
                    action={deleteAction.bind(null, t.id)}
                    label={`${type} task ${t.taskNumber}`}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}