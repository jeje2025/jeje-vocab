export type QuestionType = 'multiple-choice' | 'multi-select' | 'sentence' | 'fill-in-word' | 'fill-in-meaning';

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options: string[];
  correctAnswer: number | number[] | string;
  explanation?: string;
  word?: any;
}

export interface NormalizedWord {
  id: string;
  term: string;
  meaning: string;
  translation: string;
  example: string;
  derivatives: Array<{ word: string; meaning: string }>;
  synonyms: string[];
  antonyms: string[];
}
