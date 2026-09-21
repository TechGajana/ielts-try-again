'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CircleAlert, Eye, EyeOff, GraduationCap, LoaderCircle, Lock, User } from 'lucide-react';
import { loginStep1 } from './actions';

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
      const { uid, isAdmin } = await loginStep1(username, password);
      sessionStorage.setItem('pendingUid', uid);
      sessionStorage.setItem('isAdmin', String(isAdmin));
      router.push('/login/otp');
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  const inputClass =
    'h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-base md:text-sm ' +
    'text-foreground placeholder:text-muted-foreground/70 shadow-xs outline-none transition-[color,box-shadow,border-color] ' +
    'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 ' +
    'disabled:cursor-not-allowed disabled:opacity-60';

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
            Every attempt moves you closer to your band.
          </h2>
          <p className="mt-5 max-w-sm text-base leading-relaxed text-primary-foreground/70">
            Practice Reading, Listening and Writing tasks, and keep a record of every attempt.
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
            {/* Step 1 of 2 */}
            <div className="mb-8 flex items-center gap-2" role="img" aria-label="Step 1 of 2">
              <span className="h-1 w-10 rounded-full bg-primary" />
              <span className="h-1 w-10 rounded-full bg-border" />
            </div>

            <h1 className="font-serif text-3xl tracking-tight sm:text-4xl">Welcome back</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Sign in with your username and password. We&apos;ll email you a one-time code to finish.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
              <div className="space-y-2">
                <label htmlFor="username" className="text-sm font-medium">
                  Username
                </label>
                <div className="relative">
                  <User
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
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
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
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
                    className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
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
                    Checking details…
                  </>
                ) : (
                  'Continue'
                )}
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}