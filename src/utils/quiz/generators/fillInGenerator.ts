import { Question, NormalizedWord } from '../types';
import { shuffleArray } from '../helpers';

/**
 * Generate fill-in-the-blank questions for KR → EN (뜻 보고 단어 쓰기)
 * User sees the Korean meaning and types the English word
 */
export function generateFillInWordQuestions(
  words: NormalizedWord[],
  count: number
): Question[] {
  if (!words.length) return [];

  const selectedWords = shuffleArray([...words]).slice(0, Math.min(count, words.length));

  return selectedWords
    .filter(word => word && word.term && word.meaning) // Filter out invalid words
    .map((word, index) => ({
      id: `fill-in-word-${index}`,
      text: word.meaning, // Show Korean meaning
      type: 'fill-in-word' as const,
      options: [], // No options for fill-in
      correctAnswer: word.term.toLowerCase(), // Exact answer (case-insensitive)
      explanation: `정답: ${word.term}`,
      word
    }));
}

/**
 * Generate fill-in-the-blank questions for EN → KR (단어 보고 뜻 쓰기)
 * User sees the English word and types the Korean meaning
 * This will be graded by AI (Gemini)
 */
export function generateFillInMeaningQuestions(
  words: NormalizedWord[],
  count: number
): Question[] {
  if (!words.length) return [];

  const selectedWords = shuffleArray([...words]).slice(0, Math.min(count, words.length));

  return selectedWords
    .filter(word => word && word.term && word.meaning) // Filter out invalid words
    .map((word, index) => ({
      id: `fill-in-meaning-${index}`,
      text: word.term, // Show English word
      type: 'fill-in-meaning' as const,
      options: [], // No options for fill-in
      correctAnswer: word.meaning, // Expected answer for AI comparison
      explanation: `정답 예시: ${word.meaning}`,
      word
    }));
}
