import { adminDb } from '@/lib/firebase-admin';
<<<<<<< HEAD
import { LISTENING_QUESTION_TYPES } from '@/lib/question-types';
import { deleteListeningTask } from './actions';
import { AddTaskPanel, PageHeader } from '@/components/admin/ui';
import TaskList, { type AdminTask } from '@/components/admin/task-list';
import UploadForm from './UploadForm';

export default async function AdminListeningContentPage() {
  // Uses the questionType + taskNumber composite index already in firestore.indexes.json
  const snap = await adminDb.collection('listeningTasks').orderBy('questionType').orderBy('taskNumber').get();

  const tasks: AdminTask[] = snap.docs.map((d) => {
    const data = d.data();
    const audioKey = (data.audioKey as string | undefined) ?? '';
    return {
      id: d.id,
      questionType: data.questionType as string,
      taskNumber: data.taskNumber as number,
      questionCount: (data.questions?.length ?? 0) as number,
      timerMinutes: data.timerMinutes as number | undefined,
      // "listening/1700000000000-track.mp3" -> "track.mp3"
      audioName: audioKey ? audioKey.split('/').pop()?.replace(/^\d+-/, '') : undefined,
    };
  });

  return (
    <>
      <PageHeader
        title="Listening content"
        description="Upload audio and add the questions students answer while they listen."
      />

      <AddTaskPanel title="Add a listening task">
        <UploadForm />
      </AddTaskPanel>

      <h2 className="mb-5 text-lg font-semibold tracking-tight">Existing tasks ({tasks.length})</h2>
      <TaskList tasks={tasks} types={LISTENING_QUESTION_TYPES} deleteAction={deleteListeningTask} />
    </>
=======
import { deleteListeningTask } from './actions';
import UploadForm from './UploadForm';

export default async function AdminListeningContentPage() {
  const snap = await adminDb.collection('listeningTasks').orderBy('questionType').get();
  const tasks = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-semibold mb-6">Manage Listening Content</h1>

      <details className="mb-8 border rounded p-4">
        <summary className="cursor-pointer font-medium">+ Add New Listening Task</summary>
        <div className="mt-4">
          <UploadForm />
        </div>
      </details>

      <h2 className="font-medium mb-3">Existing Tasks ({tasks.length})</h2>
      <div className="space-y-2">
        {tasks.map((t) => (
          <div key={t.id} className="border rounded p-3 flex justify-between items-center">
            <span>{t.questionType} — Task {t.taskNumber} ({t.questions?.length ?? 0} questions)</span>
            <form action={deleteListeningTask.bind(null, t.id)}>
              <button type="submit" className="text-red-600 text-sm">Delete</button>
            </form>
          </div>
        ))}
      </div>
    </div>
>>>>>>> 71d9a4ff2580737881c1d12e6324e871d2954744
  );
}