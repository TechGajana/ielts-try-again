import { AddTaskPanel, PageHeader } from '@/components/admin/ui';
import DeleteTaskButton from '@/components/admin/delete-task-button';
import { listOrganizations } from '@/lib/organizations';
import AddOrganizationForm from './AddOrganizationForm';
import { deleteOrganizationAction } from './actions';

export default async function AdminOrganizationsPage() {
  const orgs = await listOrganizations();

  return (
    <>
      <PageHeader
        title="Institutes"
        description="Add the institutes students belong to. Each one gets its own logo shown on their dashboard."
      />

      <AddTaskPanel title="Add an institute">
        <AddOrganizationForm />
      </AddTaskPanel>

      <h2 className="mb-5 text-lg font-semibold tracking-tight">Existing institutes ({orgs.length})</h2>

      {orgs.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-muted/40 p-10 text-center">
          <p className="font-medium">No institutes yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Add the first one above.</p>
        </div>
      ) : (
        <ul className="divide-y overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-sm">
          {orgs.map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-background">
                  {o.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- signed R2 URL
                    <img src={o.logoUrl} alt={o.name} className="size-full object-contain p-1" />
                  ) : (
                    <span className="text-xs text-muted-foreground">No logo</span>
                  )}
                </span>
                <p className="truncate text-sm font-medium">{o.name}</p>
              </div>
              <DeleteTaskButton action={deleteOrganizationAction.bind(null, o.id)} label={o.name} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}