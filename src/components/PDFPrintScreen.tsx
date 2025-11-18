import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Printer, LayoutGrid, Table2, Rows3, Sparkles, ListChecks, FileCheck2 } from 'lucide-react';
import { Suspense, lazy } from 'react';
import { StandardHeader } from './StandardHeader';
import '../styles/pdf-layout.css';

const LayoutCard = lazy(() => import('./pdf/VocabularyCard').then(m => ({ default: m.VocabularyCard })));
const LayoutTable = lazy(() => import('./pdf/VocabularyTable').then(m => ({ default: m.VocabularyTable })));
const LayoutSimple = lazy(() => import('./pdf/VocabularyTableSimple').then(m => ({ default: m.VocabularyTableSimple })));
const LayoutTestSimple = lazy(() => import('./pdf/VocabularyTestSimple').then(m => ({ default: m.VocabularyTestSimple })));
const LayoutTestSynonym = lazy(() => import('./pdf/VocabularyTestSynonym').then(m => ({ default: m.VocabularyTestSynonym })));
const LayoutTestSynonymAnswer = lazy(() => import('./pdf/VocabularyTestSynonymAnswer').then(m => ({ default: m.VocabularyTestSynonymAnswer })));
const LayoutA4 = lazy(() => import('./pdf/A4PageLayout').then(m => ({ default: m.A4PageLayout })));
const LayoutHeader = lazy(() => import('./pdf/HeaderFooter').then(m => ({ default: m.HeaderFooter })));

type LayoutOptionId = 'card' | 'table' | 'simple' | 'quiz-simple' | 'quiz-synonym' | 'quiz-synonym-answer';

interface LayoutOption {
  id: LayoutOptionId;
  title: string;
  description: string;
  icon: typeof LayoutGrid;
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

interface PDFPrintScreenProps {
  onBack: () => void;
  vocabularyTitle?: string;
  vocabularyId?: string;
  words?: any[];
  hideHeader?: boolean; // 탭 내에서 사용 시 헤더 숨기기
}

const layoutOptions: LayoutOption[] = [
  { id: 'card', title: '카드형', description: '발음, 뜻, 어원까지 카드형으로 출력', icon: LayoutGrid },
  { id: 'table', title: '표 버전', description: '세부 정보를 모두 담은 표 레이아웃', icon: Table2 },
  { id: 'simple', title: '간단 버전', description: '단어와 뜻만 빠르게 복습', icon: Rows3 },
  { id: 'quiz-simple', title: '간단 테스트', description: '뜻을 직접 적어보는 연습지', icon: Sparkles },
  { id: 'quiz-synonym', title: '동의어 테스트지', description: '선택형 동의어 테스트', icon: ListChecks },
  { id: 'quiz-synonym-answer', title: '동의어 답지', description: '정답과 해설이 포함된 답안지', icon: FileCheck2 }
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
  return (words || [])
    .map((word, index) => {
      const safe = word || {};
      const normalizedWord = String(safe.word || safe.term || '').trim();
      if (!normalizedWord) return null;
      return {
        id: index + 1,
        word: normalizedWord,
        pronunciation: safe.pronunciation || '',
        partOfSpeech: safe.partOfSpeech || safe.part_of_speech || '',
        meaning: safe.meaning || safe.translation || '',
        definition: safe.definition || '',
        synonyms: ensureStringArray(safe.synonyms),
        antonyms: ensureStringArray(safe.antonyms),
        derivatives: ensureDerivativeArray(safe.derivatives),
        example: safe.example || safe.example_sentence || '',
        translation: safe.translation || '',
        translationHighlight: safe.translationHighlight || safe.translation_highlight || '',
        etymology: safe.etymology || ''
      } as PdfWord;
    })
    .filter(Boolean) as PdfWord[];
};

const PRINT_STYLES = `
@media screen {
  #pdf-print-layout {
    display: none;
  }
}

@media print {
  body {
    margin: 0 !important;
    background: #fff !important;
  }
  .pdf-print-overlay {
    display: none !important;
  }
  #pdf-print-layout {
    display: block !important;
    width: auto !important;
    height: auto !important;
    overflow: visible !important;
  }
}
`;

export function PDFPrintScreen({ onBack, vocabularyId, vocabularyTitle, words, hideHeader = false }: PDFPrintScreenProps) {
  const [selectedLayout, setSelectedLayout] = useState<LayoutOptionId>('card');
  const pdfWords = useMemo(() => normalizeWordList(words || []), [words]);

  const headerInfo: HeaderInfo = useMemo(
    () => ({
      headerTitle: vocabularyTitle || 'AI Vocabulary',
      headerDescription: pdfWords.length ? `${pdfWords.length.toLocaleString()}개의 단어` : '',
      footerLeft: new Date().toLocaleDateString('ko-KR')
    }),
    [vocabularyTitle, pdfWords.length]
  );

  const renderSelectedLayout = () => {
    if (!pdfWords.length) {
      return null;
    }

    return (
      <Suspense fallback={<div className="py-16 text-center text-gray-400 text-sm">레이아웃 로딩 중...</div>}>
        {selectedLayout === 'card' && (
          <LayoutA4
            headerContent={<LayoutHeader headerInfo={headerInfo} showFooter={true} />}
            showHeaderOnFirstPageOnly={true}
          >
            {pdfWords.map((word) => (
              <LayoutCard key={word.id} {...word} />
            ))}
          </LayoutA4>
        )}
        {selectedLayout === 'table' && <LayoutTable data={pdfWords} headerInfo={headerInfo} />}
        {selectedLayout === 'simple' && <LayoutSimple data={pdfWords} headerInfo={headerInfo} />}
        {selectedLayout === 'quiz-simple' && <LayoutTestSimple data={pdfWords} headerInfo={headerInfo} />}
        {selectedLayout === 'quiz-synonym' && <LayoutTestSynonym data={pdfWords} headerInfo={headerInfo} />}
        {selectedLayout === 'quiz-synonym-answer' && (
          <LayoutTestSynonymAnswer data={pdfWords} headerInfo={headerInfo} />
        )}
      </Suspense>
    );
  };

  const handlePrint = () => {
    if (!pdfWords.length) {
      alert('인쇄할 단어가 없습니다.');
      return;
    }
    window.print();
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PRINT_STYLES }} />
      <div className="h-full flex flex-col pdf-print-overlay pdf-print-root">
        {!hideHeader && (
          <StandardHeader
            onBack={onBack}
            title="PDF 인쇄"
            subtitle="인쇄할 형식을 선택하세요"
          />
        )}

