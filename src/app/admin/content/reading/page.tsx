import { adminDb } from '@/lib/firebase-admin';
import { createReadingTask, deleteReadingTask } from './actions';

const QUESTION_TYPES = [
  'Multiple Choice', 'Identifying Information', "Identifying Writer's Views",
  'Matching Information', 'Matching Headings', 'Matching Features',
  'Matching Sentence Endings', 'Sentence Completion',
  'Summary/Note/Table/Flow-Chart Completion', 'Diagram Label Completion',
  'Short Answer Questions',
];

export default async function AdminReadingContentPage() {
  const snap = await adminDb.collection('readingTasks').orderBy('questionType').get();
  const tasks = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-semibold mb-6">Manage Reading Content</h1>

      <details className="mb-8 border rounded p-4">
        <summary className="cursor-pointer font-medium">+ Add New Reading Task</summary>
        <form action={createReadingTask} className="space-y-3 mt-4">
          <select name="questionType" required className="border rounded p-2 w-full">
            {QUESTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input name="taskNumber" type="number" placeholder="Task Number (1-10)" required className="border rounded p-2 w-full" />
          <textarea name="passage" placeholder="Passage text" required rows={6} className="border rounded p-2 w-full" />
          <input name="instructions" placeholder="Instructions" required className="border rounded p-2 w-full" />
          <input name="timerMinutes" type="number" defaultValue={10} className="border rounded p-2 w-full" />

          <p className="font-medium pt-2">Questions (fill Q1-Q10, options comma-separated, leave blank if unused)</p>
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <div key={n} className="border-t pt-2">
              <input name={`q${n}_text`} placeholder={`Q${n} text`} className="border rounded p-2 w-full mb-1" />
              <input name={`q${n}_options`} placeholder={`Q${n} options (comma-separated, optional)`} className="border rounded p-2 w-full mb-1" />
              <input name={`q${n}_answer`} placeholder={`Q${n} correct answer`} className="border rounded p-2 w-full" />
            </div>
          ))}
          <button type="submit" className="bg-black text-white rounded px-4 py-2 mt-2">Create Task</button>
        </form>
      </details>

      <h2 className="font-medium mb-3">Existing Tasks ({tasks.length})</h2>
      <div className="space-y-2">
        {tasks.map((t) => (
          <div key={t.id} className="border rounded p-3 flex justify-between items-center">
            <span>{t.questionType} — Task {t.taskNumber} ({t.questions?.length ?? 0} questions)</span>
            <form action={deleteReadingTask.bind(null, t.id)}>
              <button type="submit" className="text-red-600 text-sm">Delete</button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}