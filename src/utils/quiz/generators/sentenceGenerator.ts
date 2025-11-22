import { Question } from '../types';
import { shuffleArray, maskSentence, removeParentheticalHints } from '../helpers';

export const generateSentenceQuestions = (words: any[], limit = 12): Question[] => {
  const candidates = words.filter((word) => word?.id && word?.word && word?.example);
  if (!candidates.length) return [];

  const wordPool = words.map((word) => word.word).filter(Boolean);
  let idx = 1;
  const questions: Question[] = [];

  shuffleArray(candidates).forEach((word) => {
    if (questions.length >= limit) return;
    if (!word.word || !word.example) return;
    const distractors = shuffleArray(
      wordPool.filter((entry) => entry && entry !== word.word)
    ).slice(0, 3);
    if (distractors.length < 3) return;
    const options = shuffleArray([word.word, ...distractors]);

    questions.push({
      id: idx++,
      type: 'sentence',
      wordId: word.id,
      question: '빈칸을 채울 알맞은 단어를 고르세요.',
      options,
      correctAnswer: options.indexOf(word.word),
      explanation: `${word.word}: ${word.meaning || ''}`,
      word: word.word,
      sentenceData: {
        english: removeParentheticalHints(maskSentence(word.example, word.word)),
        translation: word.translation
          ? removeParentheticalHints(maskSentence(word.translation, word.word))
          : removeParentheticalHints(word.translation || word.meaning || '')
      }
    });
  });

  return questions;
};