        <main className={`flex-1 overflow-y-auto scrollbar-hide px-4 ${hideHeader ? 'pt-2 pb-6' : 'pt-4 pb-28'} space-y-6`}>
          {!hideHeader && (
            <section className="max-w-4xl mx-auto bg-white/90 backdrop-blur-lg rounded-2xl border border-white/50 shadow-lg p-4">
              <p className="text-sm text-gray-500">현재 단어장</p>
              <p className="text-xl font-bold text-[#091A7A]">{vocabularyTitle || '단어장 선택 필요'}</p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mt-2">
                <span>{pdfWords.length.toLocaleString()}개의 단어</span>
              </div>
            </section>
          )}

          <section className="max-w-4xl mx-auto">
            <div className="grid gap-3 md:grid-cols-2">
              {layoutOptions.map((option) => {
                const Icon = option.icon;
                const isActive = selectedLayout === option.id;
                return (
                  <motion.button
                    key={option.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedLayout(option.id)}
                    className={`w-full p-4 bg-white/90 backdrop-blur-lg rounded-2xl border-2 shadow-lg transition-all text-left ${
                      isActive ? 'border-[#491B6D] shadow-xl' : 'border-white/40'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                          isActive ? 'bg-[#491B6D] text-white' : 'bg-[#F3E8FF] text-[#7C3AED]'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3
                          className={`mb-1 ${isActive ? 'text-[#491B6D]' : 'text-[#091A7A]'}`}
                          style={{ fontSize: '16px', fontWeight: 600 }}
                        >
                          {option.title}
                        </h3>
                        <p className="text-[#6B7280]" style={{ fontSize: '13px', fontWeight: 400 }}>
                          {option.description}
                        </p>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </section>

          <section className="max-w-4xl mx-auto">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handlePrint}
              disabled={!pdfWords.length}
              className={`w-full py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2 ${
                pdfWords.length === 0
                  ? 'bg-gray-300 opacity-50 cursor-not-allowed text-white'
                  : 'bg-gradient-to-br from-[#7C3AED] to-[#A78BFA] text-white'
              }`}
            >
              <Printer className="w-5 h-5" />
              <span className="text-white" style={{ fontSize: '16px', fontWeight: 600 }}>
                {pdfWords.length === 0
                  ? '단어장 로딩 중'
                  : `${layoutOptions.find((l) => l.id === selectedLayout)?.title} 인쇄하기`}
              </span>
            </motion.button>
          </section>
        </main>
      </div>

      <div id="pdf-print-layout" className="pdf-print-root">
        {pdfWords.length ? renderSelectedLayout() : null}
      </div>
    </>
  );
}
