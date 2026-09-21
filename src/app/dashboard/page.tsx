'use client';

import React from 'react';
import Link from 'next/link';
import { motion , type Variants } from 'framer-motion';
import {
  ArrowRight,
  BookOpen,
  ClipboardCheck,
  GraduationCap,
  Headphones,
  Mic,
  PenLine,
  type LucideIcon,
} from 'lucide-react';

// --- Constants & Data ---

const STUDENT_NAME = 'Test Student';
const TARGET_BAND = 7.5; // Added target band for UI visualization

interface ModuleDef {
  name: string;
  href: string;
  ready: boolean;
  icon: LucideIcon;
  description: string;
}

const MODULES: ModuleDef[] = [
  { name: 'Reading', href: '/practice/reading', ready: true, icon: BookOpen, description: 'Read passages and answer questions by type.' },
  { name: 'Listening', href: '/practice/listening', ready: true, icon: Headphones, description: 'Listen to audio and answer questions by type.' },
  { name: 'Writing', href: '/practice/writing', ready: false, icon: PenLine, description: 'Respond to Task 1 and Task 2 prompts.' },
  { name: 'Speaking', href: '/practice/speaking', ready: false, icon: Mic, description: 'Practice speaking on common topics.' },
];

const BANDS = [5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9];

// --- Animation Variants ---

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

// --- Sub-Components ---

const Header = ({ studentName }: { studentName: string }) => {
  const initials = studentName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/40">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
        <Link href="/" className="group flex items-center gap-3 transition-opacity hover:opacity-80">
          <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-sm ring-1 ring-primary/20">
            <GraduationCap className="size-5 transition-transform group-hover:scale-110" aria-hidden="true" />
          </div>
          <span className="text-base font-semibold tracking-tight text-foreground">
            IELTS Try Again
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <span className="hidden text-sm font-medium text-muted-foreground sm:block">
            {studentName}
          </span>
          <button 
            className="flex size-9 items-center justify-center rounded-full bg-secondary/50 text-xs font-semibold text-secondary-foreground ring-1 ring-border/50 transition-all hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="User profile"
          >
            {initials}
          </button>
        </div>
      </div>
    </header>
  );
};

const WelcomeBanner = ({ firstName }: { firstName: string }) => (
  <motion.section 
    initial={{ opacity: 0, scale: 0.98 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.4, ease: 'easeOut' }}
    className="relative overflow-hidden rounded-3xl bg-primary p-8 shadow-2xl shadow-primary/10 sm:p-10 border border-primary/20"
  >
    {/* Decorative Background Elements */}
    <div className="absolute -right-24 -top-24 size-96 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
    <div className="absolute -bottom-24 -left-24 size-72 rounded-full bg-black/10 blur-3xl" aria-hidden="true" />
    <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay" aria-hidden="true" />

    <div className="relative z-10 flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
      <div className="max-w-xl">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-primary-foreground backdrop-blur-md mb-4 border border-white/10">
            Target Band: {TARGET_BAND}
          </span>
        </motion.div>
        <h1 className="text-4xl font-bold tracking-tight text-primary-foreground sm:text-5xl lg:text-6xl text-balance">
          Welcome back, {firstName}.
        </h1>
        <p className="mt-4 text-base leading-relaxed text-primary-foreground/80 sm:text-lg max-w-md">
          Pick up where you left off. Every module you complete brings you closer to your target score.
        </p>
      </div>

      {/* Enhanced Band-score ruler */}
      <div aria-hidden="true" className="hidden w-72 shrink-0 items-end justify-between md:flex rounded-xl bg-black/10 p-4 backdrop-blur-sm border border-white/10">
        {BANDS.map((band, i) => {
          const isTarget = band === TARGET_BAND;
          const isWhole = Number.isInteger(band);
          
          return (
            <div key={band} className="group flex w-6 flex-col items-center gap-2 relative">
              {isTarget && (
                <motion.div 
                  layoutId="active-band"
                  className="absolute -top-6 text-primary-foreground font-bold text-sm"
                >
                  {band}
                </motion.div>
              )}
              <span 
                className={`w-[2px] rounded-full transition-all duration-300 ${
                  isTarget ? 'bg-white h-10 shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 
                  isWhole ? 'bg-white/40 h-8 group-hover:bg-white/60' : 
                  'bg-white/20 h-5 group-hover:bg-white/40'
                }`} 
              />
              <span className={`h-4 text-[10px] tabular-nums font-medium ${isTarget ? 'text-white' : 'text-white/40'}`}>
                {isWhole && !isTarget ? band.toFixed(1) : ''}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  </motion.section>
);

const ModuleCard = ({ module }: { module: ModuleDef }) => {
  const { name, href, ready, icon: Icon, description } = module;

  if (!ready) {
    return (
      <motion.li variants={fadeUp}>
        <div className="relative flex h-full min-h-[200px] flex-col justify-between gap-6 rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-muted-foreground overflow-hidden">
          <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,0,0,0.02)_10px,rgba(0,0,0,0.02)_20px)] dark:bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.02)_10px,rgba(255,255,255,0.02)_20px)]" />
          <div className="relative z-10 flex items-start justify-between">
            <div className="flex size-12 items-center justify-center rounded-xl bg-muted/50 ring-1 ring-border/50">
              <Icon className="size-5 opacity-50" aria-hidden="true" />
            </div>
            <span className="rounded-full bg-background px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground ring-1 ring-border">
              Coming Soon
            </span>
          </div>
          <div className="relative z-10">
            <h3 className="text-lg font-semibold tracking-tight">{name}</h3>
            <p className="mt-1.5 text-sm leading-relaxed">{description}</p>
          </div>
        </div>
      </motion.li>
    );
  }

  return (
    <motion.li variants={fadeUp}>
      <Link
        href={href}
        className="group relative flex h-full min-h-[200px] flex-col justify-between gap-6 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <div className="flex items-start justify-between">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all duration-300 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-md group-hover:shadow-primary/20">
            <Icon className="size-5" aria-hidden="true" />
          </div>
          <div className="flex size-8 items-center justify-center rounded-full bg-muted opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:bg-primary/10 group-hover:text-primary">
            <ArrowRight className="size-4 -translate-x-1 transition-transform group-hover:translate-x-0" aria-hidden="true" />
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold tracking-tight">{name}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground transition-colors group-hover:text-card-foreground/80">
            {description}
          </p>
        </div>
      </Link>
    </motion.li>
  );
};

