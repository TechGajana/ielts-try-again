import Image from 'next/image';
import Link from 'next/link';
import { cookies } from 'next/headers';
import {
  ArrowUpRight,
  BookOpen,
  CalendarClock,
  ClipboardCheck,
  FileText,
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

const RESOURCES: { href: string; icon: LucideIcon; title: string; description: string }[] = [
  {
    href: '/mock-tests',
    icon: ClipboardCheck,
    title: 'Full mock test',
    description: 'Listening, Reading and Writing in one sitting. Each mock can be attempted once.',
  },
  {
    href: '/practice/recordings',
    icon: Video,
    title: 'Recorded courses',
    description: 'Video lessons shared with you by your tutor.',
  },
  {
    href: '/practice/materials',
    icon: FileText,
    title: 'Notes & study materials',
    description: 'Handouts and notes shared by your tutor.',
  },
  {
    href: '/practice/live-classes',
    icon: CalendarClock,
    title: 'Live classes',
    description: 'Upcoming sessions and meeting links.',
  },
];

// Half-band steps from 5.0 to 9.0, used for the decorative ruler
const BANDS = [5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9];

const cardBase =
  'group rounded-2xl border border-slate-200 bg-white text-[#12233A] shadow-sm transition-[transform,box-shadow,border-color] ' +
  'hover:-translate-y-0.5 hover:border-[#E0002B]/40 hover:shadow-lg ' +
  'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#E0002B]/30';

const iconBox =
  'flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#E0002B]/10 text-[#E0002B] ' +
  'transition-colors group-hover:bg-[#E0002B] group-hover:text-white';

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
    <Link href={href} className={`${cardBase} flex items-center justify-between gap-4 p-5`}>
      <div className="flex items-center gap-4">
        <div className={iconBox}>
          <Icon className="size-5" aria-hidden />
        </div>
        <div>
          <h3 className="text-base font-semibold tracking-tight">{title}</h3>
          <p className="mt-0.5 text-sm leading-relaxed text-slate-500">{description}</p>
        </div>
      </div>
      <ArrowUpRight
        className="size-5 shrink-0 text-[#E0002B] opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100 group-focus-visible:opacity-100"
        aria-hidden
      />
    </Link>
  );
}

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
    <div className="flex min-h-svh flex-col bg-[#F6F7F9] text-[#12233A]">
      {/* ───────── Header ───────── */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-[4.5rem] w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            {organization?.logoUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- signed R2 URL, not a static asset */}
                <img
                  src={organization.logoUrl}
                  alt={organization.name}
                  className="h-9 w-auto max-w-32 object-contain"
                />
                <span className="hidden text-sm font-medium tracking-tight text-slate-500 sm:block">
                  {organization.name}
                </span>
              </>
            ) : (
              <Image
                src="/logo.png"
                alt="Try Again – Your IELTS partner"
                width={2170}
                height={720}
                priority
                className="h-11 w-auto"
              />
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm font-medium text-slate-600 sm:block">{studentName}</span>
            <div
              className="flex size-9 items-center justify-center rounded-full bg-[#12233A] text-xs font-semibold text-white ring-2 ring-[#E0002B]/30"
              aria-hidden
            >
              {initials}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        {/* ───────── Welcome banner ───────── */}
        <section className="relative overflow-hidden rounded-[1.75rem] bg-[#12233A] p-7 text-white shadow-xl sm:p-10 lg:p-12">
          {/* Red glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-32 size-[28rem] rounded-full bg-[#E0002B]/25 blur-3xl"
          />

          {/* Flight-path trail, echoing the logo */}
          <svg
            aria-hidden
            viewBox="0 0 800 300"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 size-full"
          >
            <defs>
              <linearGradient id="dash-trail" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0" stopColor="#E0002B" stopOpacity="0" />
                <stop offset="1" stopColor="#E0002B" stopOpacity="0.85" />
              </linearGradient>
            </defs>
            <path
              d="M-20 290 C 220 250, 480 120, 820 20"
              fill="none"
              stroke="url(#dash-trail)"
              strokeWidth="3"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          <div className="relative flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
            <div className="max-w-md">
              <p className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">
                <span className="size-1.5 rounded-full bg-[#E0002B]" />
                Your IELTS workspace
              </p>
              <h1 className="text-3xl font-bold leading-tight tracking-tight text-balance sm:text-4xl">
                Welcome back, {firstName}
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-white/70 sm:text-base">
                Choose a module to start practicing. Every attempt is saved to your account.
              </p>
              <Link
                href="/mock-tests"
                className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-[#E0002B] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#C20026] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white/50"
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
            <h2 id="modules-heading" className="text-2xl font-bold tracking-tight">
              Practice modules
            </h2>
            <p className="text-sm text-slate-500">
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
                      className={`${cardBase} flex h-full min-h-48 flex-col justify-between gap-8 p-5`}
                    >
                      <div className="flex items-start justify-between">
                        <div className={iconBox}>
                          <Icon className="size-5" aria-hidden />
                        </div>
                        <ArrowUpRight
                          className="size-5 text-[#E0002B] opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                          aria-hidden
                        />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold tracking-tight">{m.name}</h3>
                        <p className="mt-1 text-sm leading-relaxed text-slate-500">{m.description}</p>
                      </div>
                    </Link>
                  </li>
                );
              }

              return (
                <li key={m.name}>
                  <div
                    aria-disabled="true"
                    className="flex h-full min-h-48 flex-col justify-between gap-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-slate-400"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex size-11 items-center justify-center rounded-xl bg-slate-100">
                        <Icon className="size-5" aria-hidden />
                      </div>
                      <span className="rounded-full border border-dashed border-slate-300 px-2.5 py-0.5 text-xs">
                        Coming soon
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold tracking-tight">{m.name}</h3>
                      <p className="mt-1 text-sm leading-relaxed">{m.description}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* ───────── Mock tests, courses, notes and live classes ───────── */}
        <section className="mt-12" aria-labelledby="resources-heading">
          <h2 id="resources-heading" className="mb-5 text-2xl font-bold tracking-tight">
            Learning resources
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {RESOURCES.map((r) => (
              <ResourceLink key={r.href} href={r.href} icon={r.icon} title={r.title} description={r.description} />
            ))}
          </div>
        </section>
      </main>

      {/* ───────── Footer ───────── */}
      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        Powered by <span className="font-semibold text-[#E0002B]">Try Again</span> · Your IELTS partner
      </footer>
    </div>
  );
}