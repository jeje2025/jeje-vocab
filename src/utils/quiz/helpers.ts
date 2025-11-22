import { NormalizedWord, Question } from './types';

export const shuffleArray = <T,>(array: T[]): T[] => {
  return [...array].sort(() => Math.random() - 0.5);
};

export const parseListField = (value: any): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === 'string' ? entry : entry?.word || ''))
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(/[,;/]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

export const parseDerivativeField = (value: any): Array<{ word: string; meaning: string }> => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (typeof entry === 'string') {
          const [word, meaning] = entry.split(':').map((item) => item.trim());
          return { word, meaning: meaning || '' };
        }
        return {
          word: entry?.word?.trim() || '',
          meaning: entry?.meaning?.trim() || ''
        };
      })
      .filter((entry) => entry.word);
  }
  if (typeof value === 'string') {
    return value
      .split(/[,;]/)
      .map((segment) => {
        const [word, meaning] = segment.split(':').map((item) => item.trim());
        return { word, meaning: meaning || '' };
      })
      .filter((entry) => entry.word);
  }
  return [];
};

export const normalizeWordForQuiz = (word: any): NormalizedWord | null => {
  const normalizedWord = word?.word || word?.term;
  if (!normalizedWord) return null;

  const normalizedId = word?.id || normalizedWord;
  if (!normalizedId) return null;

  return {
    id: String(normalizedId),
    word: normalizedWord,
    meaning: word?.meaning || word?.translation || '',
    translation: word?.translation || '',
    example: word?.example || word?.example_sentence || '',
    derivatives: parseDerivativeField(word?.derivatives),
    synonyms: parseListField(word?.synonyms),
    antonyms: parseListField(word?.antonyms)
  };
};

export const removeParentheticalHints = (text: string) => {
  if (!text) return text;
  return text.replace(/\([^)]*\)/g, '_____');
};

export const maskSentence = (sentence: string, target: string) => {
  if (!sentence || !target) return sentence;
  const regex = new RegExp(target, 'gi');
  return sentence.replace(regex, '_____');
};

export const cloneQuestion = (question: Question, newId: number): Question => ({
  ...question,
  id: newId,
  options: [...question.options],
  correctAnswers: question.correctAnswers ? [...question.correctAnswers] : undefined,
  wordId: question.wordId,
  sentenceData: question.sentenceData ? { ...question.sentenceData } : undefined
});
