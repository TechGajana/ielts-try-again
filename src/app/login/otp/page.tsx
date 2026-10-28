'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, CircleAlert, LoaderCircle } from 'lucide-react';
import { loginStep2 } from '../actions';

const OTP_LENGTH = 6;

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

export default function OtpPage() {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false); // UI only: disables the button while verifying
  const [focused, setFocused] = useState(false); // UI only: highlights the active digit box

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const uid = sessionStorage.getItem('pendingUid');
      if (!uid) throw new Error('Session expired. Please login again.');

      const { isAdmin } = await loginStep2(uid, otp);
      sessionStorage.removeItem('pendingUid');
      window.location.replace(isAdmin ? '/admin' : '/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not complete sign-in. Please try again.');
      setLoading(false);
    }
  }

  // Which digit box is "active" while the input has focus
  const activeIndex = Math.min(otp.length, OTP_LENGTH - 1);

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
            One last check before you start practicing.
          </h2>
          <p className="mt-5 max-w-sm text-base leading-relaxed text-white/70">
            This extra step keeps your account and your attempts private to you.
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
            {/* Step 2 of 2 */}
            <div className="mb-8 flex items-center gap-2" role="img" aria-label="Step 2 of 2">
              <span className="h-1 w-10 rounded-full bg-[#E0002B]" />
              <span className="h-1 w-10 rounded-full bg-[#E0002B]" />
            </div>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Check your email</h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-500">
              Enter the {OTP_LENGTH}-digit code we sent to your email to finish signing in.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
              <div className="space-y-2">
                <label htmlFor="otp" className="text-sm font-medium">
                  Verification code
                </label>

                {/* One real input (handles typing, paste and autofill) drawn as separate digit boxes */}
                <div className="relative">
                  <div className="flex gap-2 sm:gap-2.5" aria-hidden>
                    {Array.from({ length: OTP_LENGTH }).map((_, i) => {
                      const char = otp[i] ?? '';
                      const isActive = focused && !loading && i === activeIndex;
                      return (
                        <div
                          key={i}
                          className={
                            'relative flex h-14 min-w-0 flex-1 items-center justify-center rounded-lg border bg-white text-2xl font-semibold tabular-nums text-[#12233A] shadow-xs transition-[border-color,box-shadow] ' +
                            (error ? 'border-[#E0002B]/50 ' : 'border-slate-300 ') +
                            (isActive ? 'border-[#E0002B] ring-[3px] ring-[#E0002B]/25 ' : '') +
                            (loading ? 'opacity-60' : '')
                          }
                        >
                          {char}
                          {isActive && !char && (
                            <span className="h-6 w-px animate-pulse bg-[#E0002B] motion-reduce:animate-none" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <input
                    id="otp"
                    name="otp"
                    className="absolute inset-0 h-full w-full cursor-text opacity-0"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="one-time-code"
                    maxLength={OTP_LENGTH}
                    autoFocus
                    disabled={loading}
                    aria-invalid={!!error}
                    aria-describedby={error ? 'otp-error' : undefined}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH))}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                  />
                </div>
              </div>

              {error && (
                <div
                  id="otp-error"
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
                    Verifying…
                  </>
                ) : (
                  'Verify code'
                )}
              </button>
            </form>

            <Link
              href="/login"
              className="mt-6 inline-flex items-center gap-1.5 rounded-sm text-sm text-slate-500 transition-colors hover:text-[#12233A] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#E0002B]/30"
            >
              <ArrowLeft className="size-4" aria-hidden />
              Back to login
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}