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
  console.log('[QuestionBank] Building question bank with', words.length, 'words');

  if (!words || !words.length) return null;

  const normalizedWords = words
    .map(normalizeWordForQuiz)
    .filter((word): word is NormalizedWord => !!word);

  console.log('[QuestionBank] Normalized', normalizedWords.length, 'words');
  console.log('[QuestionBank] Sample normalized word:', normalizedWords[0]);
  console.log('[QuestionBank] First word synonyms:', normalizedWords[0]?.synonyms);
  console.log('[QuestionBank] First word antonyms:', normalizedWords[0]?.antonyms);
  console.log('[QuestionBank] Words with synonyms:', normalizedWords.filter(w => w.synonyms?.length > 0).length);
  console.log('[QuestionBank] Words with antonyms:', normalizedWords.filter(w => w.antonyms?.length > 0).length);

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

  console.log('[QuestionBank] Generated questions:', {
    meaning: meaningQuestions.length,
    derivative: derivativeQuestions.length,
    synAnt: synAntQuestions.length,
    sentence: sentenceQuestions.length,
    allInOne: allInOneQuestions.length
  });

  return {
    1: meaningQuestions,
    2: derivativeQuestions.length ? derivativeQuestions : meaningQuestions,
    3: synAntQuestions.length ? synAntQuestions : meaningQuestions,
    4: sentenceQuestions.length ? sentenceQuestions : meaningQuestions,
    5: allInOneQuestions.length ? allInOneQuestions : meaningQuestions
  };
};
