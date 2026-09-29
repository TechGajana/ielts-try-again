import type { Evaluation } from './writing-config';

export type MockSection = 'listening' | 'reading' | 'writing';

export const MOCK_SECTIONS: MockSection[] = ['listening', 'reading', 'writing'];
export const TOTAL_MOCKS = 5;
export const MAX_LISTENING_PARTS = 4;
export const MAX_READING_PARTS = 3;

// If a student is gone longer than this, the mock closes. Covers refreshes and short internet drops.
export const RESUME_GRACE_SECONDS = 60;
export const AUTOSAVE_SECONDS = 6;

export const SECTION_MINUTES: { listening: number; reading: number; writing: number } = {
  listening: 30,
  reading: 60,
  writing: 60,
};

export const SECTION_LABELS: { listening: string; reading: string; writing: string } = {
  listening: 'Listening',
  reading: 'Reading',
  writing: 'Writing',
};

export const WRITING_SUGGESTED_MINUTES: { task1: number; task2: number } = { task1: 20, task2: 40 };

// [minimum raw score out of 40, band]
const LISTENING_TABLE: [number, number][] = [
  [39, 9], [37, 8.5], [35, 8], [32, 7.5], [30, 7], [26, 6.5], [23, 6],
  [18, 5.5], [16, 5], [13, 4.5], [10, 4], [8, 3.5], [6, 3], [4, 2.5],
];
const READING_TABLE: [number, number][] = [
  [39, 9], [37, 8.5], [35, 8], [33, 7.5], [30, 7], [27, 6.5], [23, 6],
  [19, 5.5], [15, 5], [13, 4.5], [10, 4], [8, 3.5], [6, 3], [4, 2.5],
];

/** Estimated band. The score is scaled to a 40-question test first. */
export function estimateBand(section: 'listening' | 'reading', raw: number, total: number): number | null {
  if (total <= 0) return null;
  const scaled = Math.round((raw / total) * 40);
  const table = section === 'listening' ? LISTENING_TABLE : READING_TABLE;
  for (const [min, band] of table) {
    if (scaled >= min) return band;
  }
  return scaled > 0 ? 2 : 0;
}

/** Task 2 counts twice as much as Task 1. */
export function writingBand(task1: number, task2: number) {
  return Math.round(((task1 + 2 * task2) / 3) * 2) / 2;
}

/* ───────── Types shared by server and client ───────── */

export interface MockQuestion {
  id: string;
  kind?: string;
  text: string;
  options?: string[];
  wordLimit?: number;
}

export interface ListeningPartView {
  index: number;
  title: string;
  instructions: string;
  hasAudio: boolean;
  diagramUrl: string | null;
  questions: MockQuestion[];
}

export interface ReadingPartView {
  index: number;
  title: string;
  instructions: string;
  passage: string;
  questions: MockQuestion[];
}

export type SectionPayload =
  | { section: 'listening'; parts: ListeningPartView[]; playedParts: number[] }
  | { section: 'reading'; parts: ReadingPartView[] }
  | {
      section: 'writing';
      task1: { prompt: string; imageUrl: string | null };
      task2: { prompt: string };
    };

export interface RunnerState {
  title: string;
  mockNumber: number;
  section: MockSection;
  sectionEndsAt: number;
  serverNow: number;
  answers: { [key: string]: string };
  payload: SectionPayload;
}

export type RunnerResult = { closed: true } | { closed: false; state: RunnerState };

export type MockLoad =
  | { kind: 'missing' }
  | { kind: 'closed' }
  | { kind: 'not_started'; title: string; mockNumber: number }
  | { kind: 'active'; state: RunnerState };

export type SaveOutcome = 'ok' | 'closed' | 'moved';

export interface MockListItem {
  id: string;
  mockNumber: number;
  title: string;
  state: 'not_started' | 'in_progress' | 'completed';
}

export interface ReviewItem {
  partTitle: string;
  number: number;
  text: string;
  yourAnswer: string;
  correct: boolean;
  correctAnswer: string | null; // only set for incorrect answers
}

export interface ObjectiveResult {
  raw: number;
  total: number;
  band: number | null;
  review: ReviewItem[];
}

export interface WritingTaskResult {
  status: 'pending' | 'running' | 'done' | 'failed';
  response: string;
  wordCount: number;
  evaluation: Evaluation | null;
}

export interface MockResultView {
  mockNumber: number;
  title: string;
  closeReason: 'submitted' | 'timeout' | 'left';
  listening: ObjectiveResult;
  reading: ObjectiveResult;
  writing: { task1: WritingTaskResult; task2: WritingTaskResult; band: number | null };
}