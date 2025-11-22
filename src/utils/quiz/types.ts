export type QuestionType = 'multiple-choice' | 'multi-select' | 'sentence';

export interface Question {
  id: number;
  type: QuestionType;
  wordId?: string;
  word?: string;
  question: string;
  options: string[];
  correctAnswer?: number;
  correctAnswers?: number[];
  explanation?: string;
  sentenceData?: {
    english: string;
    translation: string;
  };
}

export interface NormalizedWord {
  id: string;
  word: string;
  meaning: string;
  translation: string;
  example: string;
  derivatives: Array<{ word: string; meaning: string }>;
  synonyms: string[];
  antonyms: string[];
}
