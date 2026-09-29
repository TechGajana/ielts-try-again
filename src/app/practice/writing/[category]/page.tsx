import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { ArrowUpRight, ImageIcon } from 'lucide-react';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { PracticeShell } from '@/components/practice/practice-shell';
import { MAX_WRITING_ATTEMPTS, WRITING_PARTS, getCategoryBySlug } from '@/lib/writing-config';

async function getStudentId() {
  const sessionCookie = (await cookies()).get('session')?.value!;
  const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
  return decoded.uid;
}

export default async function WritingCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category: slug } = await params;
  const cat = getCategoryBySlug(slug);
  if (!cat) notFound();

  const studentId = await getStudentId();

  const [promptsSnap, attemptsSnap] = await Promise.all([
    adminDb
      .collection('writingPrompts')
      .where('taskPart', '==', cat.part)
      .where('category', '==', cat.name)
      .orderBy('questionNumber')
      .get(),
    adminDb
      .collection('attempts')
      .where('studentId', '==', studentId)
      .where('module', '==', 'writing')
      .select('taskId', 'bandScore')
      .get(),
  ]);

  const stats = new Map<string, { used: number; best: number | null }>();
  for (const d of attemptsSnap.docs) {
    const id = d.get('taskId') as string;
    const s = stats.get(id) ?? { used: 0, best: null };
    s.used += 1;
    const band = d.get('bandScore') as number | undefined;
    if (band != null) s.best = Math.max(s.best ?? 0, band);
    stats.set(id, s);
  }

  const cfg = WRITING_PARTS[cat.part];

  return (
    <PracticeShell crumbs={[{ label: 'Writing', href: '/practice/writing' }, { label: cat.name }]}>
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{cat.name}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
          {cfg.label}. {cfg.timerMinutes} minutes per attempt, about {cfg.targetWords}. You get{' '}
          {MAX_WRITING_ATTEMPTS} attempts per question.
        </p>
      </div>

      {promptsSnap.empty ? (
        <div className="mt-10 rounded-2xl border border-dashed bg-muted/40 p-10 text-center">
          <p className="font-medium">No questions here yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Try another category for now.</p>
        </div>
      ) : (
        <ul className="mt-10 divide-y overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-sm">
          {promptsSnap.docs.map((doc) => {
            const s = stats.get(doc.id) ?? { used: 0, best: null };
            return (
              <li key={doc.id}>
                <Link
                  href={`/practice/writing/${slug}/${doc.id}`}
                  className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/50"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium tabular-nums">
                    {doc.get('questionNumber')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-medium leading-snug">{doc.get('prompt')}</p>
                    <p className="mt-1 flex items-center gap-3 text-xs tabular-nums text-muted-foreground">
                      <span>
                        {s.used} of {MAX_WRITING_ATTEMPTS} attempts used
                      </span>
                      {s.best !== null && <span>Best band {s.best.toFixed(1)}</span>}
                      {doc.get('imageKey') && <ImageIcon className="size-3.5" aria-label="Includes a visual" />}
                    </p>
                  </div>
                  <ArrowUpRight
                    className="size-5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                    aria-hidden
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </PracticeShell>
  );
}