import Link from 'next/link';
import { PageHeader } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import { listPaymentLedger } from '@/lib/student-management';

export default async function StudentPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const [{ q = '' }, payments] = await Promise.all([searchParams, listPaymentLedger()]);
  const query = q.trim().toLowerCase();
  const filtered = query
    ? payments.filter((payment) =>
        [payment.studentName, payment.email, payment.studentId, payment.method, payment.reference]
          .join(' ')
          .toLowerCase()
          .includes(query),
      )
    : payments;
  const total = filtered.reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <>
      <PageHeader title="Payment history" description="Review student fee payments and their references." />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Button asChild variant="outline"><Link href="/admin/students">Back to students</Link></Button>
        <p className="text-sm text-muted-foreground">
          {filtered.length} payment{filtered.length === 1 ? '' : 's'} · total {total.toFixed(2)}
        </p>
      </div>
      <form method="get" action="/admin/students/payments" className="mb-5 flex gap-2">
        <input
          name="q"
          defaultValue={q}
          aria-label="Search payments"
          placeholder="Search student, method or reference"
          className="h-10 w-72 rounded-lg border bg-background px-3 text-sm"
        />
        <Button type="submit" variant="outline">Search</Button>
      </form>
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-muted/40 p-10 text-center">
          <p className="font-medium">No payments found</p>
          <p className="mt-1 text-sm text-muted-foreground">{payments.length ? 'Try another search.' : 'Recorded payments will appear here.'}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wider text-muted-foreground">
                  <th scope="col" className="px-5 py-3 font-medium">Date</th>
                  <th scope="col" className="px-5 py-3 font-medium">Student</th>
                  <th scope="col" className="px-5 py-3 font-medium">Amount</th>
                  <th scope="col" className="px-5 py-3 font-medium">Method</th>
                  <th scope="col" className="px-5 py-3 font-medium">Reference / note</th>
                  <th scope="col" className="px-5 py-3 font-medium">Recorded by</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((payment) => (
                  <tr key={`${payment.studentId}-${payment.id}`}>
                    <td className="px-5 py-3.5 whitespace-nowrap text-muted-foreground">
                      {payment.paidAt ? new Date(payment.paidAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      {payment.studentName === '(deleted student)' ? (
                        <span>{payment.studentName}</span>
                      ) : (
                        <Link href={`/admin/students/${payment.studentId}`} className="font-medium hover:underline">
                          {payment.studentName}
                        </Link>
                      )}
                      <p className="text-xs text-muted-foreground">{payment.email}</p>
                    </td>
                    <td className="px-5 py-3.5 font-medium tabular-nums">{payment.amount.toFixed(2)}</td>
                    <td className="px-5 py-3.5">{payment.method}</td>
                    <td className="px-5 py-3.5">
                      <p>{payment.reference || '—'}</p>
                      {payment.note && <p className="max-w-xs truncate text-xs text-muted-foreground">{payment.note}</p>}
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
