import { Question, NormalizedWord } from './types';
import { normalizeWordForQuiz } from './helpers';
import {
  generateMeaningQuestions,
  generateDerivativeQuestions,
  generateSynAntQuestions,
  generateSentenceQuestions,
  generateAllInOneQuestions
} from './generators';

export const buildQuestionBank = (words: any[]): Record<number, Question[]> | null => {
  if (!words || !words.length) return null;

  const normalizedWords = words
    .map(normalizeWordForQuiz)
    .filter((word): word is NormalizedWord => !!word);
  if (!normalizedWords.length) return null;

  const meaningQuestions = generateMeaningQuestions(normalizedWords, 20);
  if (!meaningQuestions.length) return null;

  const derivativeQuestions = generateDerivativeQuestions(normalizedWords, 12);
  const synAntQuestions = generateSynAntQuestions(normalizedWords, 12);
  const sentenceQuestions = generateSentenceQuestions(normalizedWords, 12);
  const allInOneQuestions = generateAllInOneQuestions(
    { meaningQuestions, derivativeQuestions, synAntQuestions, sentenceQuestions },
    30
  );

  return {
    1: meaningQuestions,
    2: derivativeQuestions.length ? derivativeQuestions : meaningQuestions,
    3: synAntQuestions.length ? synAntQuestions : meaningQuestions,
    4: sentenceQuestions.length ? sentenceQuestions : meaningQuestions,
    5: allInOneQuestions.length ? allInOneQuestions : meaningQuestions
  };
};
