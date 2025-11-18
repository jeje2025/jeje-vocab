import { useState } from 'react';
import { motion } from 'motion/react';
import { Camera, BookOpen, MessageSquare, Lightbulb, Sparkles, Check, Loader2 } from 'lucide-react';
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

interface TextExtractorScreenProps {
  onBack: () => void;
}

interface AnalysisResults {
  vocabulary?: Array<{ word: string; pos: string; meaning: string; level: string }>;
  analysis?: string;
  explanation?: string;
}

export function TextExtractorScreen({ onBack }: TextExtractorScreenProps) {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [inputText, setInputText] = useState('');
  const [answerKey, setAnswerKey] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [results, setResults] = useState<AnalysisResults | null>(null);
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
    input.capture = 'environment';
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
            setInputText(data.text);
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
    setResults(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        toast.error('로그인이 필요합니다.');
        return;
      }

      toast.loading('AI가 분석 중입니다...', { id: 'analysis-progress' });

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/text-analyzer/analyze`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text: inputText,
            options: {
              vocabulary: selectedOptions.includes('word'),
              analysis: selectedOptions.includes('translation'),
              explanation: selectedOptions.includes('explanation')
            },
            answerKey: answerKey
          })
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || '분석 처리 실패');
      }

      setResults(data);
      toast.success('분석이 완료되었습니다!', { id: 'analysis-progress' });
    } catch (error: any) {
      console.error('Analysis error:', error);
      toast.error(error.message || '분석 중 오류가 발생했습니다.', { id: 'analysis-progress' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <StandardHeader
        onBack={onBack}
        title="Passage Extractor"
        subtitle="단어 추출, 문장 해석, 문제 해설을 도와줍니다"
      />

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-8">
        <div className="pt-2">
          {/* Stats Cards - 3 Column Grid */}
          <div className="grid grid-cols-3 gap-3 mb-4">
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
            className="bg-white/95 backdrop-blur-xl border border-white/50 p-6 shadow-xl rounded-3xl"
          >
            {/* Header with Camera Button */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[#091A7A]" style={{ fontSize: '16px', fontWeight: 700 }}>
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

            {/* Answer Key Input */}
            <div className="mt-4">
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
          </motion.div>

          {/* Submit Button */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSubmit}
            disabled={!inputText.trim() || selectedOptions.length === 0 || isProcessing}
            className={`w-full p-5 shadow-lg transition-all mt-4 rounded-2xl ${
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
                />
              )}

              {results.analysis && (
                <AnalysisBox analysis={results.analysis} />
              )}

              {results.explanation && (
                <ExplanationBox explanation={results.explanation} />
              )}
            </motion.div>
          )}
        </div>
      </div>

      <WordBasketBar
        count={basketCount}
        onReview={() => setShowBasketModal(true)}
        onClear={() => {
          if (basketCount > 0) {
            clearBasket();
            toast.info('선택한 단어를 비웠어요.');
          }
        }}
      />
      <WordBasketModal
        open={showBasketModal}
        onClose={() => setShowBasketModal(false)}
        words={basketWords}
        onRemoveWord={removeBasketWord}
        onClear={() => {
          clearBasket();
          toast.info('선택한 단어를 모두 해제했어요.');
        }}
        onActionComplete={() => setShowBasketModal(false)}
      />
    </div>
  );
}
