import { Question } from '../types';
import { shuffleArray } from '../helpers';

export const generateSynAntQuestions = (words: any[], limit = 12): Question[] => {
  const questions: Question[] = [];

  // Debug: Check what data we have
  const wordsWithSynAnt = words.filter(w =>
    (w?.synonyms?.length || 0) > 0 || (w?.antonyms?.length || 0) > 0
  );
  console.log('[SynAnt] Total words:', words.length);
  console.log('[SynAnt] Words with syn/ant:', wordsWithSynAnt.length);
  if (wordsWithSynAnt.length > 0) {
    console.log('[SynAnt] Sample:', wordsWithSynAnt.slice(0, 3).map(w => ({
      word: w.term || w.word,
      synonyms: w.synonyms,
      antonyms: w.antonyms
    })));
  }

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

  console.log('[SynAnt] Final candidates:', candidates.length);

  const fallbackOptions = words.map((word) => word.term || word.word).filter(Boolean);

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

    // Ensure we have enough distractors - at least 2 total options
    const minDistractors = Math.max(1, 2 - correctWords.length);
    if (distractorOnly.length < minDistractors) {
      console.log('[SynAnt] Skipping - not enough distractors:', {
        word: word.word,
        correctWords: correctWords.length,
        distractors: distractorOnly.length,
        minNeeded: minDistractors
      });
      return;
    }

    const targetOptionsCount = Math.min(8, mergedOptions.length);
    const distractorCount = Math.max(minDistractors, targetOptionsCount - correctWords.length);

    const options = shuffleArray([
      ...correctWords,
      ...shuffleArray(distractorOnly).slice(0, distractorCount)
    ]);

    const correctIndexes = options.reduce<number[]>((acc, option, index) => {
      if (correctWords.includes(option)) acc.push(index);
      return acc;
    }, []);

    const wordText = word.term || word.word;
    console.log('[SynAnt] Generated question:', {
      word: wordText,
      correctCount: correctWords.length,
      totalOptions: options.length
    });

    questions.push({
      id: questions.length + 1,
      type: 'multi-select',
      wordId: word.id,
      question: `'${wordText}'의 ${useSynonym ? '동의어' : '반의어'}를 모두 선택하세요 (${correctWords.length}개)`,
      options,
      correctAnswers: correctIndexes,
      explanation: `${useSynonym ? '동의어' : '반의어'}: ${correctWords.join(', ')}`
    });
  });

  console.log('[SynAnt] Generated questions:', questions.length, '/', limit);
  return questions;
};
