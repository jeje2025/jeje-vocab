import React, { useState, useEffect } from 'react';
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
  const WORDS_PER_PAGE = 8; // 8단어 = 16카드 (4x4)

  const [allCards, setAllCards] = useState<Card[]>([]); // 전체 카드 (한 번만 섞음)
  const [currentPage, setCurrentPage] = useState(0);
  const [flippedCards, setFlippedCards] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCongrats, setShowCongrats] = useState(false);
  const [showPageComplete, setShowPageComplete] = useState(false);

  // Initialize game - create shuffled cards ONCE
  useEffect(() => {
    if (words.length > 0 && allCards.length === 0) {
      // Create cards (word + meaning for each word)
      const newCards: Card[] = [];
      words.forEach((word) => {
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

      // Shuffle cards - 딱 한 번만 섞음! 절대 다시 섞지 않음
      const shuffled = newCards.sort(() => Math.random() - 0.5);
      setAllCards(shuffled);
    }
  }, [words, allCards.length]);

  // 현재 페이지의 카드들
  const totalPages = Math.ceil(words.length / WORDS_PER_PAGE);
  const startIdx = currentPage * WORDS_PER_PAGE * 2; // 2 = word + meaning
  const endIdx = startIdx + WORDS_PER_PAGE * 2;
  const cards = allCards.slice(startIdx, endIdx);

  // Handle card click
  const handleCardClick = (cardId: string) => {
    if (isProcessing) return;

    const card = cards.find((c) => c.id === cardId);
    if (!card || card.isFlipped || card.isMatched) return;
    if (flippedCards.length >= 2) return;

    // Flip the card
    setAllCards((prev) =>
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
          setAllCards((prev) =>
            prev.map((c) =>
              c.wordId === card.wordId ? { ...c, isMatched: true, isFlipped: false } : c
            )
          );

          // Notify parent
          onWordCleared(card.wordId);

          setFlippedCards([]);
          setIsProcessing(false);

          // Check if all cards in current page are matched
          const unmatchedCardsInPage = cards.filter((c) => !c.isMatched && c.wordId !== card.wordId);
          if (unmatchedCardsInPage.length === 0) {
            // Current page completed!
            const hasMorePages = currentPage < totalPages - 1;

            if (hasMorePages) {
              // Show page complete modal
              setTimeout(() => {
                setShowPageComplete(true);
              }, 500);
            } else {
              // All pages completed!
              setTimeout(() => {
                setShowCongrats(true);
                if (onGameComplete) {
                  onGameComplete();
                }
              }, 500);
            }
          }
        }, 600);
      } else {
        // No match - flip back
        setTimeout(() => {
          setAllCards((prev) =>
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

  // Go to next page
  const goToNextPage = () => {
    setCurrentPage((prev) => prev + 1);
    setShowPageComplete(false);
    setMoves(0);
  };

  // Reset game - 위치는 유지하고 상태만 초기화
  const resetGame = () => {
    setAllCards((prev) =>
      prev.map((c) => ({
        ...c,
        isFlipped: false,
        isMatched: false,
      }))
    );
    setFlippedCards([]);
    setMoves(0);
    setShowCongrats(false);
    setShowPageComplete(false);
    setCurrentPage(0);
    setIsProcessing(false);
  };

  const matchedCount = cards.filter((c) => c.isMatched).length / 2; // 2 cards per word
  const totalWords = words.length;
  const currentPageNumber = currentPage + 1;
  const wordsInCurrentPage = Math.min(WORDS_PER_PAGE, words.length - currentPage * WORDS_PER_PAGE);

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
            <h2 className="text-lg font-bold text-red-900">오답 메모리 게임</h2>
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
          <p className="text-xs text-red-500 font-medium">페이지</p>
          <p className="text-lg font-bold text-red-700">{currentPageNumber}/{totalPages}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-red-500 font-medium">이번 페이지</p>
          <p className="text-lg font-bold text-red-700">{matchedCount}/{wordsInCurrentPage}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-red-500 font-medium">시도 횟수</p>
          <p className="text-lg font-bold text-red-700">{moves}</p>
        </div>
      </div>

      {/* Game Grid - 4x4 or dynamic grid */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div
          className="grid gap-3 max-w-4xl mx-auto"
          style={{
            gridTemplateColumns: 'repeat(4, 1fr)',
            gridAutoRows: 'minmax(80px, auto)'
          }}
        >
          {cards.map((card) => (
            <motion.div
              key={card.id}
              initial={{ scale: 0, rotateY: 180 }}
              animate={{
                scale: 1, // 항상 크기 유지
                rotateY: 0
              }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 25
              }}
              onClick={() => !card.isMatched && handleCardClick(card.id)}
              className={card.isMatched ? 'pointer-events-none' : 'cursor-pointer'}
              style={{ perspective: '1000px' }}
            >
              <motion.div
                animate={{ rotateY: card.isFlipped || card.isMatched ? 180 : 0 }}
                transition={{ duration: 0.4 }}
                className="relative w-full h-full min-h-[80px]"
                style={{ transformStyle: 'preserve-3d' }}
              >
                {/* Back side - card back */}
                <div
                  className={`absolute inset-0 rounded-xl flex items-center justify-center ${
                    card.type === 'word'
                      ? 'bg-gradient-to-br from-rose-400 to-red-500 shadow-md'
                      : 'bg-gradient-to-br from-rose-200 to-red-300 shadow-sm'
                  }`}
                  style={{
                    backfaceVisibility: 'hidden',
                  }}
                >
                  <span className="text-xl">❓</span>
                </div>

                {/* Front side - card content */}
                <div
                  className={`absolute inset-0 rounded-xl flex items-center justify-center p-2 border ${
                    card.isMatched
                      ? 'bg-gradient-to-br from-green-50 to-emerald-100 border-green-300 shadow-md'
                      : card.type === 'word'
                      ? 'bg-gradient-to-br from-white to-rose-50 border-rose-200 shadow-md'
                      : 'bg-gradient-to-br from-rose-50 to-pink-50 border-rose-100 shadow-sm'
                  }`}
                  style={{
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                  }}
                >
                  <p
                    className={`text-center font-medium ${
                      card.isMatched
                        ? 'text-green-700 font-bold'
                        : card.type === 'word' ? 'text-red-700 font-semibold' : 'text-rose-600'
                    }`}
                    style={{
                      fontSize: card.content.length > 15 ? '10px' : card.content.length > 12 ? '11px' : '13px',
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
        </div>
      </div>

      {/* Page Complete Modal */}
      <AnimatePresence>
        {showPageComplete && (
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
              <div className="text-5xl mb-4">🎯</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">페이지 {currentPageNumber} 완료!</h3>
              <p className="text-gray-600 mb-1">{wordsInCurrentPage}개 단어를 맞췄어요</p>
              <p className="text-sm text-gray-500 mb-6">
                다음 페이지로 이동하세요 ({currentPageNumber}/{totalPages})
              </p>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={goToNextPage}
                className="w-full px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-semibold"
              >
                다음 페이지 시작 →
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
