import { Shield } from 'lucide-react';
import { PageHeader, AddTaskPanel } from '@/components/admin/ui';
import DeleteTaskButton from '@/components/admin/delete-task-button';
import { listStudentsWithStats } from '@/lib/students';
import { listAdmins } from '@/lib/admins';
import AddStudentForm from './AddStudentForm';
import AddAdminForm from './AddAdminForm';
import { deleteStudent, toggleStudentStatus, deleteAdmin } from './actions';
import EditStudentDialog from './EditStudentDialog';
import ResetAttemptsButton from './ResetAttemptsButton';

function ProgressBar({ done, total }: { done: number; total: number }) {
  const percent = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="w-28">
      <div
        className="h-1.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
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

export default async function AdminStudentsPage() {
  const [students, admins] = await Promise.all([listStudentsWithStats(), listAdmins()]);

  return (
    <>
      <PageHeader title="Students" description="Add student accounts and see how each one is progressing." />

      <AddTaskPanel title="Add a student">
        <AddStudentForm />
      </AddTaskPanel>

      <h2 className="mb-5 text-lg font-semibold tracking-tight">All students ({students.length})</h2>

      {students.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-muted/40 p-10 text-center">
          <p className="font-medium">No students yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Add the first one above.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wider text-muted-foreground">
                  <th scope="col" className="px-5 py-3 font-medium">
                    Student
                  </th>
                  <th scope="col" className="px-5 py-3 font-medium">
                    Email
                  </th>
                  <th scope="col" className="px-5 py-3 font-medium">
                    Status
                  </th>
                  <th scope="col" className="px-5 py-3 font-medium">
                    Reading
                  </th>
                  <th scope="col" className="px-5 py-3 font-medium">
                    Listening
                  </th>
                  <th scope="col" className="px-5 py-3 font-medium">
                    Avg score
                  </th>
                  <th scope="col" className="px-5 py-3 font-medium">
                    Joined
                  </th>
                  <th scope="col" className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {students.map((s) => {
                  const initials = s.username.slice(0, 2).toUpperCase();
                  return (
                    <tr key={s.uid}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                            {initials}
                          </span>
                          <p className="truncate font-medium">{s.username}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground">{s.email}</td>
                      <td className="px-5 py-3.5">
                        <StatusBadge uid={s.uid} status={s.accountStatus} />
                      </td>
                      <td className="px-5 py-3.5">
                        <ProgressBar done={s.reading.done} total={s.reading.total} />
                      </td>
                      <td className="px-5 py-3.5">
                        <ProgressBar done={s.listening.done} total={s.listening.total} />
                      </td>
                      <td className="px-5 py-3.5 tabular-nums">
                        {s.avgScorePercent === null ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          `${s.avgScorePercent}%`
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
  <div className="flex items-center justify-end gap-1">
    <EditStudentDialog uid={s.uid} username={s.username} email={s.email} />
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

      {/* ───────── Admins ───────── */}
      <div className="mt-14">
        <PageHeader
          title="Admin accounts"
          description="Give someone full access to manage content, students and other admins."
        />

        <AddTaskPanel title="Add an admin">
          <AddAdminForm />
        </AddTaskPanel>

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
                    <p className="truncate text-sm font-medium">{a.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.createdAt ? `Joined ${new Date(a.createdAt).toLocaleDateString()}` : 'Join date unknown'}
                    </p>
                  </div>
                </div>
                <DeleteTaskButton action={deleteAdmin.bind(null, a.uid)} label={a.email} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}