import Link from 'next/link';
import { cookies } from 'next/headers';
import {
  ArrowUpRight,
  BookOpen,
  FileText,
  CalendarClock,
  ClipboardCheck,
  GraduationCap,
  Headphones,
  Mic,
  PenLine,
  Video,
  type LucideIcon,
} from 'lucide-react';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { getOrganization } from '@/lib/organizations';

const MODULES: {
  name: string;
  href: string;
  ready: boolean;
  icon: LucideIcon;
  description: string;
}[] = [
  {
    name: 'Reading',
    href: '/practice/reading',
    ready: true,
    icon: BookOpen,
    description: 'Read passages and answer questions by type.',
  },
  {
    name: 'Listening',
    href: '/practice/listening',
    ready: true,
    icon: Headphones,
    description: 'Listen to audio and answer questions by type.',
  },
  {
    name: 'Writing',
    href: '/practice/writing',
    ready: true,
    icon: PenLine,
    description: 'Respond to Task 1 and Task 2 prompts.',
  },
  {
    name: 'Speaking',
    href: '/practice/speaking',
    ready: true,
    icon: Mic,
    description: 'Practise the Part 2 cue card long turn with AI feedback.',
  },
];

// Half-band steps from 5.0 to 9.0, used for the decorative ruler
const BANDS = [5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9];

async function getSessionStudent() {
  const sessionCookie = (await cookies()).get('session')?.value;
  if (!sessionCookie) return null;
  const decoded = await adminAuth.verifySessionCookie(sessionCookie, true).catch(() => null);
  if (!decoded) return null;

  const studentDoc = await adminDb.collection('students').doc(decoded.uid).get();
  if (!studentDoc.exists) return null;

  const data = studentDoc.data()!;
  const organizationId = (data.organizationId as string | undefined) ?? null;
  const organization = organizationId ? await getOrganization(organizationId) : null;

  return {
    username: (data.username as string) ?? 'Student',
    organization,
  };
}

