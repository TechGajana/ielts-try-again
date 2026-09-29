export type WritingPart = 'task1' | 'task2';

export const MAX_WRITING_ATTEMPTS = 3;

export interface PartConfig {
  label: string;
  timerMinutes: number;
  minWords: number;
  targetWords: string;
  perCategory: number;
  criteria: { key: string; label: string }[];
}

export const WRITING_PARTS: { task1: PartConfig; task2: PartConfig } = {
  task1: {
    label: 'Task 1: Academic',
    timerMinutes: 20,
    minWords: 150,
    targetWords: '150–200 words',
    perCategory: 5,
    criteria: [
      { key: 'taskAchievement', label: 'Task Achievement' },
      { key: 'coherenceCohesion', label: 'Coherence and Cohesion' },
      { key: 'lexicalResource', label: 'Lexical Resource' },
      { key: 'grammar', label: 'Grammatical Range and Accuracy' },
    ],
  },
  task2: {
    label: 'Task 2: Essay',
    timerMinutes: 40,
    minWords: 250,
    targetWords: '250–300 words',
    perCategory: 10,
    criteria: [
      { key: 'taskResponse', label: 'Task Response' },
      { key: 'coherenceCohesion', label: 'Coherence and Cohesion' },
      { key: 'lexicalResource', label: 'Lexical Resource' },
      { key: 'grammar', label: 'Grammatical Range and Accuracy' },
    ],
  },
};

// Slugs keep "/" out of URLs (some category names contain one)
export const WRITING_CATEGORIES: { slug: string; name: string; part: WritingPart }[] = [
  { slug: 'line-graph', name: 'Line Graph', part: 'task1' },
  { slug: 'bar-chart', name: 'Bar Chart', part: 'task1' },
  { slug: 'pie-chart', name: 'Pie Chart', part: 'task1' },
  { slug: 'table', name: 'Table', part: 'task1' },
  { slug: 'process-diagram', name: 'Process Diagram', part: 'task1' },
  { slug: 'map', name: 'Map', part: 'task1' },
  { slug: 'combination', name: 'Combination of Two Visuals', part: 'task1' },
  { slug: 'opinion', name: 'Opinion / Agree-Disagree', part: 'task2' },
  { slug: 'discussion', name: 'Discussion', part: 'task2' },
  { slug: 'advantages-disadvantages', name: 'Advantages / Disadvantages', part: 'task2' },
  { slug: 'problem-solution', name: 'Problem / Solution', part: 'task2' },
  { slug: 'two-part', name: 'Two-Part Questions', part: 'task2' },
];

export const getCategoryBySlug = (slug: string) => WRITING_CATEGORIES.find((c) => c.slug === slug);

export function countWords(text: string) {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

export type Evaluation = {
  overall: number;
  criteria: { key: string; label: string; band: number; comment: string }[];
  improvements: string[];
  improvedAnswer: string;
};

export type AttemptResult = {
  id: string;
  attemptNumber: number;
  wordCount: number;
  response: string;
  status: 'pending' | 'done' | 'failed';
  evaluation: Evaluation | null;
};