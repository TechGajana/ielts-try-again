import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';
import { getAttemptCounts } from '@/lib/attempts';
import Link from 'next/link';
import { BackLink } from '@/components/practice/back-link';

const MAX_ATTEMPTS = 3;

async function getStudentId() {
  const sessionCookie = (await cookies()).get('session')?.value!;
  const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
  return decoded.uid;
}

export default async function ListeningTaskListPage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;
  const questionType = decodeURIComponent(type);
  const studentId = await getStudentId();

  const tasksSnap = await adminDb
    .collection('listeningTasks')
    .where('questionType', '==', questionType)
    .orderBy('taskNumber')
    .get();

  const tasks = tasksSnap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as { taskNumber: number }),
  }));
  const attemptCounts = await getAttemptCounts(studentId, 'listening', questionType);

  return (
    <div className="min-h-svh bg-muted/30">
      <div className="mx-auto max-w-2xl px-6 py-10">
        <BackLink href="/practice/listening" label="Listening" />

        <h1 className="mt-6 font-serif text-4xl tracking-tight">{questionType}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Each task is timed. You get {MAX_ATTEMPTS} attempts per task.
        </p>

        {tasks.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed bg-background/60 p-10 text-center">
            <p className="font-medium">No tasks here yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Check back soon, or try another question type.</p>
          </div>
        ) : (
          <ul className="mt-8 space-y-4">
            {tasks.map((task) => {
              const used = attemptCounts[task.id] || 0;
              const locked = used >= MAX_ATTEMPTS;
              const status = locked
                ? 'No attempts left'
                : used === 0
                  ? 'Not started'
                  : `${used} of ${MAX_ATTEMPTS} attempts used`;

              const meter = (
                <div className="mt-5 flex gap-1.5" aria-hidden>
                  {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 flex-1 rounded-full ${
                        i < used ? (locked ? 'bg-muted-foreground/40' : 'bg-primary') : 'bg-muted'
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
                      className="rounded-2xl border bg-background/60 p-6 shadow-sm"
                    >
                      <h2 className="font-serif text-xl tracking-tight text-muted-foreground">
                        Task {task.taskNumber}
                      </h2>
                      {meter}
                      <p className="mt-2 text-sm text-muted-foreground">{status}</p>
                    </div>
                  </li>
                );
              }

              return (
                <li key={task.id}>
                  <Link
                    href={`/practice/listening/${type}/${task.id}`}
                    className="block rounded-2xl border bg-background p-6 shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <h2 className="font-serif text-xl tracking-tight">Task {task.taskNumber}</h2>
                    {meter}
                    <p className="mt-2 text-sm text-muted-foreground">{status}</p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}