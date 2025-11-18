import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { renderMessageText } from '../common/markdown';

interface AnalysisBoxProps {
  analysis: string;
}

export function AnalysisBox({ analysis }: AnalysisBoxProps) {
  const [expandedSentences, setExpandedSentences] = useState<Set<number>>(new Set([0]));

  if (!analysis) {
    return null;
  }

  // 문장별로 파싱
  const parseSentences = (text: string) => {
    const sentences: Array<{
      number: string;
      english: string;
      translation: string;
      paraphrase: string;
      summary: string;
    }> = [];

    // ① ② ③ 등으로 시작하는 부분을 기준으로 분할
    const parts = text.split(/(?=①|②|③|④|⑤|⑥|⑦|⑧|⑨|⑩)/);

    parts.forEach((part) => {
      if (!part.trim()) return;

      const lines = part.trim().split('\n').filter(Boolean);
      if (lines.length < 2) return;

      const numberMatch = lines[0].match(/^(①|②|③|④|⑤|⑥|⑦|⑧|⑨|⑩)/);
      if (!numberMatch) return;

      const sentence: any = {
        number: numberMatch[1],
        english: '',
        translation: '',
        paraphrase: '',
        summary: ''
      };

      lines.forEach((line) => {
        if (line.startsWith(sentence.number)) {
          sentence.english = line.replace(sentence.number, '').trim();
        } else if (line.startsWith('=>')) {
          sentence.paraphrase = line.replace('=>', '').trim();
        } else if (line.includes('한 줄 요약:')) {
          sentence.summary = line.replace(/.*한 줄 요약:\s*/, '').replace(/[()]/g, '').trim();
        } else if (!sentence.translation && line.includes('/')) {
          sentence.translation = line.trim();
        }
      });

      if (sentence.english) {
        sentences.push(sentence);
      }
    });

    return sentences;
  };

  const sentences = parseSentences(analysis);

  const toggleSentence = (index: number) => {
    const newExpanded = new Set(expandedSentences);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSentences(newExpanded);
  };

  // 파싱이 안되면 원본 텍스트 표시
  if (sentences.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-blue-100 p-4">
        <h3 className="text-lg font-bold text-[#491B6D] mb-3">지문 분석</h3>
        <div className="space-y-2">
          {renderMessageText(analysis, {
            paragraphClassName: 'text-sm text-gray-700 leading-relaxed mb-2 last:mb-0',
            listClassName: 'list-disc pl-4 space-y-1 text-sm text-gray-700',
            boldClassName: 'font-semibold text-[#491B6D]',
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-blue-100 p-4 space-y-3">
      <h3 className="text-lg font-bold text-[#491B6D]">지문 분석</h3>

      <div className="space-y-2">
        {sentences.map((sentence, index) => (
          <div
            key={index}
            className="border border-gray-200 rounded-xl overflow-hidden"
          >
            <button
              onClick={() => toggleSentence(index)}
              className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  {sentence.number}
                </span>
                <span className="text-sm text-gray-700 text-left line-clamp-1">
                  {sentence.english.split('/')[0]}...
                </span>
              </div>
              {expandedSentences.has(index) ? (
                <ChevronUp className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </button>

            <AnimatePresence>
              {expandedSentences.has(index) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 space-y-3 bg-white">
                    <div>
                      <div className="text-xs font-semibold text-blue-600 mb-1">영문</div>
                      <p className="text-sm text-gray-800">{sentence.english}</p>
                    </div>
                    {sentence.translation && (
                      <div>
                        <div className="text-xs font-semibold text-green-600 mb-1">직역</div>
                        <div className="space-y-1">
                          {renderMessageText(sentence.translation, {
                            paragraphClassName: 'text-sm text-gray-700 leading-relaxed mb-1 last:mb-0',
                            listClassName: 'list-disc pl-4 space-y-1 text-sm text-gray-700',
                            boldClassName: 'font-semibold text-[#15803d]',
                          })}
                        </div>
                      </div>
                    )}
                    {sentence.paraphrase && (
                      <div>
                        <div className="text-xs font-semibold text-purple-600 mb-1">의역</div>
                        <div className="space-y-1">
                          {renderMessageText(sentence.paraphrase, {
                            paragraphClassName: 'text-sm text-gray-700 leading-relaxed mb-1 last:mb-0',
                            listClassName: 'list-disc pl-4 space-y-1 text-sm text-gray-700',
                            boldClassName: 'font-semibold text-[#6D28D9]',
                          })}
                        </div>
                      </div>
                    )}
                    {sentence.summary && (
                      <div className="bg-yellow-50 p-2 rounded-lg">
                        <div className="text-xs font-semibold text-yellow-700 mb-1">한 줄 요약</div>
                        <div className="space-y-1">
                          {renderMessageText(sentence.summary, {
                            paragraphClassName: 'text-sm text-yellow-900 leading-relaxed mb-0',
                            listClassName: 'list-disc pl-4 space-y-1 text-sm text-yellow-900',
                            boldClassName: 'font-semibold text-[#92400E]',
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}
