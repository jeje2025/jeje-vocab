import { useCallback, useEffect, useMemo, useState } from 'react';
import { VocabularyCard } from './components/pdf/VocabularyCard';
import { VocabularyTable } from './components/pdf/VocabularyTable';
import { VocabularyTableSimple } from './components/pdf/VocabularyTableSimple';
import { VocabularyTestSimple } from './components/pdf/VocabularyTestSimple';
import { VocabularyTestSynonym } from './components/pdf/VocabularyTestSynonym';
import { VocabularyTestSynonymAnswer } from './components/pdf/VocabularyTestSynonymAnswer';
import { A4PageLayout } from './components/pdf/A4PageLayout';
import { HeaderFooter } from './components/pdf/HeaderFooter';
import { projectId } from './utils/supabase/info';
import {
  HeaderInfo,
  LayoutOptionId,
  PdfWord,
  layoutOptionIds,
  normalizeWordList
} from './utils/pdfExportHelpers';
import './styles/pdf-layout.css';

const isLayoutOption = (value: string | null): value is LayoutOptionId => {
  if (!value) return false;
  return layoutOptionIds.includes(value as LayoutOptionId);
};

export default function ExportPrintPage() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const initialVocabId = params.get('vocabularyId') || params.get('vocabId') || '';
  const initialLayout = isLayoutOption(params.get('layout')) ? (params.get('layout') as LayoutOptionId) : 'card';

  const [pdfWords, setPdfWords] = useState<PdfWord[]>([]);
  const [vocabularyTitle, setVocabularyTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const className = 'pdf-print-page';
    document.body.classList.add(className);
    document.documentElement.classList.add(className);

    return () => {
      document.body.classList.remove(className);
      document.documentElement.classList.remove(className);
    };
  }, []);

  const fetchVocabulary = useCallback(async () => {
    if (!initialVocabId.trim()) {
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
        `https://${projectId}.supabase.co/functions/v1/server/user-vocabularies/${initialVocabId.trim()}`,
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

      if (!normalized.length) {
        throw new Error('이 단어장은 비어 있습니다. 단어를 추가한 뒤 다시 시도해주세요.');
      }

      setPdfWords(normalized);
      setVocabularyTitle(payload.vocabulary?.title || 'AI Vocabulary');
    } catch (error) {
      console.error(error);
      setPdfWords([]);
      setErrorMessage(error instanceof Error ? error.message : '단어장을 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [initialVocabId]);

  useEffect(() => {
    fetchVocabulary();
  }, [fetchVocabulary]);

  useEffect(() => {
    if (!isLoading && !errorMessage && pdfWords.length) {
      const timer = setTimeout(() => {
        window.print();
      }, 200);
      return () => clearTimeout(timer);
    }
    return;
  }, [isLoading, errorMessage, pdfWords.length]);

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
      return null;
    }

    switch (initialLayout) {
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

  return (
    <div className="min-h-screen bg-white pdf-print-root">
      {isLoading && (
        <div className="py-12 text-center text-gray-500">단어장을 불러오는 중입니다...</div>
      )}
      {errorMessage && (
        <div className="py-12 text-center text-rose-600">{errorMessage}</div>
      )}
      {!isLoading && !errorMessage && pdfWords.length > 0 && (
        <div id="pdf-print-area">{renderSelectedLayout()}</div>
      )}
    </div>
  );
}
