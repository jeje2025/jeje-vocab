import { memo, useCallback, useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Volume2,
  Star,
  ChevronDown,
  Eye,
  EyeOff,
  Skull,
  Trash2,
  Home,
  ShoppingCart,
  Shuffle,
  Edit3,
  Check,
  X
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { BackButton } from './BackButton';
import { MemoryMatchGame } from './games/MemoryMatchGame';
import { ZombieGameScreen } from './ZombieGame';
import { useWordBasket, BasketWord } from '../hooks/useWordBasket';
import { WordBasketModal } from './selection/WordBasketModal';
import { useAuth } from '../hooks/useAuth';
import { projectId } from '../utils/supabase/info';

const env = typeof import.meta !== 'undefined' ? import.meta.env : undefined;
const DEBUG_WORD_LIST = Boolean(env?.DEV) && env?.VITE_DEBUG_WORD_LIST === 'true';
const logWordList = (...args: any[]) => {
  if (DEBUG_WORD_LIST) {
    console.log('[WordListScreen]', ...args);
  }
};

const WORD_CART_LIMIT = 60;
const RELATION_LABELS = {
  derivative: '파생어',
  synonym: '유의어',
  antonym: '반의어',
} as const;

type RelationType = keyof typeof RELATION_LABELS;

interface WordListScreenProps {
  onBack: () => void;
  onBackToHome?: () => void;
  vocabularyTitle: string;
  unitName: string;
  vocabularyWords?: any[]; // 실제 단어 데이터
  onAddToStarred?: (wordId: string) => void;
  onMoveToGraveyard?: (wordId: string) => void;
  onDeletePermanently?: (wordId: string) => void;
  onStartFlashcards?: () => void;
  filterType?: 'all' | 'starred' | 'graveyard' | 'wrong-answers'; // wrong-answers 추가
  starredWordIds?: string[]; // 별표된 단어 ID 목록
  graveyardWordIds?: string[]; // 무덤 단어 ID 목록
  wrongAnswersWordIds?: string[]; // 오답 단어 ID 목록
  hideHeader?: boolean; // 헤더 숨기기
  hideActionButtons?: boolean; // 액션 버튼 숨기기
  unitNumber?: number; // 유닛 번호
  vocabularyId?: string; // 현재 단어장 ID
  onRefreshVocabulary?: () => Promise<void>; // 단어장 새로고침 함수
}

interface WordData {
  id: string;
  word: string;
  pronunciation: string;
  partOfSpeech: string;
  meaning: string;
  example: string; // 영어 예문
  translation: string; // 한글 번역
  story: string;
  derivatives: { word: string; meaning: string }[];
  synonyms: { word: string; meaning: string }[];
  antonyms: { word: string; meaning: string }[];
  isStarred: boolean;
  isMeaningRevealed: boolean;
  isExpanded: boolean;
  exampleLanguage: 'en' | 'kr'; // 개별 단어의 예문 언어 설정
  swipeX: number;
  originalIndex: number; // 원래 번호를 저장
  graveyardAt?: string; // 무덤 이동 시간
}

function WordListScreenComponent({ onBack, onBackToHome, vocabularyTitle, unitName, vocabularyWords, onAddToStarred, onMoveToGraveyard, onDeletePermanently, onStartFlashcards, filterType, starredWordIds = [], graveyardWordIds = [], wrongAnswersWordIds = [], hideHeader = false, hideActionButtons = false, unitNumber, vocabularyId, onRefreshVocabulary }: WordListScreenProps) {
  const [showMemoryGame, setShowMemoryGame] = useState(false);
  const [showGhostGame, setShowGhostGame] = useState(false);
  const {
    selectedWords: basketWords,
    count: basketCount,
    toggleWord: toggleBasketWord,
    clear: clearBasket,
    isSelected: isBasketSelected,
    removeWord: removeBasketWord,
  } = useWordBasket();
  const [showBasketModal, setShowBasketModal] = useState(false);
  const { getAuthToken } = useAuth();
  const [editingWordId, setEditingWordId] = useState<string | null>(null);
  const [editingMeaning, setEditingMeaning] = useState<string>('');
  logWordList('🎯 Received props:', {
    vocabularyWords: vocabularyWords?.length || 0,
    hideActionButtons,
    hideHeader,
    filterType
  });

  // 컴포넌트 마운트 시 스크롤 최상단으로 이동
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // 백그라운드 스크롤 방지
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    const originalOverflowY = window.getComputedStyle(document.body).overflowY;
    document.body.style.overflow = 'hidden';
    document.body.style.overflowY = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.overflowY = 'hidden';

    return () => {
      document.body.style.overflow = originalStyle;
      document.body.style.overflowY = originalOverflowY;
      document.documentElement.style.overflow = '';
      document.documentElement.style.overflowY = '';
    };
  }, []);

  // Use vocabularyWords if provided, otherwise empty array
  const baseWords = useMemo(() => {
    if (!vocabularyWords || vocabularyWords.length === 0) {
      return [];
    }

    logWordList('🔄 Converting words:', vocabularyWords.length);
    return vocabularyWords.map((word, index) => ({
      id: word.id || `word-${index}`,
      word: word.word || '',
      pronunciation: word.pronunciation || '',
      partOfSpeech: word.partOfSpeech || '',
      meaning: word.meaning || '',
      example: word.example_sentence || word.englishExample || word.example || '', // 서버 필드명 example_sentence 우선
      translation: word.translation || '', // 한글 번역
      story: word.etymology || word.story || '', // etymology 필드를 story로 매핑
      derivatives: Array.isArray(word.derivatives)
        ? word.derivatives.map((d: any) => ({ word: d.word || d, meaning: d.meaning || '' }))
        : typeof word.derivatives === 'string' && word.derivatives
        ? word.derivatives.split(',').map(d => {
            const trimmed = d.trim();
            // "word (meaning)" 형식 파싱
            const match = trimmed.match(/^(.+?)\s*\((.+?)\)\s*$/);
            if (match) {
              return { word: match[1].trim(), meaning: match[2].trim() };
            }
            return { word: trimmed, meaning: '' };
          })
        : [],
      synonyms: Array.isArray(word.synonyms)
        ? word.synonyms.map((s: any) => ({ word: s.word || s, meaning: s.meaning || '' }))
        : typeof word.synonyms === 'string' && word.synonyms
        ? word.synonyms.split(',').map(s => ({ word: s.trim(), meaning: '' }))
        : [],
      antonyms: Array.isArray(word.antonyms)
        ? word.antonyms.map((a: any) => ({ word: a.word || a, meaning: a.meaning || '' }))
        : typeof word.antonyms === 'string' && word.antonyms
        ? word.antonyms.split(',').map(a => ({ word: a.trim(), meaning: '' }))
        : [],
      isStarred: false,
      isMeaningRevealed: true,
      isExpanded: false,
      exampleLanguage: 'en', // 기본값 EN
      swipeX: 0,
      originalIndex: index + 1,
      graveyardAt: word.updated_at || word.updatedAt || undefined
    }));
  }, [vocabularyWords]);

  // 필터링된 단어 목록 생성
  const getFilteredWords = useCallback(() => {
    let filtered = baseWords;

    if (filterType === 'starred') {
      // 서버에서 이미 별표된 단어만 반환하므로, 추가 필터링 불필요
      // 단, baseWords가 비어있으면 로컬 ID 기반으로 필터링 시도
      if (baseWords.length === 0 && starredWordIds.length > 0) {
        filtered = [];
      } else {
        filtered = baseWords;
      }
    } else if (filterType === 'graveyard') {
      // 서버에서 이미 무덤 단어만 반환
      if (baseWords.length === 0 && graveyardWordIds.length > 0) {
        filtered = [];
      } else {
        filtered = baseWords;
      }
    } else if (filterType === 'wrong-answers') {
      // 서버에서 이미 오답 단어만 반환
      if (baseWords.length === 0 && wrongAnswersWordIds.length > 0) {
        filtered = [];
      } else {
        filtered = baseWords;
      }
    } else {
      // 일반 단어장: 무덤 단어는 제외하고 별표 상태 반영
      filtered = baseWords.filter(w => !graveyardWordIds.includes(w.id));
    }
    
    // 별표 상태 업데이트
    return filtered.map((w, idx) => ({
      ...w,
      isStarred: starredWordIds.includes(w.id),
      isMeaningRevealed: false,
      originalIndex: filterType === 'starred' || filterType === 'graveyard' ? idx + 1 : w.originalIndex
    }));
  }, [baseWords, filterType, graveyardWordIds, starredWordIds, wrongAnswersWordIds]);

  const [words, setWords] = useState<WordData[]>(() => getFilteredWords());
  const [hideAllMeanings, setHideAllMeanings] = useState(true);
  const [exampleLanguage, setExampleLanguage] = useState<'en' | 'kr'>('en'); // EN/KR 토글 상태
  const [showForgettingCurve, setShowForgettingCurve] = useState(false); // 망각 곡선 필터 펼침 상태
  const [selectedDaysAgo, setSelectedDaysAgo] = useState<number | null>(null); // 선택된 일수 (null = 전체)

  // Update words when vocabularyWords prop changes
  useEffect(() => {
    logWordList('🔄 vocabularyWords changed, updating words...');
    const newWords = getFilteredWords();
    logWordList('✅ New words count:', newWords.length);
    
    // 기존 단어의 상태를 보존하면서 업데이트
    setWords(prevWords => {
      return newWords.map(newWord => {
        // 기존 단어 찾기
        const existingWord = prevWords.find(w => w.id === newWord.id);
        // 기존 단어가 있으면 사용자 설정 보존
        if (existingWord) {
          return {
            ...newWord,
            isMeaningRevealed: existingWord.isMeaningRevealed,
            isExpanded: existingWord.isExpanded,
            exampleLanguage: existingWord.exampleLanguage,
            swipeX: 0 // swipe는 초기화
          };
        }
        
        // 새로운 단어는 그대로
        return newWord;
      });
    });
  }, [getFilteredWords]);

  const totalWords = words.length;
  const starredCount = words.filter(w => w.isStarred).length;

  // 예문에서 단어 하이라이트 함수
  const highlightWord = (text: string, targetWord: string) => {
    if (!text || !targetWord) return text;

    // 먼저 **단어** 마크다운 문법을 처리
    const markdownRegex = /\*\*([^*]+)\*\*/g;
    const segments: (string | { text: string; bold: boolean })[] = [];
    let lastIndex = 0;
    let match;

    while ((match = markdownRegex.exec(text)) !== null) {
      // 매칭 전 텍스트
      if (match.index > lastIndex) {
        segments.push(text.substring(lastIndex, match.index));
      }
      // 굵게 표시할 텍스트
      segments.push({ text: match[1], bold: true });
      lastIndex = match.index + match[0].length;
    }
    // 남은 텍스트
    if (lastIndex < text.length) {
      segments.push(text.substring(lastIndex));
    }

    // segments가 비어있으면 원본 텍스트 사용
    if (segments.length === 0) {
      segments.push(text);
    }

    // 각 segment에서 targetWord를 추가로 하이라이트
    return segments.map((segment, segIndex) => {
      if (typeof segment === 'string') {
        // 일반 텍스트: targetWord 하이라이트
        const regex = new RegExp(`\\b(${targetWord})\\b`, 'gi');
        const parts = segment.split(regex);
        return parts.map((part, index) => {
          if (part.toLowerCase() === targetWord.toLowerCase()) {
            return (
              <span key={`${segIndex}-${index}`} style={{ color: '#491B6D', fontWeight: 700 }}>
                {part}
              </span>
            );
          }
          return <span key={`${segIndex}-${index}`}>{part}</span>;
        });
      } else {
        // 마크다운으로 굵게 표시된 텍스트
        return (
          <span key={`${segIndex}-bold`} style={{ color: '#491B6D', fontWeight: 700 }}>
            {segment.text}
          </span>
        );
      }
    });
  };

  const toggleWordStar = (id: string) => {
    setWords(words.map(w => {
      if (w.id === id) {
        const newStarred = !w.isStarred;
        if (onAddToStarred) {
          onAddToStarred(id);
        }
        return { ...w, isStarred: newStarred };
      }
      return w;
    }));
  };

  const toggleStar = (id: string) => {
    toggleWordStar(id);
  };

  const handleTTS = (text: string) => {
    if ('speechSynthesis' in window) {
      // Stop any ongoing speech
      window.speechSynthesis.cancel();

      // Speak English 2 times
      for (let i = 0; i < 2; i++) {
        const utteranceEn = new SpeechSynthesisUtterance(text);
        utteranceEn.lang = 'en-US';
        utteranceEn.rate = 0.8;
        window.speechSynthesis.speak(utteranceEn);
      }

      // Speak Korean meaning 1 time
      const word = words.find(w => w.word === text);
      if (word) {
        const utteranceKo = new SpeechSynthesisUtterance(word.meaning);
        utteranceKo.lang = 'ko-KR';
        utteranceKo.rate = 0.9;
        window.speechSynthesis.speak(utteranceKo);
      }
    }
  };

  const handleSwipeToGraveyard = (id: string) => {
    if (onMoveToGraveyard) {
      onMoveToGraveyard(id);
    }
    setWords(words.filter(w => w.id !== id));
  };

  const handleDeletePermanently = (id: string) => {
    if (onDeletePermanently) {
      onDeletePermanently(id);
    }
    setWords(words.filter(w => w.id !== id));
  };

  const toggleWordExpansion = (id: string) => {
    setWords(words.map(w => 
      w.id === id ? { ...w, isExpanded: !w.isExpanded } : w
    ));
  };

  const toggleMeaningReveal = (id: string) => {
    setWords(words.map(w => 
      w.id === id ? { ...w, isMeaningRevealed: !w.isMeaningRevealed } : w
    ));
  };

  const toggleHideAllMeanings = () => {
    const newHideAll = !hideAllMeanings;
    setHideAllMeanings(newHideAll);
    setWords(words.map(w => ({ ...w, isMeaningRevealed: !newHideAll })));
  };

  // 망각 곡선 필터: 특정 일수 전에 무덤에 추가된 단어만 필터링
  const filterByDaysAgo = (daysAgo: number | null) => {
    setSelectedDaysAgo(daysAgo);

    if (daysAgo === null) {
      // 전체 보기
      setWords(getFilteredWords());
    } else {
      // 특정 일수 전 단어만 필터링
      const now = new Date();
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() - daysAgo);
      targetDate.setHours(0, 0, 0, 0);

      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);

      const filtered = getFilteredWords().filter(word => {
        // graveyard_at 우선, 없으면 updated_at 또는 created_at 사용
        const dateStr = word.graveyardAt || (word as any).graveyard_at || (word as any).updated_at || (word as any).created_at;
        if (!dateStr) return false;
        const wordDate = new Date(dateStr);
        return wordDate >= targetDate && wordDate < nextDay;
      });

      setWords(filtered);
    }
  };

  const revealAllMeanings = () => {
    setHideAllMeanings(false);
    setWords(words.map(w => ({ ...w, isMeaningRevealed: true })));
  };

  const expandAll = () => {
    setWords(words.map(w => ({ ...w, isExpanded: true })));
  };

  const collapseAll = () => {
    setWords(words.map(w => ({ ...w, isExpanded: false })));
  };

  // 개별 단어의 예문 언어 토글
  const toggleWordExampleLanguage = (id: string) => {
    setWords(words.map(w => 
      w.id === id ? { ...w, exampleLanguage: w.exampleLanguage === 'en' ? 'kr' : 'en' } : w
    ));
  };

  // 모든 단어의 예문 언어 일괄 변경
  const toggleAllExampleLanguage = () => {
    const newLanguage = exampleLanguage === 'en' ? 'kr' : 'en';
    setExampleLanguage(newLanguage);
    setWords(words.map(w => ({ ...w, exampleLanguage: newLanguage })));
  };

  // 랜덤 섞기 함수
  const shuffleWords = () => {
    const shuffled = [...words].sort(() => Math.random() - 0.5);
    setWords(shuffled);
    toast.success('단어 순서가 섞였습니다!', {
      duration: 2000,
    });
  };

  // API: Update word meaning
  const updateWordMeaning = async (wordId: string, newMeaning: string) => {
    if (!vocabularyId) {
      toast.error('단어장 정보를 찾을 수 없습니다.');
      return false;
    }

    const token = getAuthToken();
    if (!token) {
      toast.error('로그인이 필요합니다.');
      return false;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/user-vocabulary/${vocabularyId}/word/${wordId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ meaning: newMeaning }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update word meaning');
      }

      return true;
    } catch (error) {
      console.error('Error updating word meaning:', error);
      return false;
    }
  };

  // Start editing a word meaning
  const startEditingMeaning = (wordId: string, currentMeaning: string) => {
    setEditingWordId(wordId);
    setEditingMeaning(currentMeaning);
  };

  // Cancel editing
  const cancelEditingMeaning = () => {
    setEditingWordId(null);
    setEditingMeaning('');
  };

  // Save edited meaning
  const saveEditedMeaning = async (wordId: string) => {
    if (!editingMeaning.trim()) {
      toast.error('뜻을 입력해주세요.');
      return;
    }

    const success = await updateWordMeaning(wordId, editingMeaning.trim());

    if (success) {
      // Update local state
      setWords(words.map(w =>
        w.id === wordId ? { ...w, meaning: editingMeaning.trim() } : w
      ));
      setEditingWordId(null);
      setEditingMeaning('');
      toast.success('뜻이 수정되었습니다!');
    } else {
      toast.error('뜻 수정에 실패했습니다.');
    }
  };

  const buildBasketWord = (
    word: WordData,
    relationType: RelationType,
    entry: { word: string; meaning: string },
    index: number
  ): BasketWord => {
    return {
      id: `${word.id}-${relationType}-${index}`,
      word: String(entry.word || '').trim(),
      meaning: entry.meaning || '',
      source: `${RELATION_LABELS[relationType]} • ${word.word}`,
      metadata: {
        relationType,
        baseWordId: word.id,
        baseWord: word.word,
        baseMeaning: word.meaning,
        translation: word.translation,
        partOfSpeech: word.partOfSpeech,
      },
    };
  };

  const handleRelatedWordToggle = (basketWord: BasketWord) => {
    if (!basketWord.word) {
      toast.error('단어 정보가 올바르지 않습니다.');
      return;
    }

    const alreadySelected = isBasketSelected(basketWord.id);
    if (!alreadySelected && basketCount >= WORD_CART_LIMIT) {
      toast.error(`한 번에 ${WORD_CART_LIMIT}개까지만 선택할 수 있어요.`);
      return;
    }
    toggleBasketWord(basketWord);
    toast[alreadySelected ? 'info' : 'success'](
      alreadySelected ? '장바구니에서 제거했어요.' : '장바구니에 추가했어요.',
      { duration: 1500 }
    );
  };

  const renderRelatedWordButton = (
    word: WordData,
    relationType: RelationType,
    entry: { word: string; meaning: string },
    index: number
  ) => {
    const basketWord = buildBasketWord(word, relationType, entry, index);
    const selected = isBasketSelected(basketWord.id);

    return (
      <button
        key={`${basketWord.id}`}
        onClick={(e) => {
          e.stopPropagation();
          handleRelatedWordToggle(basketWord);
        }}
        aria-pressed={selected}
        className={`rounded-lg border px-2 py-1 transition-all text-left ${
          selected
            ? 'bg-[#F8F5FF] border-[#DCCEF8] text-[#5B21B6] shadow-sm'
            : 'bg-white/80 border-gray-200/80 text-gray-700 hover:border-[#D8B4FE]'
        }`}
      >
        <div className="min-w-0 flex items-center gap-1">
          <p className="text-[11px] font-semibold leading-tight">{entry.word}</p>
          {entry.meaning && (
            <p className="text-[10px] text-gray-500 leading-tight truncate">{entry.meaning}</p>
          )}
        </div>
        <div
          className={`hidden ${
            selected ? 'bg-[#5B21B6] border-[#5B21B6] text-white' : 'border-gray-300 text-gray-400'
          }`}
        >
          <ShoppingCart className="w-3.5 h-3.5" />
        </div>
      </button>
    );
  };

  const handleBasketButtonClick = () => {
    if (basketCount === 0) {
      toast.info('먼저 단어를 선택해 장바구니에 담아주세요.');
      return;
    }
    setShowBasketModal(true);
  };

  // Theme configurations based on filterType
  const getTheme = () => {
    switch (filterType) {
      case 'starred':
        return {
          bgGradient: 'from-[#FFFEF5] via-[#FFFEF8] to-[#FFFFF9]',
          headerBg: 'from-[#FFFBEB]/80 to-[#FEF3C7]/70',
          cardBg: 'linear-gradient(135deg, rgba(255, 251, 235, 0.7) 0%, rgba(254, 249, 230, 0.65) 100%)',
          cardBorder: 'border-amber-100/30',
          numberBadgeBg: 'from-[#FCD34D] to-[#F59E0B]',
          accentColor: '#F59E0B',
          textColor: '#78350F',
          buttonBg: '#F59E0B',
          buttonText: 'text-white',
          headerTextColor: '#78350F',
          secondaryTextColor: '#D97706',
          cardTextColor: '#78350F',
          iconColor: '#F59E0B',
          badgeColor: '#F59E0B',
          name: '⭐ Starred Words'
        };
      case 'graveyard':
        return {
          bgGradient: 'from-[#FCFCFC] via-[#FAFAFA] to-[#F9F9F9]',
          headerBg: 'from-[#F9FAFB]/80 to-[#F3F4F6]/70',
          cardBg: 'linear-gradient(135deg, rgba(249, 250, 251, 0.7) 0%, rgba(243, 244, 246, 0.65) 100%)',
          cardBorder: 'border-gray-200/30',
          numberBadgeBg: 'from-[#6B7280] to-[#4B5563]',
          accentColor: '#6B7280',
          textColor: '#374151',
          buttonBg: '#6B7280',
          buttonText: 'text-white',
          headerTextColor: '#374151',
          secondaryTextColor: '#6B7280',
          cardTextColor: '#374151',
          iconColor: '#6B7280',
          badgeColor: '#6B7280',
          name: '💀 Graveyard'
        };
      case 'wrong-answers':
        return {
          bgGradient: 'from-[#FFFAFA] via-[#FFFCFC] to-[#FFF9F9]',
          headerBg: 'from-[#FEF2F2]/80 to-[#FEE2E2]/70',
          cardBg: 'linear-gradient(135deg, rgba(254, 242, 242, 0.7) 0%, rgba(254, 226, 226, 0.65) 100%)',
          cardBorder: 'border-red-100/30',
          numberBadgeBg: 'from-[#EF4444] to-[#DC2626]',
          accentColor: '#DC2626',
          textColor: '#7F1D1D',
          buttonBg: '#DC2626',
          buttonText: 'text-white',
          headerTextColor: '#7F1D1D',
          secondaryTextColor: '#DC2626',
          cardTextColor: '#7F1D1D',
          iconColor: '#DC2626',
          badgeColor: '#DC2626',
          name: '❌ Wrong Answers'
        };
      default:
        return {
          bgGradient: 'from-[#F5F3FF] via-[#EDE9FE] to-[#E9E5FF]',
          headerBg: 'from-[#F5F3FF]/80 to-[#EDE9FE]/70',
          cardBg: 'rgba(255, 255, 255, 0.7)',
          cardBorder: 'border-purple-100/30',
          numberBadgeBg: 'from-[#C4B5FD] to-[#A78BFA]',
          accentColor: '#8B5CF6',
          textColor: '#491B6D',
          buttonBg: '#491B6D',
          buttonText: 'text-white',
          name: vocabularyTitle
        };
    }
  };

  const theme = getTheme();

  return (
    <div className="h-screen flex flex-col bg-transparent">
      {/* Header */}
      {!hideHeader && (
      <div className="sticky top-0 z-40 backdrop-blur-lg border-b border-white/20" style={{ background: 'transparent' }}>
        <div className="flex items-center justify-between p-6">
          <BackButton onClick={onBack} />

          <div className="flex-1 mx-4 text-center">
            <h1 style={{ fontSize: '18px', fontWeight: 700, color: theme.headerTextColor || '#5B21B6' }}>
              {theme.name}
            </h1>
            <p style={{ fontSize: '12px', fontWeight: 500, color: theme.secondaryTextColor || '#A78BFA' }}>
              {unitName} · {totalWords}개의 단어
            </p>
          </div>

          {/* Home Button */}
          {onBackToHome && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onBackToHome}
              className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md"
            >
              <Home className="w-5 h-5" style={{ color: theme.headerTextColor || '#5B21B6' }} />
            </motion.button>
          )}
          {!onBackToHome && <div className="w-10" />}
        </div>

        {/* Action Buttons */}
        <div className="px-4 pb-3 bg-transparent">
          <div className="flex items-center justify-center gap-1.5 overflow-x-auto scrollbar-hide m-[0px] p-[3px]">
            {/* Shuffle Button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={shuffleWords}
              className="px-2.5 py-1.5 bg-white/90 backdrop-blur-lg rounded-lg border border-white/40 shadow-sm flex items-center gap-1 whitespace-nowrap"
            >
              <Shuffle className="w-3 h-3" style={{ color: theme.iconColor || '#8B5CF6' }} />
              <span style={{ fontSize: '11px', fontWeight: 600, color: theme.cardTextColor || '#091A7A' }}>
                섞기
              </span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={toggleHideAllMeanings}
              className="px-2.5 py-1.5 bg-white/90 backdrop-blur-lg rounded-lg border border-white/40 shadow-sm flex items-center gap-1 whitespace-nowrap"
            >
              {hideAllMeanings ? (
                <Eye className="w-3 h-3" style={{ color: theme.iconColor || '#8B5CF6' }} />
              ) : (
                <EyeOff className="w-3 h-3" style={{ color: theme.iconColor || '#8B5CF6' }} />
              )}
              <span style={{ fontSize: '11px', fontWeight: 600, color: theme.cardTextColor || '#091A7A' }}>
                {hideAllMeanings ? '보기' : '가리기'}
              </span>
            </motion.button>

            {/* Hide expand/collapse and EN|KR for graveyard and wrong-answers */}
            {filterType !== 'graveyard' && filterType !== 'wrong-answers' && (
              <>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={words.every(w => w.isExpanded) ? collapseAll : expandAll}
                  className="px-2.5 py-1.5 bg-white/90 backdrop-blur-lg rounded-lg border border-white/40 shadow-sm flex items-center gap-1 whitespace-nowrap"
                >
                  <ChevronDown className={`w-3 h-3 transition-transform ${words.every(w => w.isExpanded) ? 'rotate-180' : ''}`} style={{ color: theme.iconColor || '#8B5CF6' }} />
                  <span style={{ fontSize: '11px', fontWeight: 600, color: theme.cardTextColor || '#091A7A' }}>
                    {words.every(w => w.isExpanded) ? '접기' : '펼치기'}
                  </span>
                </motion.button>

                {/* EN/KR Toggle */}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={toggleAllExampleLanguage}
                  className="px-2.5 py-1.5 bg-white/90 backdrop-blur-lg rounded-lg border border-white/40 shadow-sm flex items-center gap-1 whitespace-nowrap"
                >
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      color: exampleLanguage === 'en' ? '#491B6D' : '#9CA3AF'
                    }}
                  >
                    EN
                  </span>
                  <span style={{ fontSize: '10px', fontWeight: 600, color: '#9CA3AF' }}>|</span>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      color: exampleLanguage === 'kr' ? '#491B6D' : '#9CA3AF'
                    }}
                  >
                    KR
                  </span>
                </motion.button>

                {/* Cart Button */}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleBasketButtonClick}
                  className={`px-2.5 py-1.5 backdrop-blur-lg rounded-lg border shadow-sm flex items-center gap-1 whitespace-nowrap ${
                    basketCount > 0
                      ? 'bg-[#5B21B6] text-white border-[#5B21B6]'
                      : 'bg-white/90 text-[#5B21B6] border-white/40'
                  }`}
                >
                  <ShoppingCart className="w-3 h-3" />
                  <span style={{ fontSize: '11px', fontWeight: 600 }}>
                    추가
                  </span>
                  {basketCount > 0 && (
                    <span style={{ fontSize: '9px', fontWeight: 700 }} className="bg-white/20 px-1.5 py-0.5 rounded-full">
                      {basketCount}
                    </span>
                  )}
                </motion.button>
              </>
            )}

            {/* Ghost Game Button - Only for graveyard */}
            {filterType === 'graveyard' && words.length > 0 && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowGhostGame(true)}
                className="px-3 py-2 bg-gradient-to-r from-gray-700 to-gray-800 backdrop-blur-lg rounded-xl border border-gray-600 shadow-sm flex items-center gap-1.5 whitespace-nowrap"
              >
                <span style={{ fontSize: '14px' }}>👻</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#E5E7EB' }}>
                  유령 퇴치
                </span>
              </motion.button>
            )}

            {/* Memory Match Game Button - Only for wrong-answers */}
            {filterType === 'wrong-answers' && words.length > 0 && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowMemoryGame(true)}
                className="px-3 py-2 bg-gradient-to-r from-red-600 to-red-700 backdrop-blur-lg rounded-xl border border-red-500 shadow-sm flex items-center gap-1.5 whitespace-nowrap"
              >
                <span style={{ fontSize: '14px' }}>🃏</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#FEE2E2' }}>
                  오답 탈출
                </span>
              </motion.button>
            )}

            {/* Forgetting Curve Filter - Only for graveyard */}
            {filterType === 'graveyard' && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowForgettingCurve(!showForgettingCurve)}
                className={`px-3 py-2 backdrop-blur-lg rounded-xl border shadow-sm flex items-center gap-1.5 whitespace-nowrap ${
                  showForgettingCurve ? 'bg-gray-700/90 border-gray-600' : 'bg-white/90 border-white/40'
                }`}
              >
                <span style={{ fontSize: '12px' }}>📉</span>
                <span style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: showForgettingCurve ? '#E5E7EB' : (theme.cardTextColor || '#091A7A')
                }}>
                  망각 곡선
                </span>
              </motion.button>
            )}

          </div>

          {/* Forgetting Curve Day Buttons */}
          {filterType === 'graveyard' && showForgettingCurve && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="flex items-center justify-center gap-1 mt-2 flex-wrap"
            >
              <button
                onClick={() => filterByDaysAgo(null)}
                className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                  selectedDaysAgo === null
                    ? 'bg-gray-700 text-white'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
              >
                전체
              </button>
              {[1, 2, 3, 7, 14, 30].map(days => (
                <button
                  key={days}
                  onClick={() => filterByDaysAgo(days)}
                  className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                    selectedDaysAgo === days
                      ? 'bg-gray-700 text-white'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  {days}일전
                </button>
              ))}
            </motion.div>
          )}
        </div>
      </div>
      )}

      <div className="flex-1 min-h-0 flex flex-col">

      {/* Action Buttons - Only show when header is hidden */}
      {hideHeader && (
        <div className="sticky top-0 z-40 border-b border-white/20 bg-transparent px-[10px] py-[6px]">
          <div className="flex items-center justify-center gap-1.5 overflow-x-auto scrollbar-hide m-[0px] p-[3px]">
            {/* Shuffle Button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={shuffleWords}
              className="px-2.5 py-1.5 bg-white/90 backdrop-blur-lg rounded-lg border border-white/40 shadow-sm flex items-center gap-1 whitespace-nowrap"
            >
              <Shuffle className="w-3 h-3" style={{ color: theme.iconColor || '#8B5CF6' }} />
              <span style={{ fontSize: '11px', fontWeight: 600, color: theme.cardTextColor || '#091A7A' }}>
                섞기
              </span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={toggleHideAllMeanings}
              className="px-2.5 py-1.5 bg-white/90 backdrop-blur-lg rounded-lg border border-white/40 shadow-sm flex items-center gap-1 whitespace-nowrap"
            >
              {hideAllMeanings ? (
                <Eye className="w-3 h-3" style={{ color: theme.iconColor || '#8B5CF6' }} />
              ) : (
                <EyeOff className="w-3 h-3" style={{ color: theme.iconColor || '#8B5CF6' }} />
              )}
              <span style={{ fontSize: '11px', fontWeight: 600, color: theme.cardTextColor || '#091A7A' }}>
                {hideAllMeanings ? '보기' : '가리기'}
              </span>
            </motion.button>

            {/* Hide expand/collapse and EN|KR for graveyard and wrong-answers */}
            {filterType !== 'graveyard' && filterType !== 'wrong-answers' && (
              <>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={words.every(w => w.isExpanded) ? collapseAll : expandAll}
                  className="px-2.5 py-1.5 bg-white/90 backdrop-blur-lg rounded-lg border border-white/40 shadow-sm flex items-center gap-1 whitespace-nowrap"
                >
                  <ChevronDown className={`w-3 h-3 transition-transform ${words.every(w => w.isExpanded) ? 'rotate-180' : ''}`} style={{ color: theme.iconColor || '#8B5CF6' }} />
                  <span style={{ fontSize: '11px', fontWeight: 600, color: theme.cardTextColor || '#091A7A' }}>
                    {words.every(w => w.isExpanded) ? '접기' : '펼치기'}
                  </span>
                </motion.button>

                {/* EN/KR Toggle */}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={toggleAllExampleLanguage}
                  className="px-2.5 py-1.5 bg-white/90 backdrop-blur-lg rounded-lg border border-white/40 shadow-sm flex items-center gap-1 whitespace-nowrap"
                >
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      color: exampleLanguage === 'en' ? '#491B6D' : '#9CA3AF'
                    }}
                  >
                    EN
                  </span>
                  <span style={{ fontSize: '10px', fontWeight: 600, color: '#9CA3AF' }}>|</span>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      color: exampleLanguage === 'kr' ? '#491B6D' : '#9CA3AF'
                    }}
                  >
                    KR
                  </span>
                </motion.button>

                {/* Cart Button */}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleBasketButtonClick}
                  className={`px-2.5 py-1.5 backdrop-blur-lg rounded-lg border shadow-sm flex items-center gap-1 whitespace-nowrap ${
                    basketCount > 0
                      ? 'bg-[#5B21B6] text-white border-[#5B21B6]'
                      : 'bg-white/90 text-[#5B21B6] border-white/40'
                  }`}
                >
                  <ShoppingCart className="w-3 h-3" />
                  <span style={{ fontSize: '11px', fontWeight: 600 }}>
                    추가
                  </span>
                  {basketCount > 0 && (
                    <span style={{ fontSize: '9px', fontWeight: 700 }} className="bg-white/20 px-1.5 py-0.5 rounded-full">
                      {basketCount}
                    </span>
                  )}
                </motion.button>
              </>
            )}

            {/* Ghost Game Button - Only for graveyard */}
            {filterType === 'graveyard' && words.length > 0 && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowGhostGame(true)}
                className="px-3 py-2 bg-gradient-to-r from-gray-700 to-gray-800 backdrop-blur-lg rounded-xl border border-gray-600 shadow-sm flex items-center gap-1.5 whitespace-nowrap"
              >
                <span style={{ fontSize: '14px' }}>👻</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#E5E7EB' }}>
                  유령 퇴치
                </span>
              </motion.button>
            )}

            {/* Memory Match Game Button - Only for wrong-answers */}
            {filterType === 'wrong-answers' && words.length > 0 && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowMemoryGame(true)}
                className="px-3 py-2 bg-gradient-to-r from-red-600 to-red-700 backdrop-blur-lg rounded-xl border border-red-500 shadow-sm flex items-center gap-1.5 whitespace-nowrap"
              >
                <span style={{ fontSize: '14px' }}>🃏</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#FEE2E2' }}>
                  오답 탈출
                </span>
              </motion.button>
            )}

            {/* Forgetting Curve Filter - Only for graveyard */}
            {filterType === 'graveyard' && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowForgettingCurve(!showForgettingCurve)}
                className={`px-3 py-2 backdrop-blur-lg rounded-xl border shadow-sm flex items-center gap-1.5 whitespace-nowrap ${
                  showForgettingCurve ? 'bg-gray-700/90 border-gray-600' : 'bg-white/90 border-white/40'
                }`}
              >
                <span style={{ fontSize: '12px' }}>📉</span>
                <span style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: showForgettingCurve ? '#E5E7EB' : (theme.cardTextColor || '#091A7A')
                }}>
                  망각 곡선
                </span>
              </motion.button>
            )}

          </div>

          {/* Forgetting Curve Day Buttons */}
          {filterType === 'graveyard' && showForgettingCurve && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="flex items-center justify-center gap-1 mt-2 flex-wrap"
            >
              <button
                onClick={() => filterByDaysAgo(null)}
                className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                  selectedDaysAgo === null
                    ? 'bg-gray-700 text-white'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
              >
                전체
              </button>
              {[1, 2, 3, 7, 14, 30].map(days => (
                <button
                  key={days}
                  onClick={() => filterByDaysAgo(days)}
                  className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                    selectedDaysAgo === days
                      ? 'bg-gray-700 text-white'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  {days}일전
                </button>
              ))}
            </motion.div>
          )}
        </div>
      )}

      {/* Word Cards */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-64" style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div className="space-y-3 pt-4">
          <AnimatePresence mode="popLayout">
            {words.map((word, index) => (
              <motion.div 
                key={word.id} 
                className="relative"
                layout
                exit={{ 
                  opacity: 0, 
                  x: -200, 
                  transition: { duration: 0.2, ease: 'easeOut' }
                }}
              >
                {/* Swipe Background - Different per theme */}
                {filterType !== 'graveyard' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-[#6B7280] to-[#4B5563] rounded-2xl flex items-center justify-end px-6">
                    <div className="flex items-center gap-2">
                      <Skull className="w-4 h-4 text-white/80" />
                      <div className="text-white" style={{ fontSize: '12px', fontWeight: 600 }}>
                        무덤으로 이동
                      </div>
                    </div>
                  </div>
                )}                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0, x: word.swipeX }}
                  transition={{ delay: Math.min(index * 0.02, 0.3), duration: 0.2 }}
                  drag={filterType !== 'graveyard' ? "x" : false}
                  dragConstraints={{ left: -150, right: 0 }}
                  dragElastic={0}
                  dragDirectionLock
                  onDirectionLock={(axis) => {
                    // If user is scrolling vertically, don't allow horizontal drag
                    if (axis === 'y') {
                      return;
                    }
                  }}
                  onDragEnd={(e, info) => {
                    if (filterType !== 'graveyard' && info.offset.x < -100) {
                      handleSwipeToGraveyard(word.id);
                    } else {
                      setWords(words.map(w =>
                        w.id === word.id ? { ...w, swipeX: 0 } : w
                      ));
                    }
                  }}
                  onDrag={(e, info) => {
                    if (filterType !== 'graveyard') {
                      setWords(words.map(w =>
                        w.id === word.id ? { ...w, swipeX: Math.min(0, info.offset.x) } : w
                      ));
                    }
                  }}
                  className={`backdrop-blur-xl rounded-2xl overflow-hidden border ${theme.cardBorder} relative z-10`}
                  style={{
                    background: filterType === 'graveyard' 
                      ? 'linear-gradient(135deg, rgba(55, 65, 81, 0.95) 0%, rgba(75, 85, 99, 0.9) 100%)'
                      : filterType === 'starred'
                      ? 'linear-gradient(135deg, rgba(254, 249, 195, 0.95) 0%, rgba(254, 243, 199, 0.9) 100%)'
                      : filterType === 'wrong-answers'
                      ? 'linear-gradient(135deg, rgba(254, 226, 226, 0.95) 0%, rgba(254, 202, 202, 0.9) 100%)'
                      : 'rgba(255, 255, 255, 0.95)',
                    boxShadow: '0 2px 8px 0 rgba(0, 0, 0, 0.08)'
                  }}
                >
                  {/* GRAVEYARD or WRONG-ANSWERS - Simple word + meaning only */}
                  {(filterType === 'graveyard' || filterType === 'wrong-answers') ? (
                    <div className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-baseline gap-2 mb-1">
                            <h3 style={{
                              fontSize: '18px',
                              fontWeight: 700,
                              color: filterType === 'graveyard' ? '#D1D5DB' : '#7F1D1D'
                            }}>
                              {word.word}
                            </h3>
                            <span style={{
                              fontSize: '13px',
                              fontWeight: 500,
                              color: filterType === 'graveyard' ? '#9CA3AF' : '#DC2626'
                            }}>
                              {word.pronunciation}
                            </span>
                          </div>
                          <p
                            onClick={() => toggleMeaningReveal(word.id)}
                            style={{
                              fontSize: '14px',
                              fontWeight: 500,
                              color: filterType === 'graveyard' ? '#A1A1AA' : '#991B1B',
                              lineHeight: 1.4,
                              filter: word.isMeaningRevealed ? 'none' : 'blur(8px)',
                              cursor: 'pointer',
                              transition: 'filter 0.3s ease'
                            }}
                          >
                            {word.meaning}
                          </p>
                        </div>

                        {/* Right side: Date + Delete Button */}
                        <div className="flex flex-col items-end gap-1.5">
                          {/* Graveyard Date */}
                          {filterType === 'graveyard' && word.graveyardAt && (
                            <span style={{
                              fontSize: '10px',
                              fontWeight: 500,
                              color: '#9CA3AF',
                              whiteSpace: 'nowrap'
                            }}>
                              {new Date(word.graveyardAt).toLocaleDateString('ko-KR', {
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          )}
                          {/* Delete Button */}
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleDeletePermanently(word.id)}
                            className={`flex-shrink-0 w-10 h-10 rounded-lg border flex items-center justify-center shadow-lg ${
                              filterType === 'graveyard'
                                ? 'bg-gradient-to-br from-gray-700 to-gray-800 border-gray-600'
                                : 'bg-gradient-to-br from-red-600 to-red-700 border-red-500'
                            }`}
                          >
                            <span className="text-xl">{filterType === 'graveyard' ? '🪦' : '🗑️'}</span>
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* NORMAL / STARRED - Full card */
                    <>
                      {/* Card Header - Always Visible */}
                      <div 
                        className="cursor-pointer px-[12px] py-[16px] p-[12px]"
                        onClick={() => toggleWordExpansion(word.id)}
                      >
                        <div className="space-y-2">
                          {/* 첫 번째 줄: 번호 + 단어 + 발음 + 품사 + TTS + 별 */}
                          <div className="flex items-center gap-2.5">
                            {/* Number Badge - 더 작게 */}
                            <div 
                              className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" 
                              style={{ backgroundColor: '#491B6D' }}
                            >
                              <span className="text-white" style={{ fontSize: '11px', fontWeight: 700 }}>
                                {word.originalIndex}
                              </span>
                            </div>

                            {/* 단어 + 발음 + 품사 + TTS */}
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <h3 className="text-gray-900" style={{ fontSize: '16px', fontWeight: 600 }}>
                                {word.word}
                              </h3>
                              <span className="text-gray-500" style={{ fontSize: '12px', fontWeight: 500 }}>
                                {word.pronunciation}
                              </span>
                              {word.partOfSpeech && (
                                <span
                                  className="px-1.5 py-0.5 rounded"
                                  style={{
                                    fontSize: '10px',
                                    fontWeight: 600,
                                    color: '#491B6D',
                                    backgroundColor: 'rgba(73, 27, 109, 0.08)',
                                    border: '1px solid rgba(73, 27, 109, 0.15)'
                                  }}
                                >
                                  {word.partOfSpeech}
                                </span>
                              )}
                              <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTTS(word.word);
                                }}
                                className="flex-shrink-0"
                              >
                                <Volume2 
                                  className="w-4 h-4" 
                                  style={{ color: '#491B6D', opacity: 0.6 }} 
                                />
                              </motion.button>
                            </div>

                            {/* Star Button */}
                            <motion.button
                              whileTap={{ scale: 0.9 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleStar(word.id);
                              }}
                              className="flex-shrink-0 p-1"
                            >
                              <Star 
                                className="w-4 h-4" 
                                style={{ 
                                  color: word.isStarred ? '#F59E0B' : '#491B6D',
                                  fill: word.isStarred ? '#F59E0B' : 'transparent',
                                  opacity: word.isStarred ? 1 : 0.3
                                }} 
                              />
                            </motion.button>
                          </div>

                          {/* 두 번째 줄: 눈 아이콘 + 뜻 + 편집 + 토글 */}
                          <div className="flex items-center gap-2.5">
                            <div className="w-6 flex-shrink-0" /> {/* 번호 자리 빈 공간 */}

                            {editingWordId === word.id ? (
                              // Editing mode: input field + save/cancel buttons
                              <>
                                <input
                                  type="text"
                                  value={editingMeaning}
                                  onChange={(e) => setEditingMeaning(e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  onKeyDown={(e) => {
                                    e.stopPropagation();
                                    if (e.key === 'Enter') {
                                      saveEditedMeaning(word.id);
                                    } else if (e.key === 'Escape') {
                                      cancelEditingMeaning();
                                    }
                                  }}
                                  className="flex-1 px-2 py-1 text-sm border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                  style={{ fontSize: '13px', fontWeight: 500, color: '#6B7280' }}
                                  autoFocus
                                />
                                <motion.button
                                  whileTap={{ scale: 0.9 }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    saveEditedMeaning(word.id);
                                  }}
                                  className="flex-shrink-0 p-1.5 bg-green-500 rounded-lg hover:bg-green-600"
                                >
                                  <Check className="w-3.5 h-3.5 text-white" />
                                </motion.button>
                                <motion.button
                                  whileTap={{ scale: 0.9 }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    cancelEditingMeaning();
                                  }}
                                  className="flex-shrink-0 p-1.5 bg-gray-400 rounded-lg hover:bg-gray-500"
                                >
                                  <X className="w-3.5 h-3.5 text-white" />
                                </motion.button>
                              </>
                            ) : (
                              // Normal mode: eye icon + meaning + edit button
                              <>
                                <div
                                  className="flex items-center gap-1.5 flex-1 min-w-0 cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleMeaningReveal(word.id);
                                  }}
                                >
                                  <Eye className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#9CA3AF' }} />
                                  <p
                                    className="text-gray-600 transition-all duration-200"
                                    style={{
                                      fontSize: '13px',
                                      fontWeight: 500,
                                      color: '#6B7280',
                                      lineHeight: 1.4,
                                      filter: word.isMeaningRevealed ? 'blur(0px)' : 'blur(4px)',
                                      userSelect: word.isMeaningRevealed ? 'auto' : 'none'
                                    }}
                                  >
                                    {word.meaning}
                                  </p>
                                </div>

                                {/* Edit Button - Only show for normal/starred views with vocabularyId */}
                                {vocabularyId && filterType !== 'graveyard' && filterType !== 'wrong-answers' && (
                                  <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      startEditingMeaning(word.id, word.meaning);
                                    }}
                                    className="flex-shrink-0 p-1"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" style={{ color: '#491B6D', opacity: 0.4 }} />
                                  </motion.button>
                                )}

                                {/* Expand/Collapse Toggle */}
                                <motion.div
                                  animate={{ rotate: word.isExpanded ? 180 : 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="flex-shrink-0 p-1"
                                >
                                  <ChevronDown className="w-4 h-4" style={{ color: '#491B6D', opacity: 0.3 }} />
                                </motion.div>
                              </>
                            )}
                          </div>

                          {/* 세 번째 줄: 영어 예문 (항상 표시) */}
                          {(word.example || word.translation) && (
                            <div className="flex gap-2.5">
                              {/* EN/KR Toggle 버튼 */}
                              <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleWordExampleLanguage(word.id);
                                }}
                                className="w-6 h-6 flex-shrink-0 rounded-md bg-white/90 border border-[#E5E7EB]/60 flex items-center justify-center shadow-sm"
                              >
                                <span 
                                  style={{ 
                                    fontSize: '8px', 
                                    fontWeight: 700,
                                    color: word.exampleLanguage === 'en' ? '#491B6D' : '#9CA3AF'
                                  }}
                                >
                                  {word.exampleLanguage === 'en' ? 'EN' : 'KR'}
                                </span>
                              </motion.button>
                              
                              <div className="flex-1 bg-[#F3F4F6]/60 border border-[#E5E7EB]/40 rounded-lg px-3 py-2">
                                <p className="text-[#4B5563]" style={{ fontSize: '13px', fontWeight: 500, lineHeight: 1.5 }}>
                                  {word.exampleLanguage === 'en'
                                    ? highlightWord(word.example, word.word)
                                    : highlightWord(word.translation, word.word)
                                  }
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Expanded Details */}
                      <AnimatePresence>
                        {word.isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 space-y-2 pt-1">
                              {/* Story - 어원 이야기 */}
                              {word.story && (
                                <div className="bg-[#F3F4F6]/80 border border-[#E5E7EB]/60 rounded-[16px] p-[10px]">
                                  <div className="flex items-start gap-2 mb-1.5">
                                    <div className="w-1 h-1 rounded-full bg-[#8B5CF6] mt-2" />
                                    <span className="text-[#6B7280]" style={{ fontSize: '11px', fontWeight: 700 }}>어원 이야기</span>
                                  </div>
                                  <p className="text-[#4B5563] pl-3" style={{ fontSize: '12px', fontWeight: 500, lineHeight: 1.6 }}>
                                    {word.story}
                                  </p>
                                </div>
                              )}

                              {/* Related Words */}
                              <div className="space-y-2">
                                {/* Derivatives */}
                                {word.derivatives.length > 0 && (
                                  <div className="bg-white/60 rounded-[16px] p-2 border border-[#E5E7EB]/50">
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                      <div className="w-1 h-1 rounded-full bg-[#8B5CF6]" />
                                      <span className="text-[#6B7280]" style={{ fontSize: '11px', fontWeight: 700 }}>파생어</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 pl-2">
                                      {word.derivatives.map((der, idx) =>
                                        renderRelatedWordButton(word, 'derivative', der, idx)
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Synonyms and Antonyms in 2-column grid */}
                                {(word.synonyms.length > 0 || word.antonyms.length > 0) && (
                                  <div className="grid grid-cols-2 gap-2">
                                    {/* Synonyms */}
                                    {word.synonyms.length > 0 && (
                                      <div className="bg-white/60 rounded-[16px] p-2 border border-[#E5E7EB]/50">
                                        <div className="flex items-center gap-1.5 mb-1.5">
                                          <div className="w-1 h-1 rounded-full bg-[#8B5CF6]" />
                                          <span className="text-[#6B7280]" style={{ fontSize: '11px', fontWeight: 700 }}>유의어</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 pl-2">
                                          {word.synonyms.map((syn, idx) =>
                                            renderRelatedWordButton(word, 'synonym', syn, idx)
                                          )}
                                        </div>
                                      </div>
                                    )}

                                    {/* Antonyms */}
                                    {word.antonyms.length > 0 && (
                                      <div className="bg-white/60 rounded-[16px] p-2 border border-[#E5E7EB]/50">
                                        <div className="flex items-center gap-1.5 mb-1.5">
                                          <div className="w-1 h-1 rounded-full bg-[#8B5CF6]" />
                                          <span className="text-[#6B7280]" style={{ fontSize: '11px', fontWeight: 700 }}>반의어</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 pl-2">
                                          {word.antonyms.map((ant, idx) =>
                                            renderRelatedWordButton(word, 'antonym', ant, idx)
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  )}
                </motion.div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      </div>

      <WordBasketModal
        open={showBasketModal}
        onClose={() => setShowBasketModal(false)}
        words={basketWords}
        onRemoveWord={removeBasketWord}
        onClear={clearBasket}
        onActionComplete={async () => {
          console.log('[WordListScreen] onActionComplete started');
          setShowBasketModal(false);
          // Invalidate vocabulary list cache to show new/updated vocabularies
          const { invalidateVocabularyListCache } = await import('./VocabularyListScreen');
          invalidateVocabularyListCache();
          console.log('[WordListScreen] Vocabulary list cache invalidated');
          // Refresh current vocabulary if applicable
          if (onRefreshVocabulary) {
            console.log('[WordListScreen] Calling onRefreshVocabulary...');
            await onRefreshVocabulary();
            console.log('[WordListScreen] onRefreshVocabulary completed');
          } else {
            console.log('[WordListScreen] No onRefreshVocabulary provided');
          }
        }}
        currentVocabularyId={vocabularyId}
        currentVocabularyTitle={vocabularyTitle}
      />

      {/* Memory Match Game Modal */}
      <AnimatePresence>
        {showMemoryGame && filterType === 'wrong-answers' && (
          <MemoryMatchGame
            words={words.map((w) => ({
              id: w.id,
              word: w.word,
              meaning: w.meaning,
            }))}
            onWordCleared={(wordId) => {
              // Remove word from wrong answers list
              if (onDeletePermanently) {
                onDeletePermanently(wordId);
              }
            }}
            onClose={() => setShowMemoryGame(false)}
            onGameComplete={() => {
              // Optional: handle game completion
            }}
          />
        )}
      </AnimatePresence>

      {/* Ghost Game - Zombie Game */}
      <AnimatePresence>
        {showGhostGame && filterType === 'graveyard' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
          >
            <ZombieGameScreen
              vocabularyWords={words.map((w) => ({
                id: w.id,
                word: w.word,
                meaning: w.meaning,
                pronunciation: w.pronunciation,
              }))}
              onBack={() => setShowGhostGame(false)}
              onBackToHome={onBackToHome}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const areWordListPropsEqual = (prev: WordListScreenProps, next: WordListScreenProps) => {
  return (
    prev.vocabularyTitle === next.vocabularyTitle &&
    prev.unitName === next.unitName &&
    prev.filterType === next.filterType &&
    prev.hideHeader === next.hideHeader &&
    prev.hideActionButtons === next.hideActionButtons &&
    prev.vocabularyWords === next.vocabularyWords &&
    prev.starredWordIds === next.starredWordIds &&
    prev.graveyardWordIds === next.graveyardWordIds &&
    prev.wrongAnswersWordIds === next.wrongAnswersWordIds &&
    prev.onBack === next.onBack &&
    prev.onBackToHome === next.onBackToHome &&
    prev.onAddToStarred === next.onAddToStarred &&
    prev.onMoveToGraveyard === next.onMoveToGraveyard &&
    prev.onDeletePermanently === next.onDeletePermanently &&
    prev.onStartFlashcards === next.onStartFlashcards
  );
};

export const WordListScreen = memo(WordListScreenComponent, areWordListPropsEqual);
WordListScreen.displayName = 'WordListScreen';
