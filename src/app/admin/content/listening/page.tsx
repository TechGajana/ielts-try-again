import { adminDb } from '@/lib/firebase-admin';
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
  );
}