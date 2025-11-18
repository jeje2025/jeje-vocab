import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Undo2, X } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface Word {
  id: string;
  word: string;
  pronunciation?: string;
  meaning: string;
  example_sentence?: string;
  order_index: number;
}

interface WordSelectionScreenProps {
  onBack: () => void;
  vocabularyId: string;
  vocabularyName: string;
  totalWords: number;
  onComplete: (selectedWordIds: string[], wordsPerUnit: number) => void;
}

export function WordSelectionScreen({
  onBack,
  vocabularyId,
  vocabularyName,
  totalWords,
  onComplete,
}: WordSelectionScreenProps) {
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [removedWords, setRemovedWords] = useState<Set<string>>(new Set());
  const [revealedMeanings, setRevealedMeanings] = useState<Set<string>>(new Set());
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const wordsPerUnit = 100; // 고정값
  const [swipingWord, setSwipingWord] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isSwiping = useRef(false);

  useEffect(() => {
    fetchWords();
  }, [vocabularyId]);

  const fetchWords = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/shared-vocabulary/${vocabularyId}/words`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch words');
      }

      const data = await response.json();
      setWords(data.words || []);
    } catch (error) {
      console.error('Error fetching words:', error);
      toast.error('단어 불러오기 실패');
    } finally {
      setLoading(false);
    }
  };

  const toggleMeaning = (wordId: string) => {
    setRevealedMeanings((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(wordId)) {
        newSet.delete(wordId);
      } else {
        newSet.add(wordId);
      }
      return newSet;
    });
  };

  const handleTouchStart = (e: React.TouchEvent, wordId: string) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isSwiping.current = false;
    setSwipingWord(wordId);
  };

  const handleTouchMove = (e: React.TouchEvent, wordId: string) => {
    if (swipingWord !== wordId) return;

    const deltaX = e.touches[0].clientX - touchStartX.current;
    const deltaY = e.touches[0].clientY - touchStartY.current;

    // Determine if it's a horizontal swipe
    if (!isSwiping.current && Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      isSwiping.current = true;
    }

    if (isSwiping.current) {
      e.preventDefault();
      setSwipeOffset(deltaX);
    }
  };

  const handleTouchEnd = (wordId: string) => {
    if (Math.abs(swipeOffset) > 100 && isSwiping.current) {
      removeWord(wordId);
    }
    setSwipeOffset(0);
    setSwipingWord(null);
    isSwiping.current = false;
  };

  const removeWord = (wordId: string) => {
    setRemovedWords((prev) => new Set(prev).add(wordId));
    setUndoStack((prev) => [...prev, wordId]);
    setRevealedMeanings((prev) => {
      const newSet = new Set(prev);
      newSet.delete(wordId);
      return newSet;
    });
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;

    const lastRemoved = undoStack[undoStack.length - 1];
    setRemovedWords((prev) => {
      const newSet = new Set(prev);
      newSet.delete(lastRemoved);
      return newSet;
    });
    setUndoStack((prev) => prev.slice(0, -1));
  };

  const speakWord = (word: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      utterance.rate = 0.8;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleComplete = () => {
    const selectedWordIds = words
      .filter((word) => !removedWords.has(word.id))
      .map((word) => word.id);

    if (selectedWordIds.length === 0) {
      toast.error('최소 1개 이상의 단어를 선택해주세요');
      return;
    }

    onComplete(selectedWordIds, wordsPerUnit);
  };

  const visibleWords = words.filter((word) => !removedWords.has(word.id));
  const totalUnits = Math.ceil(visibleWords.length / wordsPerUnit);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#8B5CF6] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#091A7A]/70">단어 로딩중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-40 backdrop-blur-xl border-b border-gray-100 px-6 py-4">
        <div className="flex items-center justify-between">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-200"
          >
            <ArrowLeft className="w-5 h-5 text-[#091A7A]" />
          </motion.button>

          <div className="text-center flex-1">
            <h1 className="text-lg font-bold text-[#091A7A]">{vocabularyName}</h1>
            <p className="text-sm text-[#091A7A]/60">
              {visibleWords.length} / {totalWords} 단어 선택됨
            </p>
          </div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm transition-all ${
              undoStack.length > 0
                ? 'bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED]'
                : 'bg-gray-200'
            }`}
          >
            <Undo2 className="w-5 h-5 text-white" />
          </motion.button>
        </div>

        <div className="text-xs text-[#091A7A]/50 mt-2 text-center">
          좌우로 스와이프해서 이미 아는 단어를 제거하세요
        </div>
      </div>

      {/* Word List */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="p-4">
          <AnimatePresence>
            {visibleWords.map((word, index) => {
              const isRevealed = revealedMeanings.has(word.id);
              const isSwiping = swipingWord === word.id;
              const offset = isSwiping ? swipeOffset : 0;
              const opacity = Math.max(0.3, 1 - Math.abs(offset) / 200);

              return (
                <motion.div
                  key={word.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{
                    opacity: opacity,
                    y: 0,
                    x: offset,
                  }}
                  exit={{ opacity: 0, x: offset > 0 ? 300 : -300, height: 0 }}
                  transition={{ duration: 0.2 }}
                  onTouchStart={(e) => handleTouchStart(e, word.id)}
                  onTouchMove={(e) => handleTouchMove(e, word.id)}
                  onTouchEnd={() => handleTouchEnd(word.id)}
                  className="relative bg-white/95 backdrop-blur-lg rounded-[20px] p-4 mb-3 shadow-md border border-white/20"
                  style={{
                    touchAction: isSwiping ? 'none' : 'auto',
                  }}
                >
                  {/* Swipe indicator */}
                  {isSwiping && Math.abs(offset) > 50 && (
                    <div
                      className={`absolute top-1/2 -translate-y-1/2 ${
                        offset > 0 ? 'right-4' : 'left-4'
                      }`}
                    >
                      <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center opacity-80">
                        <X className="w-6 h-6 text-white" strokeWidth={3} />
                      </div>
                    </div>
                  )}

                  {/* Index */}
                  <div className="absolute top-3 left-3 w-6 h-6 bg-[#8B5CF6] rounded-full flex items-center justify-center">
                    <span className="text-[10px] text-white font-medium">{index + 1}</span>
                  </div>

                  {/* Word and Meaning - Single line */}
                  <div
                    className="flex items-center justify-between pl-10 cursor-pointer"
                    onClick={() => toggleMeaning(word.id)}
                  >
                    <span className="text-base font-semibold text-gray-700">
                      {word.word}
                    </span>
                    <span className={`text-sm transition-opacity ${
                      isRevealed ? 'text-[#091A7A] opacity-100' : 'text-[#091A7A]/30 opacity-50'
                    }`}>
                      {isRevealed ? word.meaning : '탭하여 뜻 보기'}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {visibleWords.length === 0 && (
            <div className="text-center py-16">
              <p className="text-[#091A7A]/70">모든 단어가 제거되었습니다</p>
              <p className="text-sm text-[#091A7A]/50 mt-1">
                실행 취소 버튼으로 단어를 복원하세요
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Panel */}
      <div className="sticky bottom-0 backdrop-blur-lg border-t border-white/20 p-4">
        <div className="mb-3 text-center">
          <p className="text-sm text-[#091A7A]/60">
            100개당 한 유닛으로 저장됩니다.
          </p>
        </div>

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleComplete}
          disabled={visibleWords.length === 0}
          className={`w-full h-12 rounded-[20px] flex items-center justify-center shadow-lg transition-all ${
            visibleWords.length > 0
              ? 'bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white'
              : 'bg-gray-300 text-gray-500'
          }`}
        >
          내 단어장에 추가
        </motion.button>
      </div>
    </div>
  );
}

// Import these from utils
import { projectId, publicAnonKey } from '../utils/supabase/info';