import { Shield } from 'lucide-react';
import Link from 'next/link';
import { PageHeader, AddTaskPanel } from '@/components/admin/ui';
import DeleteTaskButton from '@/components/admin/delete-task-button';
import { listStudentsWithStats } from '@/lib/students';
import { listAdmins } from '@/lib/admins';
import { listOrganizations } from '@/lib/organizations';
import { getAdminContext } from '@/lib/admin-auth';
import { listBatches } from '@/lib/student-management';
import { listRecordings } from '@/lib/recordings';
import { listMaterials } from '@/lib/materials';
import { listLiveClasses } from '@/lib/live-classes';
import type { AccessGroup } from './AccessPicker';
import AddStudentForm from './AddStudentForm';
import AddAdminForm from './AddAdminForm';
import EditStudentDialog from './EditStudentDialog';
import EditStudentCoursesDialog from './EditStudentCoursesDialog';
import ResetAttemptsButton from './ResetAttemptsButton';
import { changeAdminRole, deleteStudent, toggleStudentStatus, deleteAdmin } from './actions';
import { Button } from '@/components/ui/button';

function ProgressBar({ done, total }: { done: number; total: number }) {
  const percent = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="w-28">
      <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-foreground" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-1 text-xs tabular-nums text-muted-foreground">
        {done}/{total}
      </p>
    </div>
  );
}

