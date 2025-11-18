import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, LayoutGrid, Table2, Rows3, ListChecks, Sparkles, FileCheck2, type LucideIcon } from 'lucide-react';
import { VocabularyCard } from './components/pdf/VocabularyCard';
import { VocabularyTable } from './components/pdf/VocabularyTable';
import { VocabularyTableSimple } from './components/pdf/VocabularyTableSimple';
import { VocabularyTestSimple } from './components/pdf/VocabularyTestSimple';
import { VocabularyTestSynonym } from './components/pdf/VocabularyTestSynonym';
import { VocabularyTestSynonymAnswer } from './components/pdf/VocabularyTestSynonymAnswer';
import { A4PageLayout } from './components/pdf/A4PageLayout';
import { HeaderFooter } from './components/pdf/HeaderFooter';
import { projectId } from './utils/supabase/info';
import './styles/pdf-layout.css';

type LayoutOptionId = 'card' | 'table' | 'simple' | 'quiz-simple' | 'quiz-synonym' | 'quiz-synonym-answer';

interface LayoutOption {
  id: LayoutOptionId;
  title: string;
  description: string;
  icon: LucideIcon;
}

interface PdfWord {
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

interface HeaderInfo {
  headerTitle: string;
  headerDescription: string;
  footerLeft: string;
}

const layoutOptions: LayoutOption[] = [
  {
    id: 'card',
    title: '카드형',
    description: '발음·뜻·예문·어원을 카드 형태로 출력',
    icon: LayoutGrid
  },
  {
    id: 'table',
    title: '표 버전',
    description: '세부 정보를 모두 담은 표 레이아웃',
    icon: Table2
  },
  {
    id: 'simple',
    title: '간단 버전',
    description: '단어와 뜻만 빠르게 훑어보기',
    icon: Rows3
  },
  {
    id: 'quiz-simple',
    title: '간단 테스트',
    description: '단어만 보고 뜻을 적는 연습지',
    icon: Sparkles
  },
  {
    id: 'quiz-synonym',
    title: '동의어 테스트지',
    description: '동의어 선택형 문제지',
    icon: ListChecks
  },
  {
    id: 'quiz-synonym-answer',
    title: '동의어 답지',
    description: '정답 및 해설이 포함된 답안지',
    icon: FileCheck2
  },
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
      // ignore
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
      // ignore
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

const normalizeWordList = (words: any[]): PdfWord[] => {
  return words
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

export default function ExportPage() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const initialVocabId = params.get('vocabularyId') || params.get('vocabId') || '';

  const [selectedLayout, setSelectedLayout] = useState<LayoutOptionId>('card');
  const [currentVocabId, setCurrentVocabId] = useState<string | null>(initialVocabId || null);
  const [pdfWords, setPdfWords] = useState<PdfWord[]>([]);
  const [vocabularyTitle, setVocabularyTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleBackToApp = () => {
    window.location.pathname = '/';
  };

  const fetchVocabulary = useCallback(
    async (id: string) => {
      const trimmedId = id.trim();
      if (!trimmedId) {
        setErrorMessage('단어장 ID를 찾을 수 없습니다.');
        return;
      }

      const token = localStorage.getItem('supabase_access_token');
      if (!token) {
        setErrorMessage('로그인이 필요합니다. 앱에서 로그인 후 다시 시도해주세요.');
        return;
      }

      try {
        setIsLoading(true);
        setErrorMessage(null);

        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/server/user-vocabularies/${trimmedId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          throw new Error(errorBody.error || errorBody.message || '단어장을 불러오지 못했습니다.');
        }

        const payload = await response.json();
        const normalized = normalizeWordList(payload.words || []);

        if (normalized.length === 0) {
          throw new Error('이 단어장은 비어 있습니다. 단어를 추가한 뒤 다시 시도해주세요.');
        }

        setPdfWords(normalized);
        setVocabularyTitle(payload.vocabulary?.title || 'AI Vocabulary');
        setCurrentVocabId(trimmedId);
      } catch (error) {
        console.error(error);
        setPdfWords([]);
        setCurrentVocabId(null);
        setErrorMessage(error instanceof Error ? error.message : '단어장을 불러오지 못했습니다.');
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (initialVocabId) {
      fetchVocabulary(initialVocabId);
    } else {
      setErrorMessage('단어장 ID가 포함된 링크를 통해 접근해주세요.');
    }
  }, [initialVocabId, fetchVocabulary]);

  const headerInfo: HeaderInfo = useMemo(
    () => ({
      headerTitle: vocabularyTitle || 'AI Vocabulary',
      headerDescription: pdfWords.length ? `${pdfWords.length.toLocaleString()}개의 단어` : '',
      footerLeft: new Date().toLocaleDateString('ko-KR')
    }),
    [pdfWords.length, vocabularyTitle]
  );

  const renderSelectedLayout = () => {
    if (!pdfWords.length) {
      return <p className="text-center text-gray-500">표시할 단어가 없습니다.</p>;
    }

    switch (selectedLayout) {
      case 'card':
        return (
          <A4PageLayout
            headerContent={<HeaderFooter headerInfo={headerInfo} showFooter={true} />}
            showHeaderOnFirstPageOnly={true}
          >
            {pdfWords.map((word) => (
              <VocabularyCard key={word.id} {...word} />
            ))}
          </A4PageLayout>
        );
      case 'table':
        return <VocabularyTable data={pdfWords} headerInfo={headerInfo} />;
      case 'simple':
        return <VocabularyTableSimple data={pdfWords} headerInfo={headerInfo} />;
      case 'quiz-simple':
        return <VocabularyTestSimple data={pdfWords} headerInfo={headerInfo} />;
      case 'quiz-synonym':
        return <VocabularyTestSynonym data={pdfWords} headerInfo={headerInfo} />;
      case 'quiz-synonym-answer':
        return <VocabularyTestSynonymAnswer data={pdfWords} headerInfo={headerInfo} />;
      default:
        return null;
    }
  };

  const handlePrint = () => {
    if (isLoading) {
      alert('단어장을 불러오는 중입니다. 잠시만 기다려주세요.');
      return;
    }
    if (!pdfWords.length) {
      alert(errorMessage || '인쇄할 단어가 없습니다.');
      return;
    }
    window.print();
  };

  const printLayout = pdfWords.length > 0 ? renderSelectedLayout() : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FDF2F8] via-[#F5F3FF] to-[#E0F2FE] pb-16 print:bg-white print:min-h-0 print:pb-0">
      <header className="sticky top-0 z-40 bg-transparent px-4 pt-6 print:hidden">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <motion.button
            onClick={handleBackToApp}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/80 border border-white/60 shadow-lg text-[#491B6D]"
          >
            <ArrowLeft className="w-4 h-4" />
            홈으로
          </motion.button>

          <div className="text-center">
            <p className="text-sm text-[#6B21A8] font-semibold tracking-wide uppercase">AI Vocabulary Export</p>
            <p className="text-lg font-bold text-[#1E1B4B]">내 단어장 PDF로 뽑기</p>
          </div>

          <div className="w-[140px]" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-8 space-y-8 print:hidden">
        <section className="bg-white/95 rounded-3xl border border-white/70 shadow-xl p-6 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm text-gray-500">현재 단어장</p>
              <p className="text-2xl font-bold text-[#1E1B4B]">
                {vocabularyTitle || '단어장 불러오는 중'}
              </p>
              <p className="text-sm text-gray-500">
                {pdfWords.length ? `${pdfWords.length.toLocaleString()}개 단어` : '단어장 로딩 필요'}
              </p>
            </div>
            <div className="text-sm text-gray-400 font-mono bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
              ID: {currentVocabId || '—'}
            </div>
          </div>

          {isLoading && (
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#C4B5FD] border-t-transparent" />
              단어장을 불러오는 중입니다...
            </div>
          )}

          {errorMessage && (
            <div className="rounded-2xl border border-rose-100 bg-rose-50/70 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </div>
          )}
        </section>

        <section className="bg-white/95 rounded-3xl border border-white/70 shadow-xl p-6 space-y-6">
          <div>
            <p className="text-sm font-semibold text-[#6B21A8] mb-2">1. 레이아웃 선택</p>
            <div className="grid gap-4 md:grid-cols-2">
              {layoutOptions.map((option) => {
                const Icon = option.icon;
                const isActive = selectedLayout === option.id;
                return (
                  <motion.button
                    key={option.id}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setSelectedLayout(option.id)}
                    className={`p-4 rounded-3xl text-left border shadow-sm transition-all ${
                      isActive
                        ? 'bg-gradient-to-br from-[#C084FC] to-[#A855F7] text-white border-transparent shadow-lg shadow-purple-200'
                        : 'bg-white/90 border-white/60 text-[#1E1B4B] hover:-translate-y-0.5'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className={`p-2 rounded-2xl ${
                          isActive ? 'bg-white/20 text-white' : 'bg-[#F5F3FF] text-[#7C3AED]'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-base font-semibold">{option.title}</p>
                        <p className={`text-sm ${isActive ? 'text-white/80' : 'text-gray-500'}`}>{option.description}</p>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-[#6B21A8]">2. 인쇄하기</p>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handlePrint}
              disabled={isLoading || !pdfWords.length}
              className={`w-full rounded-2xl px-6 py-4 text-white font-bold shadow-lg ${
                isLoading || !pdfWords.length
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-gradient-to-br from-[#7C3AED] to-[#A855F7]'
              }`}
            >
              {isLoading ? '불러오는 중...' : '선택한 레이아웃 인쇄하기'}
            </motion.button>
            <p className="text-xs text-gray-500">
              브라우저 인쇄 창이 열리면 출력 대상을 “PDF로 저장”으로 변경하면 바로 PDF 파일로 내려받을 수 있어요.
            </p>
          </div>
        </section>
      </main>

      {/* 인쇄용 레이아웃 - 화면에서는 숨기고 인쇄할 때만 보임 */}
      <div id="pdf-print-area" className="pdf-print-root">
        {printLayout}
      </div>
    </div>
  );
}
