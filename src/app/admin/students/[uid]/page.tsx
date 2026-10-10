import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AddTaskPanel, PageHeader } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import { getStudentProfile, listBatches } from '@/lib/student-management';
import EditStudentDialog from '../EditStudentDialog';
import { EditPaymentForm, RecordPaymentForm, StudentProfileForm } from '../ManagementForms';

export default async function StudentProfilePage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  const [student, batches] = await Promise.all([getStudentProfile(uid), listBatches()]);
  if (!student) notFound();

  const summary = [
    ['Total fees', student.totalFees.toFixed(2)],
    ['Paid', student.paidFees.toFixed(2)],
    ['Pending', student.pendingFees.toFixed(2)],
    ['Fee status', student.feeStatus],
  ];

  return (
    <>
      <PageHeader title={student.fullName} description={`${student.studentId} · ${student.email}`} />
      <div className="mb-6 flex flex-wrap gap-2">
        <Button asChild variant="outline"><Link href="/admin/students">Back to students</Link></Button>
        <EditStudentDialog uid={student.uid} username={student.username} email={student.email} />
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summary.map(([label, value]) => (
          <div key={label} className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      <div className="mb-8 rounded-2xl border bg-card p-5 shadow-sm">
        <div className="grid gap-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div><p className="text-muted-foreground">Username</p><p className="mt-1 font-medium">{student.username}</p></div>
          <div><p className="text-muted-foreground">Phone</p><p className="mt-1 font-medium">{student.phone || '—'}</p></div>
          <div><p className="text-muted-foreground">Course</p><p className="mt-1 font-medium">{student.course || '—'}</p></div>
          <div><p className="text-muted-foreground">Batch</p><p className="mt-1 font-medium">{student.batchName || 'No batch'}</p></div>
          <div><p className="text-muted-foreground">Current band</p><p className="mt-1 font-medium">{student.currentBand || '—'}</p></div>
          <div><p className="text-muted-foreground">Target band</p><p className="mt-1 font-medium">{student.targetBand || '—'}</p></div>
          <div><p className="text-muted-foreground">Enrollment date</p><p className="mt-1 font-medium">{student.enrollmentDate || '—'}</p></div>
          <div><p className="text-muted-foreground">Student / account status</p><p className="mt-1 font-medium">{student.status} / {student.accountStatus}</p></div>
        </div>
      </div>

      <AddTaskPanel title="Edit student profile">
        <StudentProfileForm student={student} batches={batches} />
      </AddTaskPanel>

      <AddTaskPanel title="Record a payment">
        <RecordPaymentForm uid={student.uid} pendingFees={student.pendingFees} />
      </AddTaskPanel>

      <h2 className="mb-5 text-lg font-semibold tracking-tight">Payment history ({student.payments.length})</h2>
      {student.payments.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-muted/40 p-8 text-center text-sm text-muted-foreground">
          No payments have been recorded for this student.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wider text-muted-foreground">
                  <th scope="col" className="px-5 py-3 font-medium">Date</th>
                  <th scope="col" className="px-5 py-3 font-medium">Amount</th>
                  <th scope="col" className="px-5 py-3 font-medium">Method</th>
                  <th scope="col" className="px-5 py-3 font-medium">Reference / note</th>
                  <th scope="col" className="px-5 py-3 font-medium">Recorded by</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {student.payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-5 py-3.5 whitespace-nowrap text-muted-foreground">
                      {payment.paidAt ? new Date(payment.paidAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-5 py-3.5 font-medium tabular-nums">{payment.amount.toFixed(2)}</td>
                    <td className="px-5 py-3.5">{payment.method}</td>
                    <td className="px-5 py-3.5">
                      <p>{payment.reference || '—'}</p>
                      {payment.note && <p className="max-w-xs truncate text-xs text-muted-foreground">{payment.note}</p>}
                      <EditPaymentForm uid={student.uid} payment={payment} />
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">{payment.recordedBy || '—'}</td>
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
