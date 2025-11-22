import { Question } from '../types';
import { shuffleArray } from '../helpers';

export const generateDerivativeQuestions = (words: any[], limit = 12): Question[] => {
  const derivativeEntries = words.flatMap((word: any) =>
    (word?.derivatives || []).map((der: any) => ({
      wordId: word.id,
      root: word.word,
      derivative: der?.word,
      meaning: der?.meaning
    }))
  ).filter((entry) => entry.wordId && entry.derivative && entry.meaning);

  if (!derivativeEntries.length) return [];

  const meaningPool = derivativeEntries.map((entry) => entry.meaning);
  let idx = 1;
  const questions: Question[] = [];

  shuffleArray(derivativeEntries).forEach((entry) => {
    if (questions.length >= limit) return;
    const distractors = shuffleArray(
      meaningPool.filter((meaning) => meaning && meaning !== entry.meaning)
    ).slice(0, 3);
    if (distractors.length < 3) return;
    const options = shuffleArray([entry.meaning, ...distractors]);
    questions.push({
      id: idx++,
      type: 'multiple-choice',
      wordId: entry.wordId,
      question: `'${entry.root}'의 파생어 '${entry.derivative}' 뜻은?`,
      options,
      correctAnswer: options.indexOf(entry.meaning),
      explanation: `${entry.derivative} (${entry.root}): ${entry.meaning}`
    });
  });

  return questions;
};
