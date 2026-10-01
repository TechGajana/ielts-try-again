import { AddTaskPanel, PageHeader } from '@/components/admin/ui';
import DeleteTaskButton from '@/components/admin/delete-task-button';
import { listMaterials } from '@/lib/materials';
import MaterialForm from './MaterialForm';
import { deleteMaterialAction } from './actions';

export default async function AdminMaterialsPage() {
  const materials = await listMaterials();

  return (
    <>
      <PageHeader
        title="Study materials"
        description="Upload notes and handouts. Students only see a file once you grant them access from the Students page."
      />

      <AddTaskPanel title="Add a material">
        <MaterialForm />
      </AddTaskPanel>

      <h2 className="mb-5 text-lg font-semibold tracking-tight">Existing materials ({materials.length})</h2>

      {materials.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-muted/40 p-10 text-center">
          <p className="font-medium">No materials yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Add the first one above.</p>
        </div>
      ) : (
        <ul className="divide-y overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-sm">
          {materials.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{m.title}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{m.fileName}</p>
              </div>
              <DeleteTaskButton action={deleteMaterialAction.bind(null, m.id)} label={m.title} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}