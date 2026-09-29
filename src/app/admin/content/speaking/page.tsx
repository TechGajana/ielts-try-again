import { adminDb } from '@/lib/firebase-admin';
import { AddTaskPanel, PageHeader } from '@/components/admin/ui';
import DeleteTaskButton from '@/components/admin/delete-task-button';
import { DIFFICULTIES, TOTAL_CARDS } from '@/lib/speaking-config';
import AddSpeakingForm from './AddSpeakingForm';
import { deleteSpeakingPrompt } from './actions';

export default async function AdminSpeakingContentPage() {
  const snap = await adminDb.collection('speakingPrompts').orderBy('cardNumber').get();

  const cards = snap.docs.map((d) => ({
    id: d.id,
    cardNumber: d.get('cardNumber') as number,
    topic: d.get('topic') as string,
    difficulty: d.get('difficulty') as string,
  }));

  const countOf = (key: string) => cards.filter((c) => c.difficulty === key).length;

  return (
    <>
      <PageHeader
        title="Speaking content"
        description="Add the Part 2 cue cards students practise with. The plan is 50 cards: 20 easy, 20 medium and 10 challenging."
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border bg-card p-5 text-card-foreground shadow-sm">
          <p className="text-3xl font-bold tabular-nums tracking-tight">
            {cards.length}
            <span className="text-base font-normal text-muted-foreground"> / {TOTAL_CARDS}</span>
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">Cue cards in total</p>
        </div>
        {DIFFICULTIES.map((d) => {
          const n = countOf(d.key);
          return (
            <div key={d.key} className="rounded-2xl border bg-card p-5 text-card-foreground shadow-sm">
              <p className="text-3xl font-bold tabular-nums tracking-tight">
                {n}
                <span className="text-base font-normal text-muted-foreground"> / {d.target}</span>
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">{d.label}</p>
            </div>
          );
        })}
      </div>

      <AddTaskPanel title="Add a cue card">
        <AddSpeakingForm />
      </AddTaskPanel>

      <h2 className="mb-5 text-lg font-semibold tracking-tight">Existing cue cards ({cards.length})</h2>

      {cards.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-muted/40 p-10 text-center">
          <p className="font-medium">No cue cards yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Add the first one above.</p>
        </div>
      ) : (
        <ul className="divide-y overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-sm">
          {cards.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium tabular-nums">
                  {c.cardNumber}
                </span>
                <p className="line-clamp-1 text-sm">{c.topic}</p>
                <span className="shrink-0 rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                  {DIFFICULTIES.find((d) => d.key === c.difficulty)?.label ?? 'Unknown'}
                </span>
              </div>
              <DeleteTaskButton action={deleteSpeakingPrompt.bind(null, c.id)} label={`cue card ${c.cardNumber}`} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}