export default async function DashboardPage() {
  function ResourceLink({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-4 rounded-2xl border border-black/[0.07] bg-white p-5 text-card-foreground shadow-[0_4px_18px_rgba(25,43,35,0.035)] transition-[transform,box-shadow,border-color] hover:-translate-y-0.5 hover:border-[#183b30]/20 hover:shadow-[0_14px_32px_rgba(25,43,35,0.09)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <div className="flex items-center gap-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#edf3ef] text-[#285442] transition-colors group-hover:bg-[#183b30] group-hover:text-white">
          <Icon className="size-5" aria-hidden />
        </div>
        <div>
          <h2 className="text-lg font-medium tracking-tight">{title}</h2>
          <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </div>
      <ArrowUpRight
        className="size-5 shrink-0 text-[#557163] opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100 group-focus-visible:opacity-100"
        aria-hidden
      />
    </Link>
  );
}
  const student = await getSessionStudent();
  const studentName = student?.username ?? 'Student';
  const organization = student?.organization ?? null;

  const firstName = studentName.split(' ')[0];
  const initials = studentName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const availableCount = MODULES.filter((m) => m.ready).length;

  return (
    <div className="flex min-h-svh flex-col bg-[#f6f7f4] text-foreground">
      {/* ───────── Header ───────── */}
      <header className="sticky top-0 z-10 border-b border-black/[0.06] bg-white/85 shadow-[0_1px_0_rgba(18,38,31,0.02)] backdrop-blur-xl">
        <div className="mx-auto flex h-[4.25rem] w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            {organization?.logoUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- signed R2 URL, not a static asset */}
                <img
                  src={organization.logoUrl}
                  alt={organization.name}
                  className="h-9 w-auto max-w-32 object-contain"
                />
                <span className="hidden text-sm font-medium tracking-tight text-muted-foreground sm:block">
                  {organization.name}
                </span>
              </>
            ) : (
              <>
                <div className="flex size-9 items-center justify-center rounded-xl bg-[#183b30] text-white shadow-sm">
                  <GraduationCap className="size-5" aria-hidden />
                </div>
                <span className="text-base font-medium tracking-tight">IELTS Try Again</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm font-medium text-[#52635a] sm:block">{studentName}</span>
            <div
              className="flex size-9 items-center justify-center rounded-full bg-[#e8efe9] text-xs font-semibold text-[#285442] ring-1 ring-[#183b30]/10"
              aria-hidden
            >
              {initials}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        {/* ───────── Welcome banner ───────── */}
        <section className="relative overflow-hidden rounded-[1.75rem] bg-[#183b30] p-7 text-white shadow-[0_22px_60px_rgba(24,59,48,0.18)] sm:p-10 lg:p-12">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-32 size-[28rem] rounded-full bg-[#a9c6a6]/20 blur-3xl"
          />

          <div className="relative flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
            <div className="max-w-md">
              <p className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#b9cfbd]">
                <span className="size-1.5 rounded-full bg-[#b9cfbd]" />
                Your IELTS workspace
              </p>
              <h1 className="font-serif text-3xl leading-tight tracking-tight text-balance sm:text-4xl">
                Welcome back, {firstName}
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-white/70 sm:text-base">
                Choose a module to start practicing. Every attempt is saved to your account.
              </p>
              <Link
                href="/mock-tests"
                className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-[#183b30] shadow-sm transition-colors hover:bg-[#eaf1eb] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white/50"
              >
                <ClipboardCheck className="size-4" aria-hidden />
                Explore full mock tests
                <ArrowUpRight className="size-4" aria-hidden />
              </Link>
            </div>

            {/* Band-score ruler */}
            <div aria-hidden className="hidden w-72 shrink-0 items-end justify-between md:flex">
              {BANDS.map((band, i) => {
                const whole = Number.isInteger(band);
                return (
                  <div
                    key={band}
                    className="flex w-6 flex-col items-center gap-2"
                    style={{ opacity: 0.3 + (i / (BANDS.length - 1)) * 0.7 }}
                  >
                    <span className={`w-px bg-white ${whole ? 'h-9' : 'h-5'}`} />
                    <span className="h-4 text-xs tabular-nums">{whole ? band.toFixed(1) : ''}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ───────── Practice modules ───────── */}
        <section className="mt-12" aria-labelledby="modules-heading">
          <div className="mb-5 flex items-baseline justify-between gap-4">
            <h2 id="modules-heading" className="font-serif text-2xl tracking-tight">
              Practice modules
            </h2>
            <p className="text-sm text-muted-foreground">
              {availableCount} of {MODULES.length} available
            </p>
          </div>

          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {MODULES.map((m) => {
              const Icon = m.icon;

              if (m.ready) {
                return (
                  <li key={m.name}>
                    <Link
                      href={m.href}
                      className="group flex h-full min-h-48 flex-col justify-between gap-8 rounded-2xl border border-black/[0.07] bg-white p-5 text-card-foreground shadow-[0_4px_18px_rgba(25,43,35,0.035)] transition-[transform,box-shadow,border-color] hover:-translate-y-1 hover:border-[#183b30]/20 hover:shadow-[0_14px_32px_rgba(25,43,35,0.09)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex size-11 items-center justify-center rounded-xl bg-[#edf3ef] text-[#285442] transition-colors group-hover:bg-[#183b30] group-hover:text-white">
                          <Icon className="size-5" aria-hidden />
                        </div>
                        <ArrowUpRight
                          className="size-5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                          aria-hidden
                        />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium tracking-tight">{m.name}</h3>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                          {m.description}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              }

              return (
                <li key={m.name}>
                  <div
                    aria-disabled="true"
                    className="flex h-full min-h-44 flex-col justify-between gap-8 rounded-xl border border-dashed bg-muted/40 p-5 text-muted-foreground"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex size-11 items-center justify-center rounded-lg bg-muted">
                        <Icon className="size-5" aria-hidden />
                      </div>
                      <span className="rounded-full border border-dashed px-2.5 py-0.5 text-xs">
                        Coming soon
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium tracking-tight">{m.name}</h3>
                      <p className="mt-1 text-sm leading-relaxed">{m.description}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* ───────── Full mock test ───────── */}
        <section className="mt-6">
          <Link
            href="/mock-tests"
            className="group flex flex-col gap-4 rounded-xl border bg-card p-5 text-card-foreground transition-[box-shadow,border-color] hover:border-foreground/25 hover:shadow-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <ClipboardCheck className="size-5" aria-hidden />
              </div>
              <div>
                <h2 className="text-lg font-medium tracking-tight">Full mock test</h2>
                <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                  Listening, Reading and Writing in one sitting. Each mock can be attempted once.
                </p>
              </div>
            </div>
            <ArrowUpRight
              className="size-5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
              aria-hidden
            />
          </Link>
        </section>

        {/* ───────── Recorded courses ───────── */}
        <section className="mt-6">
          <Link
            href="/practice/recordings"
            className="group flex flex-col gap-4 rounded-xl border bg-card p-5 text-card-foreground transition-[box-shadow,border-color] hover:border-foreground/25 hover:shadow-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Video className="size-5" aria-hidden />
              </div>
              <div>
                <h2 className="text-lg font-medium tracking-tight">Recorded courses</h2>
                <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                  Video lessons shared with you by your tutor.
                </p>
              </div>
            </div>
            <ArrowUpRight
              className="size-5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
              aria-hidden
            />
          </Link>
        </section>
      </main>

{/* ───────── Notes & live classes ───────── */}
<section className="mt-6 grid gap-6 md:grid-cols-2">
  <ResourceLink
    href="/practice/materials"
    icon={FileText}
    title="Notes & study materials"
    description="Handouts and notes shared by your tutor."
  />
  <ResourceLink
    href="/practice/live-classes"
    icon={CalendarClock}
    title="Live classes"
    description="Upcoming sessions and meeting links."
  />
</section>

      {/* ───────── Footer ───────── */}
      <footer className="py-6 text-center text-xs text-muted-foreground">
        Powered by IELTS Try Again
      </footer>
    </div>
  );
}