import { useMemo, useState } from 'react';

export interface BasketWord {
  id: string;
  word: string;
  meaning: string;
  source?: string;
  metadata?: Record<string, any>;
}

type WordMap = Record<string, BasketWord>;

export function useWordBasket() {
  const [selectedMap, setSelectedMap] = useState<WordMap>({});

  const addWord = (word: BasketWord) => {
    setSelectedMap((prev) => {
      if (prev[word.id]) return prev;
      return { ...prev, [word.id]: word };
    });
  };

  const addWords = (words: BasketWord[]) => {
    setSelectedMap((prev) => {
      let changed = false;
      const next: WordMap = { ...prev };
      words.forEach((word) => {
        if (!next[word.id]) {
          next[word.id] = word;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  };

  const removeWord = (wordId: string) => {
    setSelectedMap((prev) => {
      if (!prev[wordId]) return prev;
      const next: WordMap = { ...prev };
      delete next[wordId];
      return next;
    });
  };

  const removeWords = (wordIds: string[]) => {
    setSelectedMap((prev) => {
      let changed = false;
      const next: WordMap = { ...prev };
      wordIds.forEach((id) => {
        if (next[id]) {
          delete next[id];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  };

  const toggleWord = (word: BasketWord) => {
    setSelectedMap((prev) => {
      const next: WordMap = { ...prev };
      if (next[word.id]) {
        delete next[word.id];
      } else {
        next[word.id] = word;
      }
      return next;
    });
  };

  const clear = () => setSelectedMap({});

  const selectedWords = useMemo(() => Object.values(selectedMap), [selectedMap]);
  const count = selectedWords.length;
  const isSelected = (wordId: string) => Boolean(selectedMap[wordId]);

  return {
    selectedWords,
    count,
    addWord,
    addWords,
    removeWord,
    removeWords,
    toggleWord,
    clear,
    isSelected,
  };
}
