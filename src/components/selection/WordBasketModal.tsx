import { useEffect, useMemo, useState, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, ChevronDown, Loader2, FolderPlus, FolderCheck } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { BasketWord } from '../../hooks/useWordBasket';
import { getSupabaseClient } from '../../utils/supabase/client';
import { projectId } from '../../utils/supabase/info';
import { generateVocabularyBatch } from '../../utils/vocabularyGenerator';

const supabase = getSupabaseClient();

type Mode = 'new' | 'existing';

interface WordBasketModalProps {
  open: boolean;
  onClose: () => void;
  words: BasketWord[];
  onRemoveWord: (wordId: string) => void;
  onClear: () => void;
  onActionComplete?: () => void;
  currentVocabularyId?: string;
  currentVocabularyTitle?: string;
}

const createVocabularyId = () => {
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `vocab_${Date.now()}_${Math.random().toString(36).slice(2)}`;
};

const normalizeWordsForApi = (words: BasketWord[]) => {
  return words.map((word) => ({
    word: word.word,
    pronunciation: word.metadata?.pronunciation || '',
    part_of_speech: word.metadata?.partOfSpeech || word.metadata?.pos || '',
    meaning: word.meaning || '',
    definition: word.metadata?.definition || '',
    synonyms: word.metadata?.synonyms || [],
    antonyms: word.metadata?.antonyms || [],
    derivatives: word.metadata?.derivatives || [],
    example: word.metadata?.example || word.metadata?.example_sentence || '',
    translation: word.metadata?.translation || '',
    translation_highlight: word.metadata?.translation_highlight || word.metadata?.translationHighlight || '',
    etymology: word.metadata?.etymology || '',
    metadata: {
      ...(word.metadata || {}),
      source: word.source,
    },
  }));
};

const getSessionToken = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    throw new Error('로그인이 필요합니다. 다시 로그인해주세요.');
  }
  return token;
};

