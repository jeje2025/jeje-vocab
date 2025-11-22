import { Question } from '../types';
import { shuffleArray, cloneQuestion } from '../helpers';

export const generateAllInOneQuestions = (
  sources: {
    meaningQuestions: Question[];
    derivativeQuestions: Question[];
    synAntQuestions: Question[];
    sentenceQuestions: Question[];
  },
  limit = 30
): Question[] => {
  const pool = [
    ...sources.meaningQuestions,
    ...sources.derivativeQuestions,
    ...sources.synAntQuestions,
    ...sources.sentenceQuestions
  ];

  if (!pool.length) return [];

  const questions: Question[] = [];
  const shuffled = shuffleArray(pool);
  let index = 1;

  for (const question of shuffled) {
    if (questions.length >= limit) break;
    questions.push(cloneQuestion(question, index++));
  }

  while (questions.length < limit && sources.meaningQuestions.length) {
    const fallback = sources.meaningQuestions[questions.length % sources.meaningQuestions.length];
    questions.push(cloneQuestion(fallback, questions.length + 1));
  }

  return questions;
};
