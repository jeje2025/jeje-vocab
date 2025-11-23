import { Question } from '../types';
import { shuffleArray, maskSentence, removeParentheticalHints } from '../helpers';

export const generateSentenceQuestions = (words: any[], limit = 12): Question[] => {
  const candidates = words.filter((word) => word?.id && (word?.term || word?.word) && word?.example);
  console.log('[Sentence] Total words:', words.length);
  console.log('[Sentence] Words with examples:', candidates.length);
  if (!candidates.length) return [];

  const wordPool = words.map((word) => word.term || word.word).filter(Boolean);
  let idx = 1;
  const questions: Question[] = [];

  shuffleArray(candidates).forEach((word) => {
    if (questions.length >= limit) return;
    const wordText = word.term || word.word;
    if (!wordText || !word.example) return;
    const distractors = shuffleArray(
      wordPool.filter((entry) => entry && entry !== wordText)
    ).slice(0, 3);
    // For a valid quiz, we need at least the correct answer (1 option minimum)
    // But ideally we want at least 2 options total for a real choice
    const options = shuffleArray([wordText, ...distractors]);

    questions.push({
      id: idx++,
      type: 'sentence',
      wordId: word.id,
      question: '빈칸을 채울 알맞은 단어를 고르세요.',
      options,
      correctAnswer: options.indexOf(wordText),
      explanation: `${wordText}: ${word.meaning || ''}`,
      word: wordText,
      sentenceData: {
        english: removeParentheticalHints(maskSentence(word.example, wordText)),
        translation: word.translation
          ? removeParentheticalHints(maskSentence(word.translation, wordText))
          : removeParentheticalHints(word.translation || word.meaning || '')
      }
    });
  });

  console.log('[Sentence] Generated questions:', questions.length, '/', limit);
  return questions;
};
