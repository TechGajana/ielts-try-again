import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AddTaskPanel, PageHeader } from '@/components/admin/ui';
import DeleteTaskButton from '@/components/admin/delete-task-button';
import { Button } from '@/components/ui/button';
import { getBatchDetails } from '@/lib/student-management';
import { BatchForm } from '../../ManagementForms';
import { deleteBatchAction } from '../../actions';

export default async function BatchDetailsPage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  const { batchId } = await params;
  const details = await getBatchDetails(batchId);
  if (!details) notFound();
  const { batch, students, totalFees, paidFees, pendingFees } = details;

  return (
    <>
      <PageHeader title={batch.name} description={`${batch.course}${batch.instructor ? ` · ${batch.instructor}` : ''}`} />
      <div className="mb-6 flex flex-wrap gap-2">
        <Button asChild variant="outline"><Link href="/admin/students/batches">Back to batches</Link></Button>
        <Button asChild variant="outline"><Link href="/admin/students">All students</Link></Button>
        {students.length === 0 ? (
          <DeleteTaskButton action={deleteBatchAction.bind(null, batch.id)} label={batch.name} />
        ) : (
          <span className="self-center text-xs text-muted-foreground">Move all students out of this batch before deleting it.</span>
        )}
      </div>

      <AddTaskPanel title="Batch details">
        <BatchForm batch={batch} />
      </AddTaskPanel>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Students', students.length.toString()],
          ['Total fees', totalFees.toFixed(2)],
          ['Paid', paidFees.toFixed(2)],
          ['Pending', pendingFees.toFixed(2)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      <h2 className="mb-5 text-lg font-semibold tracking-tight">Students in this batch ({students.length})</h2>
      {students.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-muted/40 p-8 text-center text-sm text-muted-foreground">
          No students are assigned to this batch.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wider text-muted-foreground">
                  <th scope="col" className="px-5 py-3 font-medium">Student</th>
                  <th scope="col" className="px-5 py-3 font-medium">Email</th>
                  <th scope="col" className="px-5 py-3 font-medium">Course</th>
                  <th scope="col" className="px-5 py-3 font-medium">Fees</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {students.map((student) => (
                  <tr key={student.uid}>
                    <td className="px-5 py-3.5 font-medium">
                      <Link href={`/admin/students/${student.uid}`} className="hover:underline">{student.fullName}</Link>
                      <p className="text-xs text-muted-foreground">{student.studentId}</p>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">{student.email}</td>
                    <td className="px-5 py-3.5">{student.course || '—'}</td>
                    <td className="px-5 py-3.5">{student.feeStatus}</td>
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