const MockTestSection = () => (
  <motion.section variants={fadeUp} className="mt-8">
    <div className="group relative overflow-hidden rounded-2xl border border-dashed border-border bg-gradient-to-r from-muted/30 to-background p-6 transition-colors hover:border-primary/20 hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between flex flex-col gap-6 sm:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 z-10">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-background shadow-sm ring-1 ring-border transition-transform group-hover:scale-105">
          <ClipboardCheck className="size-6 text-muted-foreground" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Full Mock Exam</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Simulate real test conditions. Take all 4 modules back-to-back with strict timing.
          </p>
        </div>
      </div>
      <div className="z-10 shrink-0">
        <span className="inline-flex items-center justify-center rounded-full bg-background px-4 py-1.5 text-xs font-semibold text-muted-foreground ring-1 ring-border shadow-sm">
          Development in progress
        </span>
      </div>
    </div>
  </motion.section>
);

// --- Main Page Component ---

export default function DashboardPage() {
  const firstName = STUDENT_NAME.split(' ')[0];
  const availableCount = MODULES.filter((m) => m.ready).length;

  return (
    <div className="flex min-h-svh flex-col bg-background font-sans selection:bg-primary/20 selection:text-primary">
      <Header studentName={STUDENT_NAME} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12 md:py-16">
        <WelcomeBanner firstName={firstName} />

        <motion.div 
          initial="hidden" 
          animate="show" 
          variants={staggerContainer}
          className="mt-16 md:mt-20"
        >
          <div className="mb-6 flex items-end justify-between gap-4 border-b border-border/50 pb-4">
            <div>
              <h2 id="modules-heading" className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Practice Arena
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Select a module to begin your training session.
              </p>
            </div>
            <div className="hidden shrink-0 sm:block">
              <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20">
                {availableCount} / {MODULES.length} Unlocked
              </span>
            </div>
          </div>

          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4" aria-labelledby="modules-heading">
            {MODULES.map((module) => (
              <ModuleCard key={module.name} module={module} />
            ))}
          </ul>

          <MockTestSection />
        </motion.div>
      </main>

      <footer className="mt-auto border-t border-border/50 bg-muted/20 py-8 text-center">
        <p className="text-sm text-muted-foreground">
          Powered by <span className="font-semibold text-foreground">IELTS Try Again</span> &copy; {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}