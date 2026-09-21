export const READING_QUESTION_TYPES = [
  'Multiple Choice',
  'Identifying Information',
  "Identifying Writer's Views",
  'Matching Information',
  'Matching Headings',
  'Matching Features',
  'Matching Sentence Endings',
  'Sentence Completion',
  'Summary/Note/Table/Flow-Chart Completion',
  'Diagram Label Completion',
  'Short Answer Questions',
] as const;

export const LISTENING_QUESTION_TYPES = [
  'Multiple Choice',
  'Matching',
  'Plan/Map/Diagram Labelling',
  'Form Completion',
  'Note Completion',
  'Table Completion',
  'Flow-Chart Completion',
  'Summary Completion',
  'Sentence Completion',
  'Short Answer Questions',
] as const;

// How many tasks each question type should have
export const TASKS_PER_TYPE = 10;