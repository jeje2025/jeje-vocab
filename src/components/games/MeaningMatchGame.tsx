import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, X, Shuffle, Sparkles, Trophy, Target, ChevronRight } from 'lucide-react';

interface MeaningMatchGameProps {
  words: Array<{
    id: string;
    word: string;
    meaning: string;
  }>;
  mode: 'word-to-meaning' | 'meaning-to-word';
  onComplete: (score: number, correctCount: number) => void;
  onWrongAnswer?: (wordId: string) => void;
}

interface MatchCard {
  id: string;
  content: string;
  type: 'left' | 'right';
  matched: boolean;
  wordId: string;
  isWord: boolean;
}

const WORDS_PER_PAGE = 5;

export function MeaningMatchGame({ words, mode, onComplete, onWrongAnswer }: MeaningMatchGameProps) {
  const [allShuffledWords, setAllShuffledWords] = useState<typeof words>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [leftCards, setLeftCards] = useState<MatchCard[]>([]);
  const [rightCards, setRightCards] = useState<MatchCard[]>([]);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [selectedRight, setSelectedRight] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<Set<string>>(new Set());
  const [wrongAttempt, setWrongAttempt] = useState<{ left: string; right: string } | null>(null);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [totalScore, setTotalScore] = useState(0);

  const totalPages = Math.ceil(words.length / WORDS_PER_PAGE);

  // Initialize: shuffle all words once
  useEffect(() => {
    const shuffled = [...words].sort(() => Math.random() - 0.5);
    setAllShuffledWords(shuffled);
    setCurrentPage(0);
    setTotalScore(0);
  }, [words, mode]);

  // Load current page
  useEffect(() => {
    if (allShuffledWords.length === 0) return;

    const startIdx = currentPage * WORDS_PER_PAGE;
    const endIdx = Math.min(startIdx + WORDS_PER_PAGE, allShuffledWords.length);
    const pageWords = allShuffledWords.slice(startIdx, endIdx);

    initializePage(pageWords);
  }, [allShuffledWords, currentPage, mode]);

  const initializePage = (pageWords: typeof words) => {
    // Shuffle function
    const shuffle = <T,>(array: T[]): T[] => {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };

    if (mode === 'word-to-meaning') {
      // Left: words, Right: meanings
      const left: MatchCard[] = pageWords.map((w, i) => ({
        id: `left-${currentPage}-${i}`,
        content: w.word,
        type: 'left' as const,
        matched: false,
        wordId: w.id,
        isWord: true
      }));

      const right: MatchCard[] = shuffle(pageWords.map((w, i) => ({
        id: `right-${currentPage}-${i}`,
        content: w.meaning,
        type: 'right' as const,
        matched: false,
        wordId: w.id,
        isWord: false
      })));

      setLeftCards(left);
      setRightCards(right);
    } else {
      // Left: meanings, Right: words
      const left: MatchCard[] = pageWords.map((w, i) => ({
        id: `left-${currentPage}-${i}`,
        content: w.meaning,
        type: 'left' as const,
        matched: false,
        wordId: w.id,
        isWord: false
      }));

      const right: MatchCard[] = shuffle(pageWords.map((w, i) => ({
        id: `right-${currentPage}-${i}`,
        content: w.word,
        type: 'right' as const,
        matched: false,
        wordId: w.id,
        isWord: true
      })));

      setLeftCards(left);
      setRightCards(right);
    }

    setMatchedPairs(new Set());
    setSelectedLeft(null);
    setSelectedRight(null);
    setScore(0);
    setAttempts(0);
  };

  const handleCardClick = (card: MatchCard) => {
    if (card.matched) return;

    if (card.type === 'left') {
      setSelectedLeft(selectedLeft === card.id ? null : card.id);
    } else {
      setSelectedRight(selectedRight === card.id ? null : card.id);
    }
  };

  useEffect(() => {
    if (selectedLeft && selectedRight) {
      checkMatch();
    }
  }, [selectedLeft, selectedRight]);

  const checkMatch = () => {
    const leftCard = leftCards.find(c => c.id === selectedLeft);
    const rightCard = rightCards.find(c => c.id === selectedRight);

    if (!leftCard || !rightCard) return;

    setAttempts(prev => prev + 1);

    if (leftCard.wordId === rightCard.wordId) {
      // Correct match!
      const newMatched = new Set(matchedPairs);
      newMatched.add(leftCard.id);
      newMatched.add(rightCard.id);
      setMatchedPairs(newMatched);

      setLeftCards(prev => prev.map(c =>
        c.id === leftCard.id ? { ...c, matched: true } : c
      ));
      setRightCards(prev => prev.map(c =>
        c.id === rightCard.id ? { ...c, matched: true } : c
      ));

      setScore(prev => prev + 1);
      setTotalScore(prev => prev + 1);
      setSelectedLeft(null);
      setSelectedRight(null);

      // Check if current page is complete
      if (newMatched.size === leftCards.length * 2) {
        setTimeout(() => {
          if (currentPage < totalPages - 1) {
            // Move to next page
            setCurrentPage(prev => prev + 1);
          } else {
            // All pages complete!
            onComplete(totalScore + 1, totalScore + 1);
          }
        }, 800);
      }
    } else {
      // Wrong match
      setWrongAttempt({ left: leftCard.id, right: rightCard.id });
      if (onWrongAnswer) {
        onWrongAnswer(leftCard.wordId);
      }

      setTimeout(() => {
        setWrongAttempt(null);
        setSelectedLeft(null);
        setSelectedRight(null);
      }, 800);
    }
  };

  const getCardStyle = (card: MatchCard, isSelected: boolean) => {
    if (card.matched) {
      return 'bg-emerald-50 border-emerald-200 text-emerald-700';
    }
    if (wrongAttempt && (wrongAttempt.left === card.id || wrongAttempt.right === card.id)) {
      return 'bg-red-50 border-red-200 text-red-700 animate-shake';
    }
    if (isSelected) {
      return 'bg-white border-[#7C3AED] text-[#4C1D95] shadow-card';
    }
    return 'bg-white/95 border-white/60 text-[#2E1065]';
  };

  return (
    <div className="h-full bg-transparent overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full px-4 py-6 space-y-5">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-4 shadow-card border border-white/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#7C3AED] to-[#A78BFA] rounded-2xl flex items-center justify-center">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#5B21B6]">
                  {mode === 'word-to-meaning' ? '뜻 → 단어' : '단어 → 뜻'}
                </p>
                <p className="text-xs font-medium text-[#8B5CF6]">
                  세트 {currentPage + 1}/{totalPages}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-extrabold text-[#5B21B6]">
                {totalScore}/{words.length}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            {leftCards.map((card) => (
              <motion.button
                key={card.id}
                whileTap={{ scale: card.matched ? 1 : 0.97 }}
                onClick={() => handleCardClick(card)}
                disabled={card.matched}
                className={`w-full min-h-[70px] py-3 px-3 rounded-2xl border transition-all duration-200 text-center shadow-sm ${getCardStyle(
                  card,
                  selectedLeft === card.id
                )}`}
                style={{ touchAction: 'manipulation' }}
              >
                <div className="flex flex-col items-center justify-center gap-1">
                  <span className={`${card.isWord ? 'text-sm' : 'text-xs'} font-semibold text-[#2E1065]`}>{card.content}</span>
                  {card.matched && <CheckCircle className="w-4 h-4 text-emerald-600" />}
                </div>
              </motion.button>
            ))}
          </div>

          <div className="space-y-2">
            {rightCards.map((card) => (
              <motion.button
                key={card.id}
                whileTap={{ scale: card.matched ? 1 : 0.97 }}
                onClick={() => handleCardClick(card)}
                disabled={card.matched}
                className={`w-full min-h-[70px] py-3 px-3 rounded-2xl border transition-all duration-200 text-center shadow-sm ${getCardStyle(
                  card,
                  selectedRight === card.id
                )}`}
                style={{ touchAction: 'manipulation' }}
              >
                <div className="flex flex-col items-center justify-center gap-1">
                  <span className={`${card.isWord ? 'text-sm' : 'text-xs'} font-semibold text-[#2E1065]`}>{card.content}</span>
                  {card.matched && <CheckCircle className="w-4 h-4 text-emerald-600" />}
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
