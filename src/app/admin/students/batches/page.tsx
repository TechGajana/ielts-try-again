import Link from 'next/link';
import { PageHeader, AddTaskPanel } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import { listBatches } from '@/lib/student-management';
import { BatchForm } from '../ManagementForms';

export default async function BatchesPage() {
  const batches = await listBatches();

  return (
    <>
      <PageHeader title="Batches" description="Create and manage course cohorts and their enrollment dates." />
      <div className="mb-6">
        <Button asChild variant="outline"><Link href="/admin/students">Back to students</Link></Button>
      </div>
      <AddTaskPanel title="Create a batch">
        <BatchForm />
      </AddTaskPanel>

      <h2 className="mb-5 text-lg font-semibold tracking-tight">All batches ({batches.length})</h2>
      {batches.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-muted/40 p-10 text-center">
          <p className="font-medium">No batches yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Create a batch before enrolling students into one.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wider text-muted-foreground">
                  <th scope="col" className="px-5 py-3 font-medium">Batch</th>
                  <th scope="col" className="px-5 py-3 font-medium">Course</th>
                  <th scope="col" className="px-5 py-3 font-medium">Instructor</th>
                  <th scope="col" className="px-5 py-3 font-medium">Students</th>
                  <th scope="col" className="px-5 py-3 font-medium">Dates</th>
                  <th scope="col" className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {batches.map((batch) => (
                  <tr key={batch.id}>
                    <td className="px-5 py-3.5 font-medium">
                      <Link className="hover:underline" href={`/admin/students/batches/${batch.id}`}>{batch.name}</Link>
                    </td>
                    <td className="px-5 py-3.5">{batch.course}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{batch.instructor || '—'}</td>
                    <td className="px-5 py-3.5 tabular-nums">{batch.studentCount}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-muted-foreground">
                      {batch.startDate || '—'}{batch.endDate ? ` – ${batch.endDate}` : ''}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${batch.status === 'active' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                        {batch.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
