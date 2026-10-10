import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

async function getStudentId() {
  const sessionCookie = (await cookies()).get('session')?.value;
  if (!sessionCookie) redirect('/login');
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

  const tasks = tasksSnap.docs
    .filter((doc) => doc.get('status') !== 'Draft')
    .map((doc) => ({
      id: doc.id,
      taskNumber: Number(doc.get('taskNumber')) || 1,
      title: typeof doc.get('title') === 'string' ? doc.get('title') as string : '',
    }));

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
        {tasks.map((task) => {
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
              <h3 className="font-medium">{task.title || `Task ${task.taskNumber}`}</h3>
              <p className="text-sm text-gray-500">{used}/3 attempts used</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}