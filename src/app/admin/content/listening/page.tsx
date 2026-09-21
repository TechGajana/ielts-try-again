import { adminDb } from '@/lib/firebase-admin';
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
  );
}