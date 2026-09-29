import { ImageIcon } from 'lucide-react';
import { adminDb } from '@/lib/firebase-admin';
import { AddTaskPanel, PageHeader } from '@/components/admin/ui';
import DeleteTaskButton from '@/components/admin/delete-task-button';
import { WRITING_CATEGORIES, WRITING_PARTS, type WritingPart } from '@/lib/writing-config';
import AddWritingForm from './AddWritingForm';
import { deleteWritingPrompt } from './actions';

export default async function AdminWritingContentPage() {
  // Uses the taskPart + category + questionNumber composite index already in firestore.indexes.json
  const snap = await adminDb
    .collection('writingPrompts')
    .orderBy('taskPart')
    .orderBy('category')
    .orderBy('questionNumber')
    .get();

  const prompts = snap.docs.map((d) => ({
    id: d.id,
    taskPart: d.get('taskPart') as WritingPart,
    category: d.get('category') as string,
    questionNumber: d.get('questionNumber') as number,
    prompt: d.get('prompt') as string,
    hasImage: !!d.get('imageKey'),
  }));

  return (
    <>
      <PageHeader
        title="Writing content"
        description="Add the Task 1 visuals and Task 2 essay questions students practice with. Task 1 has 5 questions per category, Task 2 has 10."
      />

      <AddTaskPanel title="Add a writing question">
        <AddWritingForm />
      </AddTaskPanel>

      <div className="space-y-12">
        {(Object.keys(WRITING_PARTS) as WritingPart[]).map((part) => {
          const cfg = WRITING_PARTS[part];
          return (
            <section key={part}>
              <h2 className="mb-5 text-lg font-semibold tracking-tight">{cfg.label}</h2>
              <div className="space-y-6">
                {WRITING_CATEGORIES.filter((c) => c.part === part).map((c) => {
                  const items = prompts.filter((p) => p.taskPart === part && p.category === c.name);
                  const full = items.length >= cfg.perCategory;
                  return (
                    <div key={c.slug}>
                      <div className="mb-3 flex items-baseline justify-between gap-4">
                        <h3 className="text-sm font-semibold">{c.name}</h3>
                        <span className={`text-xs tabular-nums ${items.length === 0 ? 'text-destructive' : full ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                          {items.length} / {cfg.perCategory}
                        </span>
                      </div>
                      {items.length === 0 ? (
                        <p className="rounded-xl border border-dashed bg-muted/40 px-5 py-4 text-sm text-muted-foreground">No questions yet</p>
                      ) : (
                        <ul className="divide-y overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-sm">
                          {items.map((p) => (
                            <li key={p.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                              <div className="flex min-w-0 items-center gap-3">
                                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium tabular-nums">
                                  {p.questionNumber}
                                </span>
                                <p className="line-clamp-1 text-sm">{p.prompt}</p>
                                {p.hasImage && <ImageIcon className="size-3.5 shrink-0 text-muted-foreground" aria-label="Has a visual" />}
                              </div>
                              <DeleteTaskButton action={deleteWritingPrompt.bind(null, p.id)} label={`${c.name} question ${p.questionNumber}`} />
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}