export function WordBasketModal({
  open,
  onClose,
  words,
  onRemoveWord,
  onClear,
  onActionComplete,
  currentVocabularyId,
  currentVocabularyTitle,
}: WordBasketModalProps) {
  const [mode, setMode] = useState<Mode>('new');
  const [newTitle, setNewTitle] = useState('');
  const [existingVocabularies, setExistingVocabularies] = useState<Array<{ id: string; title: string; total_words?: number }>>([]);
  const [selectedVocabularyId, setSelectedVocabularyId] = useState('');
  const [isLoadingVocabularies, setIsLoadingVocabularies] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);

  const newTitleInputRef = useRef<HTMLInputElement>(null);
  const selectInputRef = useRef<HTMLSelectElement>(null);

  const selectedCount = words.length;

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  const fetchExistingVocabularies = async () => {
    setIsLoadingVocabularies(true);
    try {
      const token = await getSessionToken();
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/user-vocabularies`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || '단어장 목록을 불러오지 못했습니다.');
      }

      const vocabularies = Array.isArray(data)
        ? data
        : Array.isArray(data.vocabularies)
          ? data.vocabularies
          : [];
      setExistingVocabularies(vocabularies);
    } catch (error: any) {
      console.error('단어장 목록 불러오기 실패:', error);
      toast.error(error?.message || '단어장 목록을 불러오지 못했습니다.');
    } finally {
      setIsLoadingVocabularies(false);
    }
  };

  useEffect(() => {
    if (open) {
      setMode('new');
      // If current vocabulary exists, pre-select it and switch to existing mode
      if (currentVocabularyId) {
        setMode('existing');
        setSelectedVocabularyId(currentVocabularyId);
      } else {
        setSelectedVocabularyId('');
      }
      fetchExistingVocabularies();

      // Auto-focus input after modal opens - 모바일을 위해 딜레이 증가
      setTimeout(() => {
        const inputToFocus = currentVocabularyId ? selectInputRef.current : newTitleInputRef.current;
        if (inputToFocus) {
          inputToFocus.focus();
          // 모바일에서도 작동하도록 추가 시도
          inputToFocus.click();
        }
      }, 300);
    }
  }, [open, currentVocabularyId]);

  // Auto-focus when mode changes
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        const inputToFocus = mode === 'new' ? newTitleInputRef.current : selectInputRef.current;
        if (inputToFocus) {
          inputToFocus.focus();
          // 모바일에서도 작동하도록 추가 시도
          inputToFocus.click();
        }
      }, 200);
    }
  }, [mode, open]);

  const modalTitle = useMemo(
    () =>
      mode === 'new'
        ? '새 단어장으로 저장'
        : '기존 단어장에 추가',
    [mode]
  );

  // Combine current vocabulary with existing vocabularies
  const allVocabularies = useMemo(() => {
    const vocabs = [...existingVocabularies];

    // Add current vocabulary if it exists and is not already in the list
    if (currentVocabularyId && currentVocabularyTitle) {
      const exists = vocabs.some(v => v.id === currentVocabularyId);
      if (!exists) {
        vocabs.unshift({
          id: currentVocabularyId,
          title: `${currentVocabularyTitle} (현재 단어장)`,
          total_words: undefined
        });
      } else {
        // Mark the existing vocabulary as current
        const index = vocabs.findIndex(v => v.id === currentVocabularyId);
        if (index !== -1) {
          vocabs[index] = {
            ...vocabs[index],
            title: `${vocabs[index].title} (현재 단어장)`
          };
          // Move to front
          const [current] = vocabs.splice(index, 1);
          vocabs.unshift(current);
        }
      }
    }

    return vocabs;
  }, [existingVocabularies, currentVocabularyId, currentVocabularyTitle]);

  const handleCreateNew = async () => {
    if (selectedCount === 0) {
      toast.error('선택된 단어가 없습니다.');
      return;
    }
    if (!newTitle.trim()) {
      toast.error('단어장 이름을 입력해주세요.');
      return;
    }

    try {
      setIsSubmitting(true);
      toast.loading('단어 데이터를 생성하고 있어요...', { id: 'word-basket-action' });
      const token = await getSessionToken();

      // Step 1: Generate complete word data using Gemini API (with batching)
      const generatedWords = await generateVocabularyBatch(
        words.map(w => ({ word: w.word })),
        token,
        {
          onProgress: (progress) => setBatchProgress(progress),
          onBatchUpdate: (message) => toast.loading(message, { id: 'word-basket-action' })
        }
      );

      if (generatedWords.length === 0) {
        throw new Error('생성된 단어가 없습니다.');
      }

      // Step 2: Save vocabulary with generated words
      toast.loading('새 단어장을 저장하고 있어요...', { id: 'word-basket-action' });
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/save-vocabulary`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            vocabularyId: createVocabularyId(),
            title: newTitle.trim(),
            category: 'My Own',
            level: 'Custom',
            words: generatedWords,
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || '단어장을 생성하지 못했습니다.');
      }

      toast.success('새 단어장이 저장되었어요! 🎉', { id: 'word-basket-action' });
      onActionComplete?.();
      onClear();
      handleClose();
    } catch (error: any) {
      console.error('단어장 생성 실패:', error);
      toast.error(error?.message || '단어장을 생성하지 못했습니다.', { id: 'word-basket-action' });
    } finally {
      setIsSubmitting(false);
      setBatchProgress(null);
    }
  };

  const handleAddToExisting = async () => {
    if (selectedCount === 0) {
      toast.error('선택된 단어가 없습니다.');
      return;
    }
    if (!selectedVocabularyId) {
      toast.error('추가할 단어장을 선택해주세요.');
      return;
    }

    try {
      setIsSubmitting(true);
      toast.loading('단어 데이터를 생성하고 있어요...', { id: 'word-basket-action' });
      const token = await getSessionToken();

      // Step 1: Generate complete word data using Gemini API (with batching)
      const generatedWords = await generateVocabularyBatch(
        words.map(w => ({ word: w.word })),
        token,
        {
          onProgress: (progress) => setBatchProgress(progress),
          onBatchUpdate: (message) => toast.loading(message, { id: 'word-basket-action' })
        }
      );

      if (generatedWords.length === 0) {
        throw new Error('생성된 단어가 없습니다.');
      }

      // Step 2: Add generated words to existing vocabulary
      toast.loading('선택한 단어를 추가하는 중...', { id: 'word-basket-action' });
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/add-words-to-vocabulary`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            vocabularyId: selectedVocabularyId,
            words: generatedWords,
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || '단어를 추가하지 못했습니다.');
      }

      toast.success('단어가 단어장에 추가되었어요!', { id: 'word-basket-action' });
      onActionComplete?.();
      onClear();
      handleClose();
    } catch (error: any) {
      console.error('단어장 추가 실패:', error);
      toast.error(error?.message || '단어를 추가하지 못했습니다.', { id: 'word-basket-action' });
    } finally {
      setIsSubmitting(false);
      setBatchProgress(null);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center px-4 py-6"
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            className="w-full max-w-2xl max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-[#F5F3FF] to-white">
              <div>
                <p className="text-xs uppercase tracking-wide text-[#7C3AED] font-semibold">
                  {selectedCount}개 단어 선택됨
                </p>
                <h2 className="text-xl font-bold text-[#1F1D2B]">{modalTitle}</h2>
              </div>
              <button
                onClick={handleClose}
                className="w-10 h-10 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setMode('new')}
                  className={`p-3 rounded-2xl border flex items-center gap-2 text-sm font-semibold ${
                    mode === 'new'
                      ? 'border-[#7C3AED] bg-[#F5F3FF] text-[#5B21B6]'
                      : 'border-gray-200 text-gray-500'
                  }`}
                >
                  <FolderPlus className="w-4 h-4" />
                  새 단어장
                </button>
                <button
                  onClick={() => setMode('existing')}
                  className={`p-3 rounded-2xl border flex items-center gap-2 text-sm font-semibold ${
                    mode === 'existing'
                      ? 'border-[#7C3AED] bg-[#F5F3FF] text-[#5B21B6]'
                      : 'border-gray-200 text-gray-500'
                  }`}
                >
                  <FolderCheck className="w-4 h-4" />
                  기존 단어장
                </button>
              </div>

              <div className="space-y-4">
                {mode === 'new' ? (
                  <div>
                    <label className="text-sm text-gray-500 mb-1 block">단어장 이름</label>
                    <input
                      ref={newTitleInputRef}
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="예: 2025-11-17 편입 모의고사"
                      className="w-full rounded-2xl border border-gray-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#C4B5FD]"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="text-sm text-gray-500 mb-2 block">추가할 단어장 선택</label>
                    <div className="relative">
                      <select
                        ref={selectInputRef}
                        value={selectedVocabularyId}
                        onChange={(e) => setSelectedVocabularyId(e.target.value)}
                        className="w-full appearance-none rounded-2xl border border-gray-200 px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-[#C4B5FD]"
                      >
                        <option value="">단어장을 선택해주세요</option>
                        {allVocabularies.map((vocab) => (
                          <option key={vocab.id} value={vocab.id}>
                            {vocab.title}{vocab.total_words !== undefined ? ` (${vocab.total_words}단어)` : ''}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-gray-500 absolute right-4 top-1/2 -translate-y-1/2" />
                    </div>
                    {isLoadingVocabularies && (
                      <p className="text-sm text-gray-500 mt-2">단어장을 불러오는 중...</p>
                    )}
                    {!isLoadingVocabularies && allVocabularies.length === 0 && (
                      <p className="text-sm text-gray-500 mt-2">사용 중인 단어장이 없습니다.</p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">선택한 단어</p>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {words.map((word) => (
                    <div
                      key={word.id}
                      className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 px-4 py-2"
                    >
                      <div>
                        <p className="text-sm font-semibold text-[#1F1D2B]">{word.word}</p>
                        <p className="text-xs text-gray-500">{word.meaning}</p>
                        {word.source && (
                          <p className="text-[10px] text-[#7C3AED] mt-0.5">{word.source}</p>
                        )}
                      </div>
                      <button
                        onClick={() => onRemoveWord(word.id)}
                        className="text-xs text-gray-500 hover:text-[#DC2626]"
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white">
              <button
                onClick={onClear}
                className="text-sm text-gray-500 hover:text-[#7C3AED]"
                disabled={isSubmitting}
              >
                전체 선택 해제
              </button>
              <button
                onClick={mode === 'new' ? handleCreateNew : handleAddToExisting}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-[#5B21B6] to-[#7C3AED] text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {mode === 'new' ? '새 단어장 만들기' : '단어장에 추가'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
