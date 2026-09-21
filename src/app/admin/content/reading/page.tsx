import { adminDb } from '@/lib/firebase-admin';
import { READING_QUESTION_TYPES } from '@/lib/question-types';
import { createReadingTask, deleteReadingTask } from './actions';
import { AddTaskPanel, Field, PageHeader, QuestionsSection, TaskBasics, inputClass, textareaClass } from '@/components/admin/ui';
import SubmitButton from '@/components/admin/submit-button';
import TaskList, { type AdminTask } from '@/components/admin/task-list';

export default async function AdminReadingContentPage() {
  // Uses the questionType + taskNumber composite index already in firestore.indexes.json
  const snap = await adminDb.collection('readingTasks').orderBy('questionType').orderBy('taskNumber').get();

  const tasks: AdminTask[] = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      questionType: data.questionType as string,
      taskNumber: data.taskNumber as number,
      questionCount: (data.questions?.length ?? 0) as number,
      timerMinutes: data.timerMinutes as number | undefined,
    };
  });

  return (
    <>
      <PageHeader
        title="Reading content"
        description="Add and remove the passages and questions students practice with."
      />

      <AddTaskPanel title="Add a reading task">
        <form action={createReadingTask} className="space-y-8">
          <TaskBasics types={READING_QUESTION_TYPES} defaultTimer={10} />

          <Field label="Passage" htmlFor="passage">
            <textarea
              id="passage"
              name="passage"
              required
              rows={10}
              placeholder="Paste the reading passage here"
              className={textareaClass}
            />
          </Field>

          <Field label="Instructions" htmlFor="instructions" hint="Shown to students above the questions.">
            <input
              id="instructions"
              name="instructions"
              required
              placeholder="e.g. Choose the correct letter, A, B, C or D."
              className={inputClass}
            />
          </Field>

          <QuestionsSection />

          <div className="flex justify-end border-t pt-6">
            <SubmitButton pendingLabel="Creating…">Create task</SubmitButton>
          </div>
        </form>
      </AddTaskPanel>

      <h2 className="mb-5 text-lg font-semibold tracking-tight">Existing tasks ({tasks.length})</h2>
      <TaskList tasks={tasks} types={READING_QUESTION_TYPES} deleteAction={deleteReadingTask} />
    </>
  );
}