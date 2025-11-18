import { Check } from 'lucide-react';
import { motion } from 'motion/react';
import { BasketWord } from '../../hooks/useWordBasket';

interface VocabWord {
  word: string;
  pos: string;
  meaning: string;
  level: string;
}

interface VocabularyBoxProps {
  vocabulary: VocabWord[];
  onToggleWord: (word: BasketWord) => void;
  onSelectAll?: (words: BasketWord[]) => void;
  onDeselectAll?: (wordIds: string[]) => void;
  isWordSelected: (id: string) => boolean;
}

export function VocabularyBox({
  vocabulary,
  onToggleWord,
  onSelectAll,
  onDeselectAll,
  isWordSelected,
}: VocabularyBoxProps) {
  const buildBasketWord = (word: VocabWord, index: number): BasketWord => ({
    id: `extractor-${index}-${word.word}`,
    word: word.word,
    meaning: word.meaning,
    source: 'Passage Extractor',
    metadata: {
      pos: word.pos,
      level: word.level,
    },
  });

  const handleToggleWord = (index: number) => {
    const basketWord = buildBasketWord(vocabulary[index], index);
    onToggleWord(basketWord);
  };

  const handleSelectAll = () => {
    if (!onSelectAll) return;
    const candidates = vocabulary.map((word, index) => buildBasketWord(word, index));
    const unselected = candidates.filter((word) => !isWordSelected(word.id));
    if (unselected.length > 0) {
      onSelectAll(unselected);
    }
  };

  const handleDeselectAll = () => {
    if (!onDeselectAll) return;
    const ids = vocabulary.map((word, index) => buildBasketWord(word, index).id);
    onDeselectAll(ids);
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case '상': return 'bg-red-100 text-red-700 border-red-200';
      case '중': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case '하': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (!vocabulary || vocabulary.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl border border-purple-100 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-[#491B6D]">추출된 어휘</h3>
        <div className="flex gap-2">
          {onSelectAll && (
            <button
              onClick={handleSelectAll}
              className="text-xs text-purple-600 hover:text-purple-800"
            >
              전체 선택
            </button>
          )}
          {onDeselectAll && (
            <button
              onClick={handleDeselectAll}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              선택 해제
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto">
        {vocabulary.map((word, index) => {
          const basketWord = buildBasketWord(word, index);
          const selected = isWordSelected(basketWord.id);

          return (
            <motion.div
              key={`${word.word}-${index}`}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleToggleWord(index)}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                selected
                  ? 'bg-purple-50 border-purple-300 shadow-sm'
                  : 'bg-gray-50 border-gray-200 hover:border-purple-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selected
                      ? 'bg-purple-600 border-purple-600'
                      : 'border-gray-300'
                  }`}>
                    {selected && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <div>
                    <span className="font-semibold text-[#491B6D]">{word.word}</span>
                    <span className="ml-2 text-xs text-gray-500">{word.pos}</span>
                  </div>
                </div>
                <span className={`px-2 py-0.5 text-xs rounded-full border ${getLevelColor(word.level)}`}>
                  {word.level}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-600 ml-8">{word.meaning}</p>
            </motion.div>
          );
        })}
      </div>

    </div>
  );
}
