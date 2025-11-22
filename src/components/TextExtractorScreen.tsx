import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, BookOpen, MessageSquare, Lightbulb, Sparkles, Check, Loader2, Printer, MessageCirclePlus, X, RotateCcw } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId } from '../utils/supabase/info';
import { getSupabaseClient } from '../utils/supabase/client';
import { VocabularyBox } from './explanation/VocabularyBox';
import { AnalysisBox } from './explanation/AnalysisBox';
import { ExplanationBox } from './explanation/ExplanationBox';
import { StandardHeader } from './StandardHeader';
import { useWordBasket } from '../hooks/useWordBasket';
import { WordBasketBar } from './selection/WordBasketBar';
import { WordBasketModal } from './selection/WordBasketModal';

const supabase = getSupabaseClient();
const WORD_CART_LIMIT = 60;
const ANALYSIS_ENDPOINT = `https://${projectId}.supabase.co/functions/v1/text-analyzer/analyze`;
const MAX_ANALYSIS_RETRIES = 3;
const ANALYSIS_RETRY_DELAY_MS = 1500;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface AnalysisPayload {
  text: string;
  options: {
    vocabulary: boolean;
    analysis: boolean;
    explanation: boolean;
  };
  answerKey: string;
  questionType?: string;
}

interface TextExtractorScreenProps {
  onBack: () => void;
  onNavigateToTutor?: (question: string, context: string) => void;
}

type VocabularyEntry = {
  word: string;
  pos: string;
  meaning: string;
  level: string;
};

interface AnalysisResults {
  vocabulary?: VocabularyEntry[];
  analysis?: string;
  explanation?: string;
}
const normalizeVocabularyList = (items?: AnalysisResults['vocabulary']) => {
  if (!items?.length) return undefined;
  const seen = new Set<string>();
  const normalized: VocabularyEntry[] = [];

  for (const wordEntry of items) {
    const trimmedWord = wordEntry.word?.trim();
    if (!trimmedWord) continue;

    const key = trimmedWord.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    normalized.push({
      word: trimmedWord,
      pos: wordEntry.pos?.trim() || '',
      meaning: wordEntry.meaning?.trim() || '',
      level: wordEntry.level?.trim() || ''
    });
  }

  return normalized.length ? normalized : undefined;
};

const normalizeMultilineText = (text?: string): string | undefined => {
  if (!text) return undefined;
  const lines = text.replace(/\r/g, '').split('\n');
  const cleanedLines: string[] = [];
  let pendingBlank = false;

  for (const rawLine of lines) {
    const trimmedLine = rawLine.trim().replace(/[ ]{2,}/g, ' ');
    if (!trimmedLine) {
      if (cleanedLines.length > 0 && !pendingBlank) {
        pendingBlank = true;
      }
      continue;
    }

    if (pendingBlank) {
      cleanedLines.push('');
      pendingBlank = false;
    }

    cleanedLines.push(trimmedLine);
  }

  const condensed = cleanedLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return condensed || undefined;
};

// Clean up OCR formatting issues for print output and input
const cleanOCRText = (text: string): string => {
  return text
    // Remove carriage returns
    .replace(/\r/g, '')
    // Fix common OCR mistakes
    .replace(/[|｜]/g, 'I') // Replace | with I
    .replace(/[０-９]/g, (m) => String.fromCharCode(m.charCodeAt(0) - 0xFEE0)) // Full-width to half-width numbers
    .replace(/[Ａ-Ｚａ-ｚ]/g, (m) => String.fromCharCode(m.charCodeAt(0) - 0xFEE0)) // Full-width to half-width letters
    // Replace multiple spaces with single space
    .replace(/[ \t]{2,}/g, ' ')
    // Replace 3+ consecutive line breaks with 2
    .replace(/\n{3,}/g, '\n\n')
    // Remove trailing spaces from each line
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    // Trim the entire text
    .trim();
};

const sanitizeAnalysisResults = (data: AnalysisResults): AnalysisResults => ({
  vocabulary: normalizeVocabularyList(data.vocabulary),
  analysis: normalizeMultilineText(data.analysis),
  explanation: normalizeMultilineText(data.explanation),
});

const buildAnalysisPayload = (
  text: string,
  options: AnalysisPayload['options'],
  answerKey: string,
  questionType?: string
): AnalysisPayload => ({
  text,
  options,
  answerKey: answerKey.trim(),
  ...(questionType && { questionType })
});

