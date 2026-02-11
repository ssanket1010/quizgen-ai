export enum QuestionType {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  TRUE_FALSE = 'TRUE_FALSE',
  SHORT_ANSWER = 'SHORT_ANSWER',
}

export interface Question {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[]; // Only for Multiple Choice
  correctAnswer: string;
  explanation: string;
}

export interface Quiz {
  id: string;
  title: string;
  sourceFileName: string;
  createdAt: number;
  questions: Question[];
  score?: number; // Last score
  totalQuestions: number;
}

export interface QuizAttempt {
  answers: Record<string, string>; // questionId -> answer
  isSubmitted: boolean;
  score: number;
}

export type AppState = 'DASHBOARD' | 'GENERATING' | 'TAKING_QUIZ' | 'REVIEW';

export interface GenerationConfig {
  questionCount: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  file: File | null;
}
