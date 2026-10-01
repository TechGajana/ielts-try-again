import { FileText, ExternalLink } from 'lucide-react';
import { BackLink } from '@/components/practice/back-link';
import { getSessionStudentAccess } from '@/lib/student-access';
import { listMaterialsForStudent } from '@/lib/materials';

export default async function MaterialsPage() {
  const access = await getSessionStudentAccess();
  const materials = await listMaterialsForStudent(access?.allowedIds ?? []);

  return (
    <div className="min-h-svh bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <BackLink href="/dashboard" label="Dashboard" />

        <div className="mt-8 flex size-12 items-center justify-center rounded-xl border bg-muted shadow-xs">
          <FileText className="size-5" aria-hidden />
        </div>
        <h1 className="mt-6 text-4xl font-bold tracking-tight">Notes &amp; study materials</h1>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
          Handouts and notes your tutor has shared with you.
        </p>

        {materials.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed bg-muted/40 p-10 text-center">
            <p className="font-medium">No materials yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Your tutor hasn&apos;t shared any notes with you yet.</p>
          </div>
        ) : (
          <ul className="mt-10 grid gap-4 sm:grid-cols-2">
            {materials.map((m) => (
              <li key={m.id}>
                <a
                  href={`/practice/materials/${m.id}/file`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex h-full items-start justify-between gap-4 rounded-xl border bg-card p-5 text-card-foreground transition-[box-shadow,border-color] hover:border-foreground/25 hover:shadow-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <FileText className="size-5" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-base font-medium leading-snug tracking-tight">{m.title}</h2>
                      {m.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{m.description}</p>}
                      <p className="mt-1 truncate text-xs text-muted-foreground">{m.fileName}</p>
                    </div>
                  </div>
                  <ExternalLink className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden />
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}