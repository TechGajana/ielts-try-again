import { READING_QUESTION_TYPES } from './question-types';

export type ReadingQuestionType = (typeof READING_QUESTION_TYPES)[number];
export type ReadingDifficulty = 'Easy' | 'Medium' | 'Hard';
export type ReadingTaskStatus = 'Draft' | 'Published';
export type ReadingCompletionType = 'Summary' | 'Note' | 'Table' | 'Flow Chart';

export type ReadingQuestion = {
  id: string;
  text: string;
  options?: string[];
  alternativeAnswers?: string[];
  explanation?: string;
  wordLimit?: number;
};

export type ReadingTask = {
  id: string;
  questionType: ReadingQuestionType;
  taskNumber: number;
  title?: string;
  description?: string;
  passage: string;
  passageFormat?: 'markdown';
  completionType?: ReadingCompletionType;
  instructions: string;
  timerMinutes: number;
  difficulty?: ReadingDifficulty;
  status?: ReadingTaskStatus;
  diagramKey?: string;
  questions: ReadingQuestion[];
  correctAnswers: Record<string, string>;
};

export type ReadingTaskView = Omit<ReadingTask, 'correctAnswers' | 'questions'> & {
  questions: Pick<ReadingQuestion, 'id' | 'text' | 'options' | 'wordLimit'>[];
};

export const READING_TYPE_DESCRIPTIONS: Record<ReadingQuestionType, string> = {
  'Multiple Choice': 'Choose the answer that best matches the information in the passage.',
  'Identifying Information': 'Decide whether each statement is True, False, or Not Given.',
  "Identifying Writer's Views": 'Identify whether statements agree with the writer’s views.',
  'Matching Information': 'Match statements to the paragraphs where the information appears.',
  'Matching Headings': 'Choose the most suitable heading for each paragraph.',
  'Matching Features': 'Match statements with the people, places, or groups described.',
  'Matching Sentence Endings': 'Complete sentence beginnings with the correct endings.',
  'Sentence Completion': 'Complete sentences using words from the passage.',
  'Summary/Note/Table/Flow-Chart Completion': 'Complete a summary or structured notes from the passage.',
  'Diagram Label Completion': 'Label parts of a diagram using information from the passage.',
  'Short Answer Questions': 'Answer questions using a limited number of words.',
};

export function isPublishedReadingTask(task: { status?: string }): boolean {
  return task.status !== 'Draft';
}

export function readingTypeSlug(type: ReadingQuestionType): string {
  return type.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function readingTypeFromSlug(slug: string): ReadingQuestionType | undefined {
  return READING_QUESTION_TYPES.find((type) => readingTypeSlug(type) === slug);
}
