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

  // Generate questions based on the number of words available
  const wordCount = normalizedWords.length;

  const meaningQuestions = generateMeaningQuestions(normalizedWords, wordCount);
  if (!meaningQuestions.length) return null;

  const derivativeQuestions = generateDerivativeQuestions(normalizedWords, wordCount);
  const synAntQuestions = generateSynAntQuestions(normalizedWords, wordCount);
  const sentenceQuestions = generateSentenceQuestions(normalizedWords, wordCount);
  const allInOneQuestions = generateAllInOneQuestions(
    { meaningQuestions, derivativeQuestions, synAntQuestions, sentenceQuestions },
    wordCount
  );

  return {
    1: meaningQuestions,
    2: derivativeQuestions.length ? derivativeQuestions : meaningQuestions,
    3: synAntQuestions.length ? synAntQuestions : meaningQuestions,
    4: sentenceQuestions.length ? sentenceQuestions : meaningQuestions,
    5: allInOneQuestions.length ? allInOneQuestions : meaningQuestions
  };
};