function StatusBadge({ uid, status }: { uid: string; status: string }) {
  const active = status === 'active';
  return (
    <form action={toggleStudentStatus.bind(null, uid, status)}>
      <button
        type="submit"
        className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
          active
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400'
            : 'border-amber-500/30 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-400'
        }`}
        title="Click to toggle"
      >
        {active ? 'Active' : 'Suspended'}
      </button>
    </form>
  );
}

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const [{ q = '' }, admin] = await Promise.all([searchParams, getAdminContext()]);
  if (!admin) return null;
  const [students, admins, organizations, recordings, materials, liveClasses, batches] = await Promise.all([
    listStudentsWithStats(),
    listAdmins(),
    listOrganizations(),
    listRecordings(),
    listMaterials(),
    listLiveClasses(),
    listBatches(),
  ]);
  const normalizedQuery = q.trim().toLowerCase();
  const primaryAdminCount = admins.filter((item) => item.role === 'PRIMARY_ADMIN').length;
  const filteredStudents = normalizedQuery
    ? students.filter((student) =>
        [student.studentId, student.fullName, student.username, student.email, student.phone, student.batchName]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery),
      )
    : students;

  const accessGroups: AccessGroup[] = [
    { label: 'Recorded courses', items: recordings.map((r) => ({ id: r.id, title: r.title })) },
    { label: 'Study materials', items: materials.map((m) => ({ id: m.id, title: m.title })) },
    { label: 'Live classes', items: liveClasses.map((c) => ({ id: c.id, title: c.title })) },
  ];

  return (
    <>
      <PageHeader title="Students" description="Manage student profiles, batches, course access and fees." />

      <div className="mb-7 flex flex-wrap gap-2">
        <Button asChild variant="outline"><Link href="/admin/students/batches">Manage batches</Link></Button>
        <Button asChild variant="outline"><Link href="/admin/students/payments">Payment history</Link></Button>
      </div>

      <AddTaskPanel title="Add a student">
        <AddStudentForm
          organizations={organizations.map((o) => ({ id: o.id, name: o.name }))}
          accessGroups={accessGroups}
          batches={batches}
        />
      </AddTaskPanel>

      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <h2 className="text-lg font-semibold tracking-tight">All students ({filteredStudents.length})</h2>
        <form method="get" action="/admin/students" className="flex gap-2">
          <input
            name="q"
            defaultValue={q}
            aria-label="Search students"
            placeholder="Search name, ID, email or batch"
            className="h-10 w-64 rounded-lg border bg-background px-3 text-sm"
          />
          <Button type="submit" variant="outline">Search</Button>
        </form>
      </div>

      {filteredStudents.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-muted/40 p-10 text-center">
          <p className="font-medium">{students.length ? 'No students matched your search' : 'No students yet'}</p>
          <p className="mt-1 text-sm text-muted-foreground">{students.length ? 'Try another name, email, ID or batch.' : 'Add the first one above.'}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wider text-muted-foreground">
                  <th scope="col" className="px-5 py-3 font-medium">Student</th>
                  <th scope="col" className="px-5 py-3 font-medium">Contact</th>
                  <th scope="col" className="px-5 py-3 font-medium">Course / batch</th>
                  <th scope="col" className="px-5 py-3 font-medium">Status</th>
                  <th scope="col" className="px-5 py-3 font-medium">Fees</th>
                  <th scope="col" className="px-5 py-3 font-medium">Reading</th>
                  <th scope="col" className="px-5 py-3 font-medium">Listening</th>
                  <th scope="col" className="px-5 py-3 font-medium">Avg score</th>
                  <th scope="col" className="px-5 py-3 font-medium">Joined</th>
                  <th scope="col" className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredStudents.map((s) => {
                  const initials = s.username.slice(0, 2).toUpperCase();
                  return (
                    <tr key={s.uid}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                            {initials}
                          </span>
                          <div className="min-w-0">
                            <Link href={`/admin/students/${s.uid}`} className="truncate font-medium hover:underline">
                              {s.fullName}
                            </Link>
                            <p className="text-xs text-muted-foreground">{s.studentId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-muted-foreground">{s.email}</p>
                        <p className="text-xs text-muted-foreground">{s.phone || 'No phone listed'}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p>{s.course || '—'}</p>
                        <p className="text-xs text-muted-foreground">{s.batchName || 'No batch'}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge uid={s.uid} status={s.accountStatus} />
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <p className="tabular-nums">{s.paidFees.toFixed(2)} / {s.totalFees.toFixed(2)}</p>
                        <p className={`text-xs ${s.pendingFees ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                          {s.pendingFees.toFixed(2)} pending · {s.feeStatus}
                        </p>
                      </td>
                      <td className="px-5 py-3.5">
                        <ProgressBar done={s.reading.done} total={s.reading.total} />
                      </td>
                      <td className="px-5 py-3.5">
                        <ProgressBar done={s.listening.done} total={s.listening.total} />
                      </td>
                      <td className="px-5 py-3.5 tabular-nums">
                        {s.avgScorePercent === null ? <span className="text-muted-foreground">—</span> : `${s.avgScorePercent}%`}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-muted-foreground">
                        {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/admin/students/${s.uid}`}>Profile</Link>
                          </Button>
                          <EditStudentDialog uid={s.uid} username={s.username} email={s.email} />
                          <EditStudentCoursesDialog
                            uid={s.uid}
                            username={s.username}
                            allowedCourseIds={s.allowedCourseIds}
                            accessGroups={accessGroups}
                          />
                          <ResetAttemptsButton uid={s.uid} label={s.username} />
                          <DeleteTaskButton action={deleteStudent.bind(null, s.uid)} label={s.username} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-14">
        <PageHeader title="Admin accounts" description="Primary admins manage students, institutes and administrator access. Secondary admins can manage the other admin modules." />

        <AddTaskPanel title="Add an admin">
          <AddAdminForm />
        </AddTaskPanel>

        <p className="mb-5 rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Existing administrator accounts without a role level are treated as Primary Admin to preserve their current access.
        </p>
        <h2 className="mb-5 text-lg font-semibold tracking-tight">All admins ({admins.length})</h2>

        {admins.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-muted/40 p-10 text-center">
            <p className="font-medium">No admins yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Add the first one above.</p>
          </div>
        ) : (
          <ul className="divide-y overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-sm">
            {admins.map((a) => (
              <li key={a.uid} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Shield className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{a.displayName || a.email}</p>
                    <p className="truncate text-xs text-muted-foreground">{a.email}{a.phoneNumber ? ` · ${a.phoneNumber}` : ''}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.role === 'PRIMARY_ADMIN' ? 'Primary Admin' : 'Secondary Admin'} · {a.createdAt ? `Joined ${new Date(a.createdAt).toLocaleDateString()}` : 'Join date unknown'}
                    </p>
                  </div>
                </div>
                {a.uid === admin.uid ? (
                  <span className="shrink-0 text-xs text-muted-foreground">Your account</span>
                ) : (
                  <div className="flex shrink-0 items-center gap-2">
                    <form action={changeAdminRole.bind(null, a.uid)} className="flex items-center gap-2">
                      <select
                        name="adminRole"
                        defaultValue={a.role}
                        aria-label={`Role for ${a.email}`}
                        className="h-9 rounded-lg border bg-background px-2 text-xs"
                      >
                        <option value="PRIMARY_ADMIN">Primary Admin</option>
                        <option value="SECONDARY_ADMIN" disabled={a.role === 'PRIMARY_ADMIN' && primaryAdminCount === 1}>
                          Secondary Admin
                        </option>
                      </select>
                      <Button type="submit" size="sm" variant="outline">Update</Button>
                    </form>
                    {!(a.role === 'PRIMARY_ADMIN' && primaryAdminCount === 1) && (
                      <DeleteTaskButton action={deleteAdmin.bind(null, a.uid)} label={a.email} />
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}