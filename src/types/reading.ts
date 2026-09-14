export interface ReadingQuestion {
  id: string;
  text: string;
  options?: string[]; // for MCQ-style types
}

export interface ReadingTask {
  id: string;
  questionType: string;
  taskNumber: number;
  passage: string;
  instructions: string;
  questions: ReadingQuestion[];
  correctAnswers: Record<string, string>;
  timerMinutes: number;
}

export interface ReadingAttempt {
  id: string;
  studentId: string;
  taskId: string;
  questionType: string;
  attemptNumber: number;
  status: 'in_progress' | 'completed';
  startTime: string;
  submissionTime?: string;
  studentAnswers: Record<string, string>;
  score?: number;
}