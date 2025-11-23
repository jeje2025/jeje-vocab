import { Question } from '../types';
import { shuffleArray } from '../helpers';

export const generateSynAntQuestions = (words: any[], limit = 12): Question[] => {
  const questions: Question[] = [];

  // First try: words with 2+ synonyms or antonyms
  let candidates = words.filter(
    (word) =>
      word?.id && ((word?.synonyms?.length || 0) >= 2 || (word?.antonyms?.length || 0) >= 2)
  );

  // Fallback: if not enough candidates, include words with at least 1 synonym or antonym
  if (candidates.length < 1) {
    candidates = words.filter(
      (word) =>
        word?.id && ((word?.synonyms?.length || 0) >= 1 || (word?.antonyms?.length || 0) >= 1)
    );
  }

  const fallbackOptions = words.map((word) => word.word).filter(Boolean);

  shuffleArray(candidates).forEach((word) => {
    if (questions.length >= limit) return;
    const useSynonym =
      (word.synonyms?.length || 0) >= 1 &&
      ((word.antonyms?.length || 0) < 1 || Math.random() > 0.5);
    const pool = useSynonym ? (word.synonyms || []) : (word.antonyms || []);
    if (pool.length < 1) return;

    const targetCount = Math.min(pool.length, 3);
    const requiredCount = Math.max(1, targetCount);
    const correctWords = shuffleArray(pool).slice(0, requiredCount);

    const distractorPool = shuffleArray(
      [
        ...fallbackOptions,
        ...(words.flatMap((w) => (useSynonym ? w.synonyms || [] : w.antonyms || [])) as string[])
      ].filter((item) => item && !correctWords.includes(item))
    );

    const mergedOptions: string[] = [...correctWords];
    distractorPool.forEach((value) => {
      if (mergedOptions.length >= 8) return;
      if (!mergedOptions.includes(value)) mergedOptions.push(value);
    });

    // Need at least 2 options total for a meaningful quiz
    // But we'll be lenient - if we have at least the correct answer, allow it
    if (mergedOptions.length < 2) return;

    const distractorOnly = mergedOptions.filter((option) => !correctWords.includes(option));
    const targetOptionsCount = Math.min(8, mergedOptions.length);
    const distractorCount = Math.max(0, targetOptionsCount - correctWords.length);

    const options = shuffleArray([
      ...correctWords,
      ...shuffleArray(distractorOnly).slice(0, distractorCount)
    ]);

    const correctIndexes = options.reduce<number[]>((acc, option, index) => {
      if (correctWords.includes(option)) acc.push(index);
      return acc;
    }, []);

    questions.push({
      id: questions.length + 1,
      type: 'multi-select',
      wordId: word.id,
      question: `'${word.word}'의 ${useSynonym ? '동의어' : '반의어'}를 모두 선택하세요 (${correctWords.length}개)`,
      options,
      correctAnswers: correctIndexes,
      explanation: `${useSynonym ? '동의어' : '반의어'}: ${correctWords.join(', ')}`
    });
  });

  return questions;
};
