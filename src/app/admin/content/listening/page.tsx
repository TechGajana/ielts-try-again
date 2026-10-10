import { adminDb } from '@/lib/firebase-admin';
import { LISTENING_QUESTION_TYPES } from '@/lib/question-types';
import {
  LISTENING_TYPE_DESCRIPTIONS,
  listeningTypeSlug,
  type ListeningDifficulty,
  type ListeningTypeSummary,
} from '@/lib/listening-content';
import { PageHeader } from '@/components/admin/ui';
import Link from 'next/link';
import { ArrowLeft, Plus } from 'lucide-react';
import ListeningTypeGrid from './ListeningTypeGrid';

export default async function AdminListeningContentPage() {
  const tasks = await adminDb
    .collection('listeningTasks')
    .select('questionType', 'questions', 'status', 'difficulty')
    .get();
  const summaries: ListeningTypeSummary[] = LISTENING_QUESTION_TYPES.map((name) => {
    const typedTasks = tasks.docs.filter((doc) => doc.get('questionType') === name);
    const difficulties: Record<ListeningDifficulty, number> = { Easy: 0, Medium: 0, Hard: 0 };
    for (const doc of typedTasks) {
      const difficulty = doc.get('difficulty') as string | undefined;
      if (difficulty === 'Easy' || difficulty === 'Medium' || difficulty === 'Hard') difficulties[difficulty]++;
      else difficulties.Medium++;
    }
    return {
      name,
      slug: listeningTypeSlug(name),
      description: LISTENING_TYPE_DESCRIPTIONS[name],
      practiceSets: typedTasks.length,
      questions: typedTasks.reduce((total, doc) => {
        const questions = doc.get('questions');
        return total + (Array.isArray(questions) ? questions.length : 0);
      }, 0),
      published: typedTasks.filter((doc) => doc.get('status') !== 'Draft').length,
      drafts: typedTasks.filter((doc) => doc.get('status') === 'Draft').length,
      difficulties,
    };
  });

  return (
    <>
      <Link href="/admin" className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Admin dashboard
      </Link>
      <PageHeader
        title="IELTS Listening Practice"
        description="Manage listening audio, questions, answers and practice content."
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4">
        <p className="text-sm text-muted-foreground">
          {tasks.size} practice {tasks.size === 1 ? 'set' : 'sets'} across {LISTENING_QUESTION_TYPES.length} question types
        </p>
        <Link
          href="#question-types"
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <Plus className="size-4" aria-hidden /> Add new practice set
        </Link>
      </div>

      <section id="question-types" aria-labelledby="listening-question-types">
        <div className="mb-4">
          <h2 id="listening-question-types" className="text-lg font-semibold tracking-tight">Question types</h2>
          <p className="mt-1 text-sm text-muted-foreground">Choose a question type to manage its practice sets.</p>
        </div>
        <ListeningTypeGrid types={summaries} />
      </section>
    </>
  );
}