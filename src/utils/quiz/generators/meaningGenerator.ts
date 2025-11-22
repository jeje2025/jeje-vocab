import { Question } from '../types';
import { shuffleArray } from '../helpers';

export const generateMeaningQuestions = (words: any[], limit = 20): Question[] => {
  const candidates = words.filter((word) => word?.id && word?.word && word?.meaning);
  if (!candidates.length) return [];

  const meaningPool = candidates.map((word) => word.meaning);
  let idx = 1;
  const questions: Question[] = [];

  shuffleArray(candidates).forEach((word) => {
    if (questions.length >= limit) return;
    const distractors = shuffleArray(
      meaningPool.filter((meaning) => meaning && meaning !== word.meaning)
    ).slice(0, 3);
    if (distractors.length < 3) return;
    const options = shuffleArray([word.meaning, ...distractors]);
    questions.push({
      id: idx++,
      type: 'multiple-choice',
      wordId: word.id,
      word: word.word,
      question: `${word.word}의 뜻으로 가장 알맞은 것은?`,
      options,
      correctAnswer: options.indexOf(word.meaning),
      explanation: `${word.word}: ${word.meaning}`
    });
  });

  return questions;
};
