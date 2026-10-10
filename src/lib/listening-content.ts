import { LISTENING_QUESTION_TYPES } from './question-types';

export type ListeningQuestionType = (typeof LISTENING_QUESTION_TYPES)[number];
export type ListeningDifficulty = 'Easy' | 'Medium' | 'Hard';
export type ListeningTaskStatus = 'Draft' | 'Published';
export type ListeningSection = 'Part 1' | 'Part 2' | 'Part 3' | 'Part 4';

export type ListeningTypeSlug =
  | 'multiple-choice'
  | 'matching'
  | 'plan-map-diagram-labelling'
  | 'form-completion'
  | 'note-completion'
  | 'table-completion'
  | 'flow-chart-completion'
  | 'summary-completion'
  | 'sentence-completion'
  | 'short-answer-questions';

export type ListeningQuestion = {
  id: string;
  type?: ListeningTypeSlug;
  text: string;
  answerMode?: 'single' | 'multiple';
  options?: string[];
  alternativeAnswers?: string[];
  explanation?: string;
  wordLimit?: number;
  audioStartTime?: number;
  audioEndTime?: number;
  matching?: { item: string; choices: string[] };
  mapLabel?: { label: string; x?: number; y?: number };
  completion?: { heading?: string; fieldLabel?: string };
  tableCell?: { row: string; column: string };
  flowStep?: { stepText: string; position: number };
};

export type ListeningPracticeSet = {
  id: string;
  questionType: ListeningQuestionType;
  taskNumber: number;
  title?: string;
  description?: string;
  difficulty?: ListeningDifficulty;
  section?: ListeningSection;
  status?: ListeningTaskStatus;
  audioKey?: string;
  audioUrl?: string;
  audioTitle?: string;
  audioFormat?: 'MP3' | 'WAV' | 'M4A' | 'OGG';
  audioDurationSeconds?: number;
  transcript?: string;
  transcriptVisibleToStudents?: boolean;
  mapKey?: string;
  instructions: string;
  timerMinutes: number;
  questions: ListeningQuestion[];
  correctAnswers: Record<string, string>;
};

export type ListeningTypeSummary = {
  name: ListeningQuestionType;
  slug: ListeningTypeSlug;
  description: string;
  practiceSets: number;
  questions: number;
  published: number;
  drafts: number;
  difficulties: Record<ListeningDifficulty, number>;
};

export const LISTENING_TYPE_DESCRIPTIONS: Record<ListeningQuestionType, string> = {
  'Multiple Choice': 'Choose the correct option using details from the recording.',
  Matching: 'Match people, places or ideas with the information you hear.',
  'Plan/Map/Diagram Labelling': 'Label locations or features using spoken directions.',
  'Form Completion': 'Complete forms with key information from the conversation.',
  'Note Completion': 'Complete structured notes while listening for details.',
  'Table Completion': 'Fill in missing information in a table.',
  'Flow-Chart Completion': 'Complete the stages of a process in the correct order.',
  'Summary Completion': 'Complete a summary using information from the recording.',
  'Sentence Completion': 'Complete sentences with words from the recording.',
  'Short Answer Questions': 'Answer questions briefly using the information you hear.',
};

const TYPE_SLUGS: Record<ListeningQuestionType, ListeningTypeSlug> = {
  'Multiple Choice': 'multiple-choice',
  Matching: 'matching',
  'Plan/Map/Diagram Labelling': 'plan-map-diagram-labelling',
  'Form Completion': 'form-completion',
  'Note Completion': 'note-completion',
  'Table Completion': 'table-completion',
  'Flow-Chart Completion': 'flow-chart-completion',
  'Summary Completion': 'summary-completion',
  'Sentence Completion': 'sentence-completion',
  'Short Answer Questions': 'short-answer-questions',
};

export function listeningTypeSlug(type: ListeningQuestionType): ListeningTypeSlug {
  return TYPE_SLUGS[type];
}

export function listeningTypeFromSlug(slug: string): ListeningQuestionType | undefined {
  return LISTENING_QUESTION_TYPES.find((type) => listeningTypeSlug(type) === slug);
}

export function listeningTypeLabel(type: ListeningQuestionType): string {
  return type === 'Plan/Map/Diagram Labelling' ? 'Plan / Map / Diagram Labelling' : type;
}
