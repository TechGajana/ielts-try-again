'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { CircleAlert, Eye, EyeOff, LoaderCircle, Lock, User } from 'lucide-react';
import { loginStep1 } from './actions';

// Half-band steps from 5.0 to 9.0, used for the decorative ruler
const BANDS = [5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9];

function Logo({ className = '' }: { className?: string }) {
  return (
    <Image
      src="/try-again-logo.png"
      alt="Try Again – Your IELTS partner"
      width={2170}
      height={720}
      priority
      className={`h-auto ${className}`}
    />
  );
}

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false); // UI only: disables the button while signing in
  const [showPassword, setShowPassword] = useState(false); // UI only: show/hide password
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { uid } = await loginStep1(username, password);
      sessionStorage.setItem('pendingUid', uid);
      router.push('/login/otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in. Please try again.');
      setLoading(false);
    }
  }

  const inputClass =
    'h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 text-base md:text-sm ' +
    'text-[#12233A] placeholder:text-slate-400 shadow-xs outline-none transition-[color,box-shadow,border-color] ' +
    'focus-visible:border-[#E0002B] focus-visible:ring-[3px] focus-visible:ring-[#E0002B]/25 ' +
    'disabled:cursor-not-allowed disabled:opacity-60';

  return (
    <main className="grid min-h-svh bg-[#F6F7F9] text-[#12233A] lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* ───────── Brand panel (desktop only) ───────── */}
      <aside className="relative hidden overflow-hidden bg-[#12233A] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        {/* Red glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-32 size-[28rem] rounded-full bg-[#E0002B]/20 blur-3xl"
        />

        {/* Flight-path trail, echoing the logo */}
        <svg
          aria-hidden
          viewBox="0 0 600 800"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 size-full"
        >
          <defs>
            <linearGradient id="trail" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0" stopColor="#E0002B" stopOpacity="0" />
              <stop offset="1" stopColor="#E0002B" stopOpacity="0.9" />
            </linearGradient>
          </defs>
          <path
            d="M-20 780 C 180 640, 360 360, 640 120"
            fill="none"
            stroke="url(#trail)"
            strokeWidth="3"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* Logo on a white card so it keeps its original colors */}
        <div className="relative w-fit rounded-2xl bg-white p-5 shadow-lg">
          <Logo className="w-56" />
        </div>

        <div className="relative max-w-md">
          <span className="mb-6 block h-1 w-12 rounded-full bg-[#E0002B]" aria-hidden />
          <h2 className="text-4xl font-bold leading-[1.12] tracking-tight text-balance xl:text-5xl">
            Every attempt moves you closer to your band.
          </h2>
          <p className="mt-5 max-w-sm text-base leading-relaxed text-white/70">
            Practice Reading, Listening, Writing and Speaking tasks, and keep a record of every attempt.
          </p>
        </div>

        {/* Band-score ruler */}
        <div aria-hidden className="relative flex items-end justify-between">
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
      </aside>

      {/* ───────── Form panel ───────── */}
      <section className="flex flex-col px-6 py-8 sm:px-12">
        {/* Logo on mobile; multiply blend lets its white background melt into the page */}
        <Logo className="w-44 mix-blend-multiply lg:hidden" />

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-8">
            {/* Step 1 of 2 */}
            <div className="mb-8 flex items-center gap-2" role="img" aria-label="Step 1 of 2">
              <span className="h-1 w-10 rounded-full bg-[#E0002B]" />
              <span className="h-1 w-10 rounded-full bg-slate-200" />
            </div>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Welcome back</h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-500">
              Sign in with your username and password. We&apos;ll email you a one-time code to finish.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
              <div className="space-y-2">
                <label htmlFor="username" className="text-sm font-medium">
                  Username
                </label>
                <div className="relative">
                  <User
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                    aria-hidden
                  />
                  <input
                    id="username"
                    name="username"
                    className={inputClass}
                    placeholder="Enter your username"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    disabled={loading}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                    aria-hidden
                  />
                  <input
                    id="password"
                    name="password"
                    className={`${inputClass} pr-11`}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    disabled={loading}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition-colors hover:text-[#12233A] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#E0002B]/30"
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" aria-hidden />
                    ) : (
                      <Eye className="size-4" aria-hidden />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-lg border border-[#E0002B]/20 bg-[#E0002B]/10 px-3.5 py-3 text-sm text-[#B0001F]"
                >
                  <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <p>{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#E0002B] text-sm font-semibold text-white shadow-xs transition-colors hover:bg-[#C20026] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#E0002B]/40 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
                    Checking details…
                  </>
                ) : (
                  'Continue'
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-slate-500">
              Don&apos;t have an account? Ask your tutor to create one for you.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}