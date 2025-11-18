export type LayoutOptionId = 'card' | 'table' | 'simple' | 'quiz-simple' | 'quiz-synonym' | 'quiz-synonym-answer';

export interface PdfWord {
  id: number;
  word: string;
  pronunciation: string;
  partOfSpeech: string;
  meaning: string;
  definition?: string;
  synonyms: string[];
  antonyms: string[];
  derivatives: Array<{ word: string; meaning: string }>;
  example: string;
  translation: string;
  translationHighlight?: string;
  etymology: string;
}

export interface HeaderInfo {
  headerTitle: string;
  headerDescription: string;
  footerLeft: string;
}

export const layoutOptionIds: LayoutOptionId[] = [
  'card',
  'table',
  'simple',
  'quiz-simple',
  'quiz-synonym',
  'quiz-synonym-answer'
];

const ensureStringArray = (value: any): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item : typeof item === 'object' && item !== null ? item.word : ''))
      .map((item) => (item || '').trim())
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return ensureStringArray(parsed);
    } catch {
      // ignore invalid JSON
    }
    return value
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const ensureDerivativeArray = (value: any): Array<{ word: string; meaning: string }> => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') {
          const [word, meaning] = item.split(':').map((part) => part.trim());
          return { word, meaning: meaning || '' };
        }
        if (typeof item === 'object' && item !== null) {
          return {
            word: String(item.word || '').trim(),
            meaning: String(item.meaning || '').trim()
          };
        }
        return { word: '', meaning: '' };
      })
      .filter((entry) => entry.word);
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return ensureDerivativeArray(parsed);
    } catch {
      // ignore invalid JSON
    }
    return value
      .split(/[,;]/)
      .map((segment) => {
        const [word, meaning] = segment.split(':').map((part) => part.trim());
        return { word, meaning: meaning || '' };
      })
      .filter((entry) => entry.word);
  }
  if (typeof value === 'object') {
    return ensureDerivativeArray([value]);
  }
  return [];
};

export const normalizeWordList = (words: any[]): PdfWord[] => {
  return (words || [])
    .map((word, index) => {
      const safeWord = word || {};
      const normalizedWord = String(safeWord.word || safeWord.term || '').trim();
      if (!normalizedWord) return null;

      return {
        id: index + 1,
        word: normalizedWord,
        pronunciation: safeWord.pronunciation || '',
        partOfSpeech: safeWord.partOfSpeech || safeWord.part_of_speech || '',
        meaning: safeWord.meaning || safeWord.translation || '',
        definition: safeWord.definition || '',
        synonyms: ensureStringArray(safeWord.synonyms),
        antonyms: ensureStringArray(safeWord.antonyms),
        derivatives: ensureDerivativeArray(safeWord.derivatives),
        example: safeWord.example || safeWord.example_sentence || '',
        translation: safeWord.translation || '',
        translationHighlight: safeWord.translationHighlight || safeWord.translation_highlight || '',
        etymology: safeWord.etymology || ''
      } as PdfWord;
    })
    .filter(Boolean) as PdfWord[];
};
