import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';
import { getAttemptCounts } from '@/lib/attempts';
import Link from 'next/link';
import { ArrowUpRight, Lock } from 'lucide-react';
import { PracticeShell } from '@/components/practice/practice-shell';

const MAX_ATTEMPTS = 3;

async function getStudentId() {
  const sessionCookie = (await cookies()).get('session')?.value!;
  const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
  return decoded.uid;
}

export default async function ReadingTaskListPage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;
  const questionType = decodeURIComponent(type);
  const studentId = await getStudentId();

  const tasksSnap = await adminDb
    .collection('readingTasks')
    .where('questionType', '==', questionType)
    .orderBy('taskNumber')
    .get();

  const tasks = tasksSnap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as { taskNumber: number }),
  }));
  const attemptCounts = await getAttemptCounts(studentId, 'reading', questionType);

  return (
    <PracticeShell
      crumbs={[{ label: 'Reading', href: '/practice/reading' }, { label: questionType }]}
    >
      <div className="max-w-2xl">
        <h1 className="font-serif text-3xl tracking-tight text-balance sm:text-4xl">{questionType}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
          Each task is timed. You get {MAX_ATTEMPTS} attempts per task.
        </p>
      </div>

      {tasks.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed bg-muted/40 p-10 text-center">
          <p className="font-medium">No tasks here yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            There are no tasks for this question type. Try another one for now.
          </p>
          <Link
            href="/practice/reading"
            className="mt-5 inline-flex h-10 items-center rounded-lg border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
          >
            Back to question types
          </Link>
        </div>
      ) : (
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tasks.map((task) => {
            const used = attemptCounts[task.id] || 0;
            const locked = used >= MAX_ATTEMPTS;
            const status = locked
              ? 'No attempts left'
              : used === 0
                ? 'Not started'
                : `${used} of ${MAX_ATTEMPTS} attempts used`;

            const meter = (
              <div className="flex gap-1.5" aria-hidden>
                {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 flex-1 rounded-full ${
                      i < used ? (locked ? 'bg-muted-foreground/50' : 'bg-primary') : 'bg-border'
                    }`}
                  />
                ))}
              </div>
            );

            if (locked) {
              return (
                <li key={task.id}>
                  <div
                    aria-disabled="true"
                    className="flex h-full min-h-36 flex-col justify-between gap-6 rounded-xl border border-dashed bg-muted/40 p-5 text-muted-foreground"
                  >
                    <div className="flex items-start justify-between">
                      <h3 className="font-serif text-2xl tracking-tight">Task {task.taskNumber}</h3>
                      <Lock className="size-5" aria-hidden />
                    </div>
                    <div className="space-y-2">
                      {meter}
                      <p className="text-sm">{status}</p>
                    </div>
                  </div>
                </li>
              );
            }

            return (
              <li key={task.id}>
                <Link
                  href={`/practice/reading/${type}/${task.id}`}
                  className="group flex h-full min-h-36 flex-col justify-between gap-6 rounded-xl border bg-card p-5 text-card-foreground transition-[transform,box-shadow,border-color] hover:border-foreground/25 hover:shadow-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 motion-safe:hover:-translate-y-0.5"
                >
                  <div className="flex items-start justify-between">
                    <h3 className="font-serif text-2xl tracking-tight">Task {task.taskNumber}</h3>
                    <ArrowUpRight
                      className="size-5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                      aria-hidden
                    />
                  </div>
                  <div className="space-y-2">
                    {meter}
                    <p className="text-sm text-muted-foreground">{status}</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </PracticeShell>
  );
}