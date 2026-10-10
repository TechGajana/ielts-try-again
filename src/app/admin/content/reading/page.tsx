import Link from 'next/link';
import { ArrowLeft, Plus } from 'lucide-react';
import { adminDb } from '@/lib/firebase-admin';
import { READING_QUESTION_TYPES } from '@/lib/question-types';
import { READING_TYPE_DESCRIPTIONS, readingTypeSlug } from '@/lib/reading-content';
import { PageHeader } from '@/components/admin/ui';
import ReadingTypeGrid from './ReadingTypeGrid';

export default async function AdminReadingContentPage() {
  const tasks = await adminDb.collection('readingTasks').select('questionType', 'questions', 'status').get();
  const summaries = READING_QUESTION_TYPES.map((name) => {
    const typedTasks = tasks.docs.filter((doc) => doc.get('questionType') === name);
    return {
      name,
      slug: readingTypeSlug(name),
      description: READING_TYPE_DESCRIPTIONS[name],
      practiceSets: typedTasks.length,
      questions: typedTasks.reduce((total, doc) => total + (Array.isArray(doc.get('questions')) ? doc.get('questions').length : 0), 0),
      published: typedTasks.filter((doc) => doc.get('status') !== 'Draft').length,
      drafts: typedTasks.filter((doc) => doc.get('status') === 'Draft').length,
    };
  });

  return (
    <>
      <Link href="/admin" className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Admin dashboard
      </Link>
      <PageHeader title="IELTS Reading Practice" description="Manage reading passages, questions, answers and practice content." />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4">
        <p className="text-sm text-muted-foreground">
          {tasks.size} practice {tasks.size === 1 ? 'set' : 'sets'} across {READING_QUESTION_TYPES.length} question types
        </p>
        <Link
          href="#question-types"
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <Plus className="size-4" aria-hidden /> Add new practice set
        </Link>
      </div>

      <section id="question-types" aria-labelledby="reading-question-types">
        <div className="mb-4">
          <h2 id="reading-question-types" className="text-lg font-semibold tracking-tight">Question types</h2>
          <p className="mt-1 text-sm text-muted-foreground">Choose a question type to manage its practice sets.</p>
        </div>
        <ReadingTypeGrid types={summaries} />
      </section>
    </>
  );
}
