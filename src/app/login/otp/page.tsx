'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signInWithCustomToken } from 'firebase/auth';
import { ArrowLeft, CircleAlert, GraduationCap, LoaderCircle } from 'lucide-react';
import { clientAuth } from '@/lib/firebase-client';
import { loginStep2 } from '../actions';

const OTP_LENGTH = 6;

// Half-band steps from 5.0 to 9.0, used for the decorative ruler
const BANDS = [5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9];

function BrandMark({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex size-9 items-center justify-center rounded-lg bg-current/10 ring-1 ring-current/20">
        <GraduationCap className="size-5" aria-hidden />
      </div>
      <span className="text-base font-medium tracking-tight">IELTS Try Again</span>
    </div>
  );
}

export default function OtpPage() {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false); // UI only: disables the button while verifying
  const [focused, setFocused] = useState(false); // UI only: highlights the active digit box
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const uid = sessionStorage.getItem('pendingUid');
      if (!uid) throw new Error('Session expired. Please login again.');

      const { customToken } = await loginStep2(uid, otp);

      const cred = await signInWithCustomToken(clientAuth, customToken);
      const idToken = await cred.user.getIdToken();

      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      const isAdmin = sessionStorage.getItem('isAdmin') === 'true';
      sessionStorage.removeItem('pendingUid');
      sessionStorage.removeItem('isAdmin');
      router.push(isAdmin ? '/admin' : '/dashboard');
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  // Which digit box is "active" while the input has focus
  const activeIndex = Math.min(otp.length, OTP_LENGTH - 1);

  return (
    <main className="grid min-h-svh bg-background text-foreground lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* ───────── Brand panel (desktop only) ───────── */}
      <aside className="relative hidden overflow-hidden bg-primary p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        {/* Soft light bloom */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-32 size-[28rem] rounded-full bg-primary-foreground/10 blur-3xl"
        />

        <BrandMark className="relative" />

        <div className="relative max-w-md">
          <h2 className="font-serif text-4xl leading-[1.12] tracking-tight text-balance xl:text-5xl">
            One last check before you start practicing.
          </h2>
          <p className="mt-5 max-w-sm text-base leading-relaxed text-primary-foreground/70">
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
                <span className={`w-px bg-primary-foreground ${whole ? 'h-9' : 'h-5'}`} />
                <span className="h-4 text-xs tabular-nums">{whole ? band.toFixed(1) : ''}</span>
              </div>
            );
          })}
        </div>
      </aside>

      {/* ───────── Form panel ───────── */}
      <section className="flex flex-col px-6 py-8 sm:px-12">
        <BrandMark className="lg:hidden" />

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">
            {/* Step 2 of 2 */}
            <div className="mb-8 flex items-center gap-2" role="img" aria-label="Step 2 of 2">
              <span className="h-1 w-10 rounded-full bg-primary" />
              <span className="h-1 w-10 rounded-full bg-primary" />
            </div>

            <h1 className="font-serif text-3xl tracking-tight sm:text-4xl">Check your email</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Enter the {OTP_LENGTH}-digit code we sent to your email to finish signing in.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
              <div className="space-y-2">
                <label htmlFor="otp" className="text-sm font-medium">
                  Verification code
                </label>

                {/* One real input (handles typing, paste and autofill) drawn as separate digit boxes */}
                <div className="relative">
                  <div className="flex gap-2 sm:gap-3" aria-hidden>
                    {Array.from({ length: OTP_LENGTH }).map((_, i) => {
                      const char = otp[i] ?? '';
                      const isActive = focused && !loading && i === activeIndex;
                      return (
                        <div
                          key={i}
                          className={
                            'relative flex h-14 min-w-0 flex-1 items-center justify-center rounded-lg border bg-background text-2xl font-medium tabular-nums shadow-xs transition-[border-color,box-shadow] ' +
                            (error ? 'border-destructive/50 ' : 'border-input ') +
                            (isActive ? 'border-ring ring-[3px] ring-ring/40 ' : '') +
                            (loading ? 'opacity-60' : '')
                          }
                        >
                          {char}
                          {isActive && !char && (
                            <span className="h-6 w-px animate-pulse bg-foreground motion-reduce:animate-none" />
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
                  className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/10 px-3.5 py-3 text-sm text-destructive"
                >
                  <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <p>{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-70"
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
              className="mt-6 inline-flex items-center gap-1.5 rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
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