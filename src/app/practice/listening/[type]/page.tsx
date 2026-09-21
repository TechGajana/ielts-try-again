import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';
import Link from 'next/link';

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

  const tasks = tasksSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const attemptsSnap = await adminDb
    .collection('attempts')
    .where('studentId', '==', studentId)
    .where('questionType', '==', questionType)
    .where('module', '==', 'listening')
    .get();

  const attemptCounts: Record<string, number> = {};
  attemptsSnap.docs.forEach((doc) => {
    const { taskId } = doc.data();
    attemptCounts[taskId] = (attemptCounts[taskId] || 0) + 1;
  });

  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold mb-6">{questionType}</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tasks.map((task: any) => {
          const used = attemptCounts[task.id] || 0;
          const locked = used >= 3;
          return (
            <Link
              key={task.id}
              href={locked ? '#' : `/practice/listening/${type}/${task.id}`}
              className={`border rounded-lg p-6 ${
                locked ? 'opacity-50 pointer-events-none' : 'hover:shadow-md'
              }`}
            >
              <h3 className="font-medium">Task {task.taskNumber}</h3>
              <p className="text-sm text-gray-500">{used}/3 attempts used</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}