const fetchAnalysisOnce = async (token: string, payload: AnalysisPayload): Promise<AnalysisResults> => {
  const response = await fetch(ANALYSIS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || '분석 처리 실패');
  }

  return data;
};

const fetchAnalysisWithRetries = async (token: string, payload: AnalysisPayload): Promise<AnalysisResults> => {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_ANALYSIS_RETRIES; attempt++) {
    try {
      const result = await fetchAnalysisOnce(token, payload);
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < MAX_ANALYSIS_RETRIES) {
        await delay(ANALYSIS_RETRY_DELAY_MS);
        continue;
      }
      throw lastError;
    }
  }

  throw lastError ?? new Error('분석 처리 실패');
};

export function TextExtractorScreen({ onBack, onNavigateToTutor }: TextExtractorScreenProps) {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [inputText, setInputTextState] = useState(() => {
    // Restore input text from localStorage on mount
    return localStorage.getItem('textExtractorInput') || '';
  });
  const [answerKey, setAnswerKey] = useState('');
  const [questionType, setQuestionType] = useState<string>('blank');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [results, setResults] = useState<AnalysisResults | null>(() => {
    // Restore results from localStorage on mount
    const saved = localStorage.getItem('textExtractorResults');
    return saved ? JSON.parse(saved) : null;
  });
  const questionInputRef = useRef<HTMLTextAreaElement>(null);

  // Helper function to update input text and save to localStorage
  const setInputText = (text: string) => {
    setInputTextState(text);
    localStorage.setItem('textExtractorInput', text);
  };

  // Save results to localStorage whenever they change
  useEffect(() => {
    if (results) {
      localStorage.setItem('textExtractorResults', JSON.stringify(results));
    }
  }, [results]);
  const {
    selectedWords: basketWords,
    count: basketCount,
    toggleWord: toggleBasketWord,
    addWords: addBasketWords,
    removeWords: removeBasketWords,
    removeWord: removeBasketWord,
    clear: clearBasket,
    isSelected: isBasketSelected,
  } = useWordBasket();
  const [showBasketModal, setShowBasketModal] = useState(false);
  const [printContainer, setPrintContainer] = useState<HTMLElement | null>(null);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [followUpQuestion, setFollowUpQuestion] = useState('');

  // Create print container outside of #root
  useEffect(() => {
    const container = document.createElement('div');
    container.id = 'print-portal-container';
    document.body.appendChild(container);
    setPrintContainer(container);

    return () => {
      document.body.removeChild(container);
    };
  }, []);

  // Auto-focus on question input when modal opens
  useEffect(() => {
    if (showQuestionModal) {
      // Wait for modal animation to complete before focusing
      setTimeout(() => {
        questionInputRef.current?.focus();
      }, 200);
    }
  }, [showQuestionModal]);

  const options = [
    { id: 'word', label: '단어', sublabel: 'Word', icon: BookOpen },
    { id: 'translation', label: '해석', sublabel: 'Translation', icon: MessageSquare },
    { id: 'explanation', label: '해설', sublabel: 'Explanation', icon: Lightbulb }
  ];

  const toggleOption = (optionId: string) => {
    setSelectedOptions(prev =>
      prev.includes(optionId)
        ? prev.filter(id => id !== optionId)
        : [...prev, optionId]
    );
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data:image/...;base64, prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
  };

  const handleCameraCapture = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target?.files?.[0];
      if (file) {
        setIsOcrProcessing(true);
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token;
          if (!token) {
            toast.error('로그인이 필요합니다.');
            return;
          }

          const base64 = await fileToBase64(file);
          const response = await fetch(
            `https://${projectId}.supabase.co/functions/v1/text-analyzer/ocr`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ image: base64 })
            }
          );

          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || 'OCR 처리 실패');
          }

          if (data.text) {
            // Clean OCR text before setting it
            const cleanedText = cleanOCRText(data.text);
            setInputText(cleanedText);
            toast.success('이미지에서 텍스트를 추출했습니다.');
          } else {
            toast.error('이미지에서 텍스트를 찾을 수 없습니다.');
          }
        } catch (error: any) {
          console.error('OCR error:', error);
          toast.error(error.message || 'OCR 처리 중 오류가 발생했습니다.');
        } finally {
          setIsOcrProcessing(false);
        }
      }
    };
    input.click();
  };

  const handleSubmit = async () => {
    if (!inputText.trim() || selectedOptions.length === 0) {
      toast.error('지문과 옵션을 선택해주세요.');
      return;
    }

    setIsProcessing(true);
    // Clear previous results before starting new analysis
    setResults(null);
    localStorage.removeItem('textExtractorResults');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        toast.error('로그인이 필요합니다.');
        return;
      }

      toast.loading('AI가 분석 중입니다...', { id: 'analysis-progress' });

      const hasVocabulary = selectedOptions.includes('word');
      const hasAnalysis = selectedOptions.includes('translation');
      const hasExplanation = selectedOptions.includes('explanation');

      // Make separate API calls for progressive display
      const promises: Promise<void>[] = [];

      // Vocabulary extraction
      if (hasVocabulary) {
        const vocabPromise = (async () => {
          try {
            const payload = buildAnalysisPayload(
              inputText,
              { vocabulary: true, analysis: false, explanation: false },
              answerKey
            );
            const data = await fetchAnalysisWithRetries(token, payload);
            const sanitized = sanitizeAnalysisResults(data);
            setResults(prev => ({ ...prev, vocabulary: sanitized.vocabulary }));
          } catch (error) {
            console.error('Vocabulary extraction error:', error);
          }
        })();
        promises.push(vocabPromise);
      }

      // Text analysis
      if (hasAnalysis) {
        const analysisPromise = (async () => {
          try {
            const payload = buildAnalysisPayload(
              inputText,
              { vocabulary: false, analysis: true, explanation: false },
              answerKey
            );
            const data = await fetchAnalysisWithRetries(token, payload);
            const sanitized = sanitizeAnalysisResults(data);
            setResults(prev => ({ ...prev, analysis: sanitized.analysis }));
          } catch (error) {
            console.error('Text analysis error:', error);
          }
        })();
        promises.push(analysisPromise);
      }

      // Explanation
      if (hasExplanation) {
        const explanationPromise = (async () => {
          try {
            const payload = buildAnalysisPayload(
              inputText,
              { vocabulary: false, analysis: false, explanation: true },
              answerKey,
              questionType
            );
            const data = await fetchAnalysisWithRetries(token, payload);
            const sanitized = sanitizeAnalysisResults(data);
            setResults(prev => ({ ...prev, explanation: sanitized.explanation }));
          } catch (error) {
            console.error('Explanation error:', error);
          }
        })();
        promises.push(explanationPromise);
      }

      // Wait for all to complete
      await Promise.all(promises);
      toast.success('분석이 완료되었습니다!', { id: 'analysis-progress' });
    } catch (error: any) {
      console.error('Analysis error:', error);
      toast.error(error.message || '분석 중 오류가 발생했습니다.', { id: 'analysis-progress' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearResults = () => {
    setResults(null);
    setInputText(''); // 입력창도 비우기
    localStorage.removeItem('textExtractorResults');
    localStorage.removeItem('textExtractorInput');
    toast.info('결과와 입력창을 비웠습니다.');
  };

  const handleAskFollowUpQuestion = () => {
    if (!followUpQuestion.trim()) {
      toast.error('질문을 입력해주세요.');
      return;
    }

    if (!onNavigateToTutor) {
      toast.error('AI 튜터 기능을 사용할 수 없습니다.');
      return;
    }

    // Build context from results
    let context = `[Passage Extractor에서 이어진 질문]\n\n`;
    context += `문제:\n${inputText}\n\n`;

    if (answerKey) {
      context += `정답: ${answerKey}\n\n`;
    }

    if (results?.vocabulary && results.vocabulary.length > 0) {
      context += `추출된 어휘:\n`;
      results.vocabulary.forEach((word: any) => {
        context += `- ${word.word}: ${word.meaning}\n`;
      });
      context += '\n';
    }

    if (results?.analysis) {
      context += `지문 분석:\n${results.analysis}\n\n`;
    }

    if (results?.explanation) {
      context += `문제 해설:\n${results.explanation}\n\n`;
    }

    context += `학생의 질문: ${followUpQuestion}`;

    console.log('Navigating to AI Tutor:', { question: followUpQuestion, hasContext: !!context });

    // Navigate to AI Tutor with context
    onNavigateToTutor(followUpQuestion, context);

    // Close modal and reset
    setShowQuestionModal(false);
    setFollowUpQuestion('');
  };

  return (
    <>
      <style>{`
        @media print {
          @page {
            margin: 1.5cm;
          }

          /* Hide entire app */
          body > #root {
            display: none !important;
          }

          /* Show only print portal */
          #print-portal-container {
            display: block !important;
          }
        }

        /* Hide print portal by default */
        #print-portal-container {
          display: none;
        }

        @media screen {
          #print-portal-container {
            display: none !important;
          }
        }
      `}</style>

      {/* Print-only version - rendered outside #root via Portal */}
      {printContainer && results && createPortal(
        <div style={{ padding: '20px', fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: '9pt', lineHeight: '1.6' }}>
          {/* Header with Date */}
          <div style={{ marginBottom: '20px', borderBottom: '2px solid #000', paddingBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h1 style={{ fontSize: '18pt', margin: 0, fontWeight: 'bold' }}>Passage Extractor 학습자료</h1>
            <div style={{ fontSize: '9pt', color: '#666' }}>{new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
          </div>

          {/* Original Problem Text */}
          {inputText && (
            <div style={{ marginBottom: '25px', padding: '15px', backgroundColor: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '8px' }}>
              <h2 style={{ fontSize: '12pt', marginBottom: '10px', fontWeight: 'bold', color: '#491B6D' }}>📝 문제</h2>
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '9pt', color: '#000' }}>{cleanOCRText(inputText)}</div>
              {answerKey && (
                <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #dee2e6' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '9pt', color: '#000' }}>정답: </span>
                  <span style={{ fontSize: '9pt', color: '#dc3545' }}>{answerKey}</span>
                </div>
              )}
            </div>
          )}

          {results.vocabulary && results.vocabulary.length > 0 && (
            <div style={{ marginBottom: '25px', pageBreakInside: 'avoid' }}>
              <h2 style={{ fontSize: '12pt', marginBottom: '10px', fontWeight: 'bold', color: '#491B6D' }}>추출된 어휘</h2>
              <div style={{ columnCount: 2, columnGap: '20px' }}>
                {results.vocabulary.map((word: any, idx: number) => (
                  <div key={idx} style={{ marginBottom: '6px', breakInside: 'avoid', color: '#000', display: 'flex' }}>
                    <span style={{ fontWeight: 'bold', minWidth: '120px', flexShrink: 0 }}>{word.word}</span>
                    <span>{word.meaning}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.analysis && (
            <div style={{ marginBottom: '25px', pageBreakInside: 'avoid' }}>
              <h2 style={{ fontSize: '12pt', marginBottom: '10px', fontWeight: 'bold', color: '#491B6D' }}>지문 분석</h2>
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '9pt', columnCount: 2, columnGap: '20px', color: '#000' }}>{results.analysis}</div>
            </div>
          )}

          {results.explanation && (
            <div style={{ marginBottom: '25px', pageBreakInside: 'avoid' }}>
              <h2 style={{ fontSize: '12pt', marginBottom: '10px', fontWeight: 'bold', color: '#491B6D' }}>문제 해설</h2>
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '9pt', columnCount: 2, columnGap: '20px', color: '#000' }}>{results.explanation}</div>
            </div>
          )}
        </div>,
        printContainer
      )}
      <div className="h-full flex flex-col">
        <StandardHeader
          onBack={onBack}
          title="Passage Extractor"
          subtitle="단어 추출, 문장 해석, 문제 해설을 도와줍니다"
          rightElement={
            results ? (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleClearResults}
                className="w-11 h-11 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg border border-white/40"
                style={{ minWidth: '44px', minHeight: '44px' }}
              >
                <RotateCcw className="w-5 h-5 text-[#491B6D]" />
              </motion.button>
            ) : undefined
          }
        />

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-8">
        <div className="pt-2">
          {/* Stats Cards - 3 Column Grid */}
          <div className="grid grid-cols-3 gap-3 mb-4 passage-extractor-no-print">
            {options.map((option) => {
              const Icon = option.icon;
              const isSelected = selectedOptions.includes(option.id);
              
              return (
                <motion.button
                  key={option.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => toggleOption(option.id)}
                  className="relative bg-white/90 border border-gray-200 p-3 shadow-sm transition-all rounded-2xl"
                >
                  {/* Check Mark */}
                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#491B6D] rounded-full flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                    </div>
                  )}
                  
                  {/* Icon */}
                  <div className="flex justify-center mb-2">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      isSelected ? 'bg-[#491B6D]' : 'bg-[#491B6D]/10'
                    }`}>
                      <Icon 
                        className={`w-5 h-5 ${
                          isSelected ? 'text-white' : 'text-[#491B6D]'
                        }`} 
                      />
                    </div>
                  </div>
                  
                  {/* Label */}
                  <div className="text-center">
                    <div className="text-[#091A7A]" style={{ fontSize: '13px', fontWeight: 600 }}>
                      {option.label}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Text Input Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/95 backdrop-blur-xl border border-white/50 p-6 shadow-xl rounded-3xl passage-extractor-no-print"
          >
            {/* Header with Camera Button */}
            <div className="flex items-center justify-between mb-4 passage-extractor-no-print">
              <h2 className="text-[#091A7A] no-print" style={{ fontSize: '16px', fontWeight: 700 }}>
                지문 입력
              </h2>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleCameraCapture}
                disabled={isOcrProcessing}
                className="w-10 h-10 bg-[#491B6D]/10 flex items-center justify-center rounded-[12px]"
              >
                {isOcrProcessing ? (
                  <Loader2 className="w-5 h-5 text-[#491B6D] animate-spin" />
                ) : (
                  <Camera className="w-5 h-5 text-[#491B6D]" />
                )}
              </motion.button>
            </div>

            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="여기에 지문을 붙여넣거나 입력하세요..."
              className="w-full h-64 p-4 bg-[#F9FAFB] border border-gray-200 focus:border-[#491B6D] focus:outline-none resize-none text-[#374151] transition-colors rounded-md"
              style={{ fontSize: '14px', fontWeight: 400, lineHeight: '1.6' }}
            />

            {/* Answer Key Input & Question Type - Only show when "해설" is selected */}
            {selectedOptions.includes('explanation') && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 space-y-4"
              >
                <div>
                  <label className="block text-sm font-semibold text-[#091A7A] mb-2">
                    정답 (선택사항)
                  </label>
                  <input
                    type="text"
                    value={answerKey}
                    onChange={(e) => setAnswerKey(e.target.value)}
                    placeholder="예: ③ 또는 resilient"
                    className="w-full p-3 bg-[#F9FAFB] border border-gray-200 focus:border-[#491B6D] focus:outline-none text-[#374151] transition-colors rounded-md"
                    style={{ fontSize: '14px' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#091A7A] mb-2">
                    문제 유형
                  </label>
                  <select
                    value={questionType}
                    onChange={(e) => setQuestionType(e.target.value)}
                    className="w-full p-3 bg-[#F9FAFB] border border-gray-200 focus:border-[#491B6D] focus:outline-none text-[#374151] transition-colors rounded-md"
                    style={{ fontSize: '14px' }}
                  >
                    <option value="blank">논리 & 빈칸</option>
                    <option value="main_idea">대의파악 (주제/제목/요지/목적)</option>
                    <option value="matching">정보파악 (일치/불일치)</option>
                    <option value="order">순서 배열</option>
                    <option value="insertion">문장 삽입</option>
                    <option value="irrelevant">무관한 문장 찾기</option>
                    <option value="other">기타</option>
                  </select>
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Submit Button */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSubmit}
            disabled={!inputText.trim() || selectedOptions.length === 0 || isProcessing}
            className={`w-full p-5 shadow-lg transition-all mt-4 rounded-2xl passage-extractor-no-print ${
              inputText.trim() && selectedOptions.length > 0 && !isProcessing
                ? 'bg-gradient-to-r from-[#491B6D] to-[#5E2278] opacity-100'
                : 'bg-gray-300 opacity-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              {isProcessing ? (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              ) : (
                <Sparkles className="w-5 h-5 text-white" />
              )}
              <span className="text-white" style={{ fontSize: '16px', fontWeight: 600 }}>
                {isProcessing ? 'AI 분석 중...' : '문제 추출 시작하기'}
              </span>
            </div>
          </motion.button>

          {/* Results Section */}
          {results && (
            <motion.div
              id="passage-extractor-print-content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 space-y-4"
            >
              {results.vocabulary && results.vocabulary.length > 0 && (
                <VocabularyBox
                  vocabulary={results.vocabulary}
                  onToggleWord={(word) => {
                    const alreadySelected = isBasketSelected(word.id);
                    if (!alreadySelected && basketCount >= WORD_CART_LIMIT) {
                      toast.error(`한 번에 ${WORD_CART_LIMIT}개까지만 선택할 수 있어요.`);
                      return;
                    }
                    toggleBasketWord(word);
                    toast[alreadySelected ? 'info' : 'success'](
                      alreadySelected ? '장바구니에서 제거했어요.' : '장바구니에 추가했어요.',
                      { duration: 1500 }
                    );
                  }}
                  onSelectAll={(words) => {
                    if (basketCount >= WORD_CART_LIMIT) {
                      toast.error(`한 번에 ${WORD_CART_LIMIT}개까지만 선택할 수 있어요.`);
                      return;
                    }
                    const available = words.filter((word) => !isBasketSelected(word.id));
                    if (available.length === 0) {
                      toast.info('이미 모두 담겨 있어요.');
                      return;
                    }
                    const remainingSlots = WORD_CART_LIMIT - basketCount;
                    const toAdd = available.slice(0, remainingSlots);
                    addBasketWords(toAdd);
                    toast.success(`${toAdd.length}개 단어를 장바구니에 추가했어요.`);
                  }}
                  onDeselectAll={(ids) => {
                    removeBasketWords(ids);
                    toast.info('추출된 단어 선택을 해제했어요.');
                  }}
                  isWordSelected={isBasketSelected}
                  onAddToVocabulary={(words) => {
                    addBasketWords(words);
                    setShowBasketModal(true);
                  }}
                />
              )}

              {results.analysis && (
                <AnalysisBox analysis={results.analysis} />
              )}

              {results.explanation && (
                <ExplanationBox explanation={results.explanation} />
              )}

              {/* Action Buttons - Print & Ask More */}
              <div className="grid grid-cols-2 gap-3 pt-2 passage-extractor-no-print">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => window.print()}
                  className="p-4 bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Printer className="w-5 h-5 text-[#491B6D]" />
                    <span className="text-[#491B6D] font-semibold text-sm">인쇄하기</span>
                  </div>
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowQuestionModal(true)}
                  className="p-4 bg-gradient-to-r from-[#491B6D] to-[#5E2278] rounded-2xl shadow-sm hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-center gap-2">
                    <MessageCirclePlus className="w-5 h-5 text-white" />
                    <span className="text-white font-semibold text-sm">추가 질문하기</span>
                  </div>
                </motion.button>
              </div>
            </motion.div>
          )}
        </div>
      </div>

        {/* WordBasketBar 제거 - 이미 VocabularyBox에 장바구니 추가 버튼이 있음 */}
        <WordBasketModal
          open={showBasketModal}
          onClose={() => setShowBasketModal(false)}
          words={basketWords}
          onRemoveWord={removeBasketWord}
          onClear={clearBasket}
          onActionComplete={async () => {
            setShowBasketModal(false);
            // Invalidate vocabulary list cache to show new/updated vocabularies
            const { invalidateVocabularyListCache } = await import('./VocabularyListScreen');
            invalidateVocabularyListCache();
          }}
        />

        {/* Follow-up Question Modal */}
        <AnimatePresence>
          {showQuestionModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
              onClick={() => setShowQuestionModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-[#491B6D]">추가 질문하기</h3>
                  <button
                    onClick={() => setShowQuestionModal(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <p className="text-sm text-gray-600">
                  이 문제에 대해 궁금한 점을 AI 튜터에게 물어보세요.
                </p>

                <textarea
                  ref={questionInputRef}
                  value={followUpQuestion}
                  onChange={(e) => setFollowUpQuestion(e.target.value)}
                  placeholder="예: 3번 선택지가 왜 틀린 건지 더 자세히 설명해줘"
                  className="w-full p-4 border border-gray-200 rounded-2xl focus:border-[#491B6D] focus:outline-none resize-none min-h-[120px] text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      handleAskFollowUpQuestion();
                    }
                  }}
                />

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowQuestionModal(false)}
                    className="flex-1 p-3 border border-gray-200 rounded-2xl text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleAskFollowUpQuestion}
                    disabled={!followUpQuestion.trim()}
                    className="flex-1 p-3 bg-gradient-to-r from-[#491B6D] to-[#5E2278] rounded-2xl text-white font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    AI 튜터에게 질문하기
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
