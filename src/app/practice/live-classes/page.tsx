import { CalendarClock, ExternalLink } from 'lucide-react';
import { BackLink } from '@/components/practice/back-link';
import LocalTime from '@/components/local-time';
import { getSessionStudentAccess } from '@/lib/student-access';
import { listLiveClassesForStudent, type LiveClass } from '@/lib/live-classes';

function ClassCard({ c, past }: { c: LiveClass; past?: boolean }) {
  return (
    <li className={`rounded-xl border p-5 ${past ? 'bg-muted/40 text-muted-foreground' : 'bg-card text-card-foreground'}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <span className="rounded-full border px-2.5 py-0.5 text-xs">{c.platform}</span>
          <h2 className="mt-3 text-base font-medium leading-snug tracking-tight">{c.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            <LocalTime ms={c.scheduledAt} />
          </p>
          {c.details && <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{c.details}</p>}
        </div>
        {!past && (
          <a
            href={c.meetingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            Join class
            <ExternalLink className="size-4" aria-hidden />
          </a>
        )}
      </div>
    </li>
  );
}

export default async function LiveClassesPage() {
  const access = await getSessionStudentAccess();
  const classes = await listLiveClassesForStudent(access?.allowedIds ?? []);

  // A class counts as upcoming until 3 hours after it starts
  const cutoff = Date.now() - 3 * 60 * 60 * 1000;
  const upcoming = classes.filter((c) => c.scheduledAt >= cutoff).sort((a, b) => a.scheduledAt - b.scheduledAt);
  const past = classes.filter((c) => c.scheduledAt < cutoff);

  return (
    <div className="min-h-svh bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <BackLink href="/dashboard" label="Dashboard" />

        <div className="mt-8 flex size-12 items-center justify-center rounded-xl border bg-muted shadow-xs">
          <CalendarClock className="size-5" aria-hidden />
        </div>
        <h1 className="mt-6 text-4xl font-bold tracking-tight">Live classes</h1>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
          Times are shown in your local timezone.
        </p>

        {classes.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed bg-muted/40 p-10 text-center">
            <p className="font-medium">No live classes yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Your tutor hasn&apos;t scheduled any classes for you yet.</p>
          </div>
        ) : (
          <>
            <h2 className="mt-10 mb-4 text-lg font-semibold tracking-tight">Upcoming</h2>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming classes.</p>
            ) : (
              <ul className="space-y-4">
                {upcoming.map((c) => (
                  <ClassCard key={c.id} c={c} />
                ))}
              </ul>
            )}

            {past.length > 0 && (
              <>
                <h2 className="mt-10 mb-4 text-lg font-semibold tracking-tight">Past</h2>
                <ul className="space-y-4">
                  {past.map((c) => (
                    <ClassCard key={c.id} c={c} past />
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}