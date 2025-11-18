import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, RotateCcw, Trophy } from 'lucide-react';

interface WordItem {
  id: string;
  word: string;
  meaning: string;
}

interface MemoryMatchGameProps {
  words: WordItem[];
  onWordCleared: (wordId: string) => void;
  onClose: () => void;
  onGameComplete?: () => void;
}

interface Card {
  id: string;
  wordId: string;
  content: string;
  type: 'word' | 'meaning';
  isFlipped: boolean;
  isMatched: boolean;
}

export function MemoryMatchGame({ words, onWordCleared, onClose, onGameComplete }: MemoryMatchGameProps) {
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<string[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<number>(0);
  const [moves, setMoves] = useState(0);
  const [remainingWords, setRemainingWords] = useState<WordItem[]>(words);
  const [currentBatchWords, setCurrentBatchWords] = useState<WordItem[]>([]);
  const [clearedWordIds, setClearedWordIds] = useState<Set<string>>(new Set());
  const [showCongrats, setShowCongrats] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const BATCH_SIZE = 8; // 8 words = 16 cards (4x4 grid)
  const MIN_CARDS_THRESHOLD = 8; // Refill when 8 cards remain

  // Initialize game with first batch
  const initializeBatch = useCallback((wordList: WordItem[]) => {
    const batchWords = wordList.slice(0, BATCH_SIZE);
    setCurrentBatchWords(batchWords);

    // Create cards (word + meaning for each word)
    const newCards: Card[] = [];
    batchWords.forEach((word) => {
      newCards.push({
        id: `${word.id}-word`,
        wordId: word.id,
        content: word.word,
        type: 'word',
        isFlipped: false,
        isMatched: false,
      });
      newCards.push({
        id: `${word.id}-meaning`,
        wordId: word.id,
        content: word.meaning,
        type: 'meaning',
        isFlipped: false,
        isMatched: false,
      });
    });

    // Shuffle cards
    const shuffled = newCards.sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setMatchedPairs(0);
    setFlippedCards([]);
  }, []);

  // Start game
  useEffect(() => {
    if (words.length > 0) {
      setRemainingWords(words);
      initializeBatch(words);
    }
  }, [words, initializeBatch]);

  // Handle card click
  const handleCardClick = (cardId: string) => {
    if (isProcessing) return;

    const card = cards.find((c) => c.id === cardId);
    if (!card || card.isFlipped || card.isMatched) return;
    if (flippedCards.length >= 2) return;

    // Flip the card
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, isFlipped: true } : c))
    );
    setFlippedCards((prev) => [...prev, cardId]);

    // Check for match if two cards are flipped
    if (flippedCards.length === 1) {
      setIsProcessing(true);
      setMoves((prev) => prev + 1);

      const firstCardId = flippedCards[0];
      const firstCard = cards.find((c) => c.id === firstCardId);

      if (firstCard && firstCard.wordId === card.wordId && firstCard.type !== card.type) {
        // Match found!
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) =>
              c.wordId === card.wordId ? { ...c, isMatched: true } : c
            )
          );

          // Track cleared word
          setClearedWordIds((prev) => {
            const newSet = new Set(prev);
            newSet.add(card.wordId);
            return newSet;
          });

          // Notify parent
          onWordCleared(card.wordId);

          setMatchedPairs((prev) => prev + 1);
          setFlippedCards([]);
          setIsProcessing(false);

          // Check if we need to refill
          const activeCards = cards.filter((c) => !c.isMatched && c.wordId !== card.wordId);
          if (activeCards.length <= MIN_CARDS_THRESHOLD) {
            // Get next batch of words
            const nextWords = remainingWords.filter(
              (w) => !clearedWordIds.has(w.id) && w.id !== card.wordId
            );

            if (nextWords.length > 0) {
              setTimeout(() => {
                addMoreCards(nextWords, activeCards);
              }, 500);
            } else if (activeCards.length === 0) {
              // All words cleared!
              setShowCongrats(true);
              if (onGameComplete) {
                onGameComplete();
              }
            }
          }
        }, 600);
      } else {
        // No match - flip back
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) =>
              c.id === firstCardId || c.id === cardId ? { ...c, isFlipped: false } : c
            )
          );
          setFlippedCards([]);
          setIsProcessing(false);
        }, 1000);
      }
    }
  };

  // Add more cards to the grid
  const addMoreCards = (availableWords: WordItem[], existingActiveCards: Card[]) => {
    const neededPairs = Math.ceil((16 - existingActiveCards.length) / 2);
    const newBatchWords = availableWords.slice(0, neededPairs);

    if (newBatchWords.length === 0) return;

    const newCards: Card[] = [];
    newBatchWords.forEach((word) => {
      newCards.push({
        id: `${word.id}-word-${Date.now()}`,
        wordId: word.id,
        content: word.word,
        type: 'word',
        isFlipped: false,
        isMatched: false,
      });
      newCards.push({
        id: `${word.id}-meaning-${Date.now()}`,
        wordId: word.id,
        content: word.meaning,
        type: 'meaning',
        isFlipped: false,
        isMatched: false,
      });
    });

    // Only shuffle new cards, keep existing cards in their positions
    const shuffledNewCards = newCards.sort(() => Math.random() - 0.5);

    // Add new cards to the end (they'll fill in where matched cards were removed)
    setCards(prev => {
      // Keep unmatched cards in place, add new cards
      const activeOldCards = prev.filter(c => !c.isMatched);
      return [...activeOldCards, ...shuffledNewCards];
    });
    setCurrentBatchWords((prev) => [...prev.filter((w) => !clearedWordIds.has(w.id)), ...newBatchWords]);
  };

  // Reset game
  const resetGame = () => {
    setClearedWordIds(new Set());
    setRemainingWords(words);
    setMoves(0);
    setShowCongrats(false);
    initializeBatch(words);
  };

  const activeCardsCount = cards.filter((c) => !c.isMatched).length;
  const activeMeaningCards = cards.filter((c) => !c.isMatched && c.type === 'meaning');
  const activeWordCards = cards.filter((c) => !c.isMatched && c.type === 'word');
  const totalCleared = clearedWordIds.size;
  const totalWords = words.length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-gradient-to-br from-red-50 to-red-100 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm border-b border-red-200">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🃏</span>
          <div>
            <h2 className="text-lg font-bold text-red-900">오답 탈출</h2>
            <p className="text-xs text-red-600">단어와 뜻을 매치하세요!</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={resetGame}
            className="p-2 bg-red-100 rounded-lg"
          >
            <RotateCcw className="w-5 h-5 text-red-600" />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className="p-2 bg-red-100 rounded-lg"
          >
            <X className="w-5 h-5 text-red-600" />
          </motion.button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex justify-center gap-6 p-3 bg-white/60">
        <div className="text-center">
          <p className="text-xs text-red-500 font-medium">탈출 완료</p>
          <p className="text-lg font-bold text-red-700">{totalCleared}/{totalWords}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-red-500 font-medium">시도 횟수</p>
          <p className="text-lg font-bold text-red-700">{moves}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-red-500 font-medium">남은 카드</p>
          <p className="text-lg font-bold text-red-700">{activeCardsCount}</p>
        </div>
      </div>

      {/* Game Grid - 4 columns (2 for meanings, 2 for words) */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="grid grid-cols-4 gap-3" style={{ gridAutoRows: 'minmax(80px, auto)' }}>
          <AnimatePresence mode="popLayout">
            {/* Left 2 columns: Meanings (lighter color) */}
            {activeMeaningCards.map((card) => (
              <motion.div
                key={card.id}
                layout
                initial={{ scale: 0, rotateY: 180 }}
                animate={{ scale: 1, rotateY: 0 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                onClick={() => handleCardClick(card.id)}
                className="cursor-pointer"
                style={{ perspective: '1000px' }}
              >
                <motion.div
                  animate={{ rotateY: card.isFlipped ? 180 : 0 }}
                  transition={{ duration: 0.4 }}
                  className="relative w-full h-full min-h-[80px]"
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  {/* Back side */}
                  <div
                    className="absolute inset-0 rounded-xl bg-gradient-to-br from-rose-200 to-red-300 flex items-center justify-center"
                    style={{
                      backfaceVisibility: 'hidden',
                      boxShadow: '0 2px 8px rgba(244, 63, 94, 0.2)'
                    }}
                  >
                    <span className="text-xl">❓</span>
                  </div>
                  {/* Front side - lighter color for meanings */}
                  <div
                    className="absolute inset-0 rounded-xl flex items-center justify-center p-2 bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-100"
                    style={{
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.06)'
                    }}
                  >
                    <p
                      className="text-center font-medium text-rose-600"
                      style={{
                        fontSize: card.content.length > 15 ? '10px' : '11px',
                        wordBreak: 'break-word',
                        lineHeight: 1.2
                      }}
                    >
                      {card.content}
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            ))}

            {/* Right 2 columns: Words */}
            {activeWordCards.map((card) => (
              <motion.div
                key={card.id}
                layout
                initial={{ scale: 0, rotateY: 180 }}
                animate={{ scale: 1, rotateY: 0 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                onClick={() => handleCardClick(card.id)}
                className="cursor-pointer"
                style={{ perspective: '1000px' }}
              >
                <motion.div
                  animate={{ rotateY: card.isFlipped ? 180 : 0 }}
                  transition={{ duration: 0.4 }}
                  className="relative w-full h-full min-h-[80px]"
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  {/* Back side */}
                  <div
                    className="absolute inset-0 rounded-xl bg-gradient-to-br from-rose-400 to-red-500 flex items-center justify-center"
                    style={{
                      backfaceVisibility: 'hidden',
                      boxShadow: '0 3px 10px rgba(244, 63, 94, 0.3)'
                    }}
                  >
                    <span className="text-xl">❓</span>
                  </div>
                  {/* Front side */}
                  <div
                    className="absolute inset-0 rounded-xl flex items-center justify-center p-2 bg-gradient-to-br from-white to-rose-50 border border-rose-200"
                    style={{
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                      boxShadow: '0 3px 8px rgba(0, 0, 0, 0.08)'
                    }}
                  >
                    <p
                      className="text-center font-semibold text-red-700"
                      style={{
                        fontSize: card.content.length > 12 ? '11px' : '13px',
                        wordBreak: 'break-word',
                        lineHeight: 1.2
                      }}
                    >
                      {card.content}
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Congratulations Modal */}
      <AnimatePresence>
        {showCongrats && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 flex items-center justify-center z-60"
          >
            <motion.div
              initial={{ scale: 0.5, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.5, y: 50 }}
              className="bg-white rounded-2xl p-8 mx-4 text-center shadow-2xl"
            >
              <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">축하합니다! 🎉</h3>
              <p className="text-gray-600 mb-1">모든 오답을 탈출했습니다!</p>
              <p className="text-sm text-gray-500 mb-6">
                {totalWords}개 단어 / {moves}번 시도
              </p>
              <div className="flex gap-3 justify-center">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={resetGame}
                  className="px-6 py-3 bg-red-600 text-white rounded-xl font-semibold"
                >
                  다시 하기
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={onClose}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold"
                >
                  닫기
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
