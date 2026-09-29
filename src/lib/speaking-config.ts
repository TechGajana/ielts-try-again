export const MAX_SPEAKING_ATTEMPTS = 2;
export const PREP_SECONDS = 60;
export const MAX_SPEAK_SECONDS = 120;
export const TOTAL_CARDS = 50;

export type Difficulty = 'easy' | 'medium' | 'hard';

export const DIFFICULTIES: { key: Difficulty; label: string; target: number }[] = [
  { key: 'easy', label: 'Easy / common', target: 20 },
  { key: 'medium', label: 'Medium', target: 20 },
  { key: 'hard', label: 'Challenging', target: 10 },
];

export const SPEAKING_CRITERIA: { key: string; label: string }[] = [
  { key: 'fluencyCoherence', label: 'Fluency and Coherence' },
  { key: 'lexicalResource', label: 'Lexical Resource' },
  { key: 'grammar', label: 'Grammatical Range and Accuracy' },
  { key: 'pronunciation', label: 'Pronunciation' },
];

export interface SpeakingEvaluation {
  overall: number;
  criteria: { key: string; label: string; band: number; comment: string }[];
  improvements: string[];
  improvedAnswer: string;
}

export interface SpeakingResult {
  id: string;
  attemptNumber: number;
  status: 'pending' | 'done' | 'failed';
  transcript: string;
  durationSeconds: number;
  audioUrl: string | null;
  evaluation: SpeakingEvaluation | null;
}