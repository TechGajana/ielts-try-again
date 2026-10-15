import { Fraunces, IBM_Plex_Sans } from 'next/font/google';
import Link from 'next/link';
import { CheckCircle2, Mic, Headphones, BookOpen, PenLine, ClipboardCheck } from 'lucide-react';
import MobileNav from '@/components/marketing/mobile-nav';
import FaqAccordion from '@/components/marketing/faq-accordion';

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-display',
});

const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
});

const NAV_LINKS = [
  { href: '#format', label: 'How it works' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#faq', label: 'FAQ' },
];

const STATS = [
  { value: '110', label: 'reading tasks' },
  { value: '40+', label: 'listening tasks' },
  { value: '85', label: 'writing prompts' },
  { value: '50', label: 'speaking cue cards' },
  { value: '5', label: 'full mock tests' },
];

const STEPS = [
  {
    n: '1',
    title: 'Attempt a section',
    body: 'Work through a real IELTS-style Reading, Listening, Writing or Speaking task, under the real time limit.',
  },
  {
    n: '2',
    title: 'Get your band',
    body: 'An AI examiner scores your attempt against the real criteria and tells you exactly where it broke down.',
  },
  {
    n: '3',
    title: 'Try again',
    body: 'Attempt the same task again with that feedback in hand, and watch the band move before you sit the real thing.',
  },
];

const FORMAT_ROWS = [
  { icon: Headphones, name: 'Listening', time: '30 min', attempts: '3 attempts per task' },
  { icon: BookOpen, name: 'Reading', time: '60 min', attempts: '3 attempts per task' },
  { icon: PenLine, name: 'Writing', time: '20 + 40 min', attempts: '3 attempts per task' },
  { icon: Mic, name: 'Speaking', time: '1 min prep + 2 min', attempts: '2 attempts per card' },
  { icon: ClipboardCheck, name: 'Full mock test', time: 'About 2.5 hrs', attempts: '1 attempt, once' },
];

const PLANS = [
  {
    name: 'Practice',
    price: '₹799',
    period: '/ month',
    description: 'For steady, section-by-section practice.',
    features: [
      'Reading, Listening and Writing practice',
      'Examiner-style AI band after every attempt',
      '3 attempts per task',
      'Progress tracked across attempts',
    ],
  },
  {
    name: 'Full access',
    price: '₹1,999',
    period: '/ month',
    description: 'Everything, including Speaking and mock tests.',
    features: [
      'Everything in Practice',
      'Speaking practice with recorded attempts',
      '5 full-length mock tests',
      'Priority AI feedback turnaround',
    ],
    featured: true,
  },
];

const FAQS = [
  {
    q: 'How do I get an account?',
    a: 'There\u2019s no self-serve signup. Choose a plan, and once payment is confirmed, we set up your login and send your username and password by email. Your first sign-in uses a one-time code sent to that email.',
  },
  {
    q: 'How many times can I attempt each task?',
    a: 'Reading, Listening and Writing tasks allow 3 attempts each, Speaking cue cards allow 2, and each full mock test can only be attempted once, matching the real exam.',
  },
  {
    q: 'Is the band score official?',
    a: 'No. It\u2019s an AI-estimated band based on your answers, meant to guide your practice. It isn\u2019t an official IELTS score and isn\u2019t issued by IELTS or its test centers.',
  },
  {
    q: 'Can I practice Speaking on my phone?',
    a: 'Yes. You\u2019ll need a browser with microphone access. Recording starts after your one-minute preparation time, exactly like the real test.',
  },
  {
    q: 'What happens if I leave a mock test partway through?',
    a: 'A mock test can only be attempted once, so leaving it early closes it for good. Your answers up to that point are still saved and marked.',
  },
];

export default function LandingPage() {
  return (
    <div
      className={`${fraunces.variable} ${plexSans.variable} min-h-svh bg-[#F7F4EC] text-[#1C2B39]`}
      style={{ fontFamily: 'var(--font-body)' }}
    >
      {/* ───────── Header ───────── */}
      <header className="sticky top-0 z-30 border-b border-[#DCD4C0] bg-[#F7F4EC]/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="text-[1.0625rem] font-medium tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            IELTS Try Again
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-sm text-[#4B5B6B] transition-colors hover:text-[#1C2B39]"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-5 md:flex">
            <Link href="/login" className="text-sm text-[#4B5B6B] transition-colors hover:text-[#1C2B39]">
              Log in
            </Link>
            <a
              href="#pricing"
              className="inline-flex h-10 items-center rounded-sm bg-[#1C2B39] px-4 text-sm font-medium text-[#F7F4EC] transition-colors hover:bg-[#1C2B39]/90"
            >
              Get started
            </a>
          </div>

          <MobileNav links={NAV_LINKS} />
        </div>
      </header>

      {/* ───────── Hero ───────── */}
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-16 sm:pt-24">
        <div className="grid gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-center lg:gap-10">
          <div className="max-w-xl">
            <h1
              className="text-[2.75rem] leading-[1.08] tracking-tight text-balance sm:text-6xl"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Keep attempting.
              <br />
              Watch the band move.
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-[#4B5B6B] sm:text-lg">
              Work through real exam-style Listening, Reading, Writing and Speaking tasks. Every attempt gets an
              examiner-style AI band and specific feedback, so the next attempt starts smarter than the last.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a
                href="#pricing"
                className="inline-flex h-12 items-center rounded-sm bg-[#1C2B39] px-6 text-sm font-medium text-[#F7F4EC] transition-colors hover:bg-[#1C2B39]/90"
              >
                See plans
              </a>
              <Link
                href="/login"
                className="inline-flex h-12 items-center rounded-sm border border-[#1C2B39]/20 px-6 text-sm font-medium transition-colors hover:border-[#1C2B39]/40"
              >
                Already have an account?
              </Link>
            </div>

            <p className="mt-6 text-xs text-[#4B5B6B]">
              AI-estimated bands, meant to guide your practice. Not an official IELTS score.
            </p>
          </div>

          {/* Attempt slips — the one bold visual element */}
          <div aria-hidden className="relative mx-auto w-full max-w-[18rem]">
            <AttemptSlip
              attempt="Attempt 1"
              band="5.5"
              rotate="-2deg"
              delay="0ms"
              marked="cross"
            />
            <AttemptSlip
              attempt="Attempt 2"
              band="6.5"
              rotate="1.5deg"
              delay="140ms"
              marked="none"
              className="mt-4"
            />
            <AttemptSlip
              attempt="Attempt 3"
              band="7.5"
              rotate="-1deg"
              delay="280ms"
              marked="circle"
              className="mt-4"
            />
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-20 flex flex-wrap gap-x-10 gap-y-6 border-t border-[#DCD4C0] pt-10">
          {STATS.map((s) => (
            <div key={s.label} className="border-l border-[#DCD4C0] pl-5 first:border-l-0 first:pl-0">
              <p className="text-2xl font-medium tabular-nums" style={{ fontFamily: 'var(--font-display)' }}>
                {s.value}
              </p>
              <p className="mt-0.5 text-sm text-[#4B5B6B]">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───────── How it works ───────── */}
      <section className="border-t border-[#DCD4C0] bg-[#F7F4EC]">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2
            className="max-w-md text-3xl leading-tight tracking-tight text-balance sm:text-4xl"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            The same loop, every time.
          </h2>

          <ol className="mt-14 grid gap-10 sm:grid-cols-3 sm:gap-8">
            {STEPS.map((step) => (
              <li key={step.n}>
                <span
                  className="flex size-10 items-center justify-center rounded-full border border-[#1C2B39] text-base"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {step.n}
                </span>
                <h3 className="mt-5 text-lg font-medium tracking-tight">{step.title}</h3>
                <p className="mt-2 max-w-[22rem] text-sm leading-relaxed text-[#4B5B6B]">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ───────── Format timetable ───────── */}
      <section id="format" className="border-t border-[#DCD4C0]">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <h2
              className="max-w-md text-3xl leading-tight tracking-tight text-balance sm:text-4xl"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Every section, timed like the real test.
            </h2>
            <p className="max-w-xs text-sm leading-relaxed text-[#4B5B6B]">
              Attempt limits match what you&apos;ll face on exam day, so the practice counts for something.
            </p>
          </div>

          <div className="mt-12 overflow-hidden rounded-sm border border-[#DCD4C0]">
            {FORMAT_ROWS.map((row, i) => {
              const Icon = row.icon;
              return (
                <div
                  key={row.name}
                  className={`flex flex-col gap-2 px-6 py-5 sm:flex-row sm:items-center sm:gap-6 sm:py-4 ${
                    i > 0 ? 'border-t border-[#DCD4C0]' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 sm:w-48 sm:shrink-0">
                    <Icon className="size-4 text-[#4B5B6B]" aria-hidden />
                    <span className="font-medium">{row.name}</span>
                  </div>
                  <span className="text-sm text-[#4B5B6B] sm:w-36">{row.time}</span>
                  <span className="text-sm text-[#4B5B6B]">{row.attempts}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───────── Pricing ───────── */}
      <section id="pricing" className="border-t border-[#DCD4C0] bg-[#F1ECE0]">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2
            className="max-w-md text-3xl leading-tight tracking-tight text-balance sm:text-4xl"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Choose a plan.
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-[#4B5B6B]">
            After payment, we set up your account and email your login details, including a username and a
            temporary password.
          </p>

          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-sm border p-8 ${
                  plan.featured ? 'border-[#1C2B39] bg-[#F7F4EC]' : 'border-[#DCD4C0] bg-[#F7F4EC]/60'
                }`}
              >
                {/* perforated edge */}
                <div
                  aria-hidden
                  className="absolute inset-y-6 left-0 w-px border-l border-dashed border-[#DCD4C0]"
                />

                <h3 className="text-lg font-medium tracking-tight">{plan.name}</h3>
                <p className="mt-1 text-sm text-[#4B5B6B]">{plan.description}</p>

                <p className="mt-6 flex items-baseline gap-1.5">
                  <span className="text-4xl tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
                    {plan.price}
                  </span>
                  <span className="text-sm text-[#4B5B6B]">{plan.period}</span>
                </p>

                <ul className="mt-6 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm leading-relaxed">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#BD3B3B]" aria-hidden />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/login"
                  className={`mt-8 inline-flex h-11 w-full items-center justify-center rounded-sm text-sm font-medium transition-colors ${
                    plan.featured
                      ? 'bg-[#1C2B39] text-[#F7F4EC] hover:bg-[#1C2B39]/90'
                      : 'border border-[#1C2B39]/20 hover:border-[#1C2B39]/40'
                  }`}
                >
                  Choose {plan.name}
                </Link>
              </div>
            ))}
          </div>

          <p className="mt-6 text-xs text-[#4B5B6B]">
            Prices shown are a starting point — confirm these before launch.
          </p>
        </div>
      </section>

      {/* ───────── FAQ ───────── */}
      <section id="faq" className="border-t border-[#DCD4C0]">
        <div className="mx-auto max-w-3xl px-6 py-20">
          <h2
            className="text-3xl leading-tight tracking-tight text-balance sm:text-4xl"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Questions
          </h2>
          <div className="mt-10">
            <FaqAccordion items={FAQS} />
          </div>
        </div>
      </section>

      {/* ───────── Closing CTA ───────── */}
      <section className="border-t border-[#DCD4C0] bg-[#1C2B39] text-[#F7F4EC]">
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <h2
            className="mx-auto max-w-lg text-3xl leading-tight tracking-tight text-balance sm:text-4xl"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Your next attempt starts whenever you&apos;re ready.
          </h2>
          <a
            href="#pricing"
            className="mt-8 inline-flex h-12 items-center rounded-sm bg-[#F7F4EC] px-6 text-sm font-medium text-[#1C2B39] transition-colors hover:bg-[#F7F4EC]/90"
          >
            See plans
          </a>
        </div>
      </section>

      {/* ───────── Footer ───────── */}
      <footer className="border-t border-[#DCD4C0]/30 bg-[#1C2B39] text-[#F7F4EC]/70">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-[#F7F4EC]" style={{ fontFamily: 'var(--font-display)' }}>
              IELTS Try Again
            </p>
            <p className="mt-1 text-xs">Practice that keeps up with you.</p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} className="transition-colors hover:text-[#F7F4EC]">
                {l.label}
              </a>
            ))}
            <Link href="/login" className="transition-colors hover:text-[#F7F4EC]">
              Log in
            </Link>
          </nav>
        </div>
        <div className="border-t border-[#F7F4EC]/10 px-6 py-5 text-center text-xs">
          © {new Date().getFullYear()} IELTS Try Again. Not affiliated with IDP, British Council or Cambridge
          Assessment English.
        </div>
      </footer>
    </div>
  );
}

function AttemptSlip({
  attempt,
  band,
  rotate,
  delay,
  marked,
  className = '',
}: {
  attempt: string;
  band: string;
  rotate: string;
  delay: string;
  marked: 'cross' | 'circle' | 'none';
  className?: string;
}) {
  return (
    <div
      className={`attempt-slip rounded-sm border border-[#DCD4C0] bg-[#FCFBF6] p-5 shadow-[0_6px_16px_-8px_rgba(28,43,57,0.25)] ${className}`}
      style={{ transform: `rotate(${rotate})`, animationDelay: delay }}
    >
      <p className="text-xs text-[#4B5B6B]">{attempt}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-3xl tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
          {band}
        </span>
        <span className="text-xs text-[#4B5B6B]">estimated band</span>
      </div>
      {marked === 'cross' && (
        <svg viewBox="0 0 40 40" className="absolute -right-2 -top-2 size-10 text-[#BD3B3B]" aria-hidden>
          <path d="M8 8 L32 32 M32 8 L8 32" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        </svg>
      )}
      {marked === 'circle' && (
        <svg viewBox="0 0 60 36" className="absolute -right-3 -top-3 size-14 text-[#1C2B39]" aria-hidden>
          <ellipse cx="30" cy="18" rx="27" ry="15" stroke="currentColor" strokeWidth="2" fill="none" />
        </svg>
      )}
      <style>{`
        .attempt-slip {
          position: relative;
          opacity: 0;
          animation: slipIn 0.5s ease both;
        }
        @keyframes slipIn {
          from { opacity: 0; transform: translateY(10px) rotate(${rotate}); }
          to { opacity: 1; transform: translateY(0) rotate(${rotate}); }
        }
        @media (prefers-reduced-motion: reduce) {
          .attempt-slip { animation: none; opacity: 1; }
        }
      `}</style>
    </div>
  );
}