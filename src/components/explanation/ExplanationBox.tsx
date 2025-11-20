import { useState } from 'react';
import { ChevronDown, ChevronUp, Target, Search, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { renderMessageText } from '../common/markdown';

interface ExplanationBoxProps {
  explanation: string;
}

export function ExplanationBox({ explanation }: ExplanationBoxProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set([0, 1, 2]));

  if (!explanation) {
    return null;
  }

  // Map circled numbers to regular numbers for better visibility
  const circledToRegular: Record<string, string> = {
    '①': '1',
    '②': '2',
    '③': '3',
    '④': '4',
    '⑤': '5',
  };

  // Enhance content with styled numbers
  const enhanceContent = (content: string) => {
    // Replace circled numbers at the beginning of lines with styled versions
    return content.split('\n').map((line, idx) => {
      const trimmed = line.trim();
      const match = trimmed.match(/^([①②③④⑤])\s*(.*)/);

      if (match) {
        const regularNumber = circledToRegular[match[1]] || match[1];
        return (
          <div key={idx} className="mb-2 last:mb-0">
            <span className="inline-flex items-start gap-2">
              <span className="flex-shrink-0 font-bold text-[#7C3AED] text-base">
                {regularNumber}.
              </span>
              <span className="text-sm text-gray-700 leading-relaxed flex-1">{match[2]}</span>
            </span>
          </div>
        );
      }

      return <p key={idx} className="text-sm text-gray-700 leading-relaxed mb-2 last:mb-0">{line}</p>;
    }).filter(item => {
      // Filter out empty paragraphs
      if (typeof item === 'object' && 'props' in item && item.props.children === '') {
        return false;
      }
      return true;
    });
  };

  // 3단계로 파싱 (여러 형식 지원)
  const parseSteps = (text: string) => {
    const steps: Array<{
      title: string;
      content: string;
      icon: any;
      color: string;
      hasCircledNumbers?: boolean;
    }> = [];

    // Clean up markdown formatting
    const cleanText = text
      .replace(/\*\*/g, '') // Remove bold markdown
      .replace(/\*/g, '') // Remove italic markdown
      .replace(/^#+\s+/gm, '') // Remove markdown headers
      .trim();

    // Try multiple patterns for each step
    // Step 1 - 빈칸 타게팅
    const step1Patterns = [
      /1️⃣\s*Step\s*1\)\s*빈칸\s*타게팅([\s\S]*?)(?=2️⃣|$)/i,
      /Step\s*1[:\)]\s*빈칸\s*타게팅([\s\S]*?)(?=Step\s*2|$)/i,
      /1\.\s*빈칸\s*타게팅([\s\S]*?)(?=2\.|$)/i,
      /【\s*Step\s*1\s*】\s*빈칸\s*타게팅([\s\S]*?)(?=【\s*Step\s*2|$)/i,
    ];

    for (const pattern of step1Patterns) {
      const match = cleanText.match(pattern);
      if (match) {
        steps.push({
          title: 'Step 1: 빈칸 타게팅',
          content: match[1].trim(),
          icon: Target,
          color: 'bg-red-500'
        });
        break;
      }
    }

    // Step 2 - 근거 확인
    const step2Patterns = [
      /2️⃣\s*Step\s*2\)\s*근거\s*확인([\s\S]*?)(?=3️⃣|$)/i,
      /Step\s*2[:\)]\s*근거\s*확인([\s\S]*?)(?=Step\s*3|$)/i,
      /2\.\s*근거\s*확인([\s\S]*?)(?=3\.|$)/i,
      /【\s*Step\s*2\s*】\s*근거\s*확인([\s\S]*?)(?=【\s*Step\s*3|$)/i,
    ];

    for (const pattern of step2Patterns) {
      const match = cleanText.match(pattern);
      if (match) {
        steps.push({
          title: 'Step 2: 근거 확인',
          content: match[1].trim(),
          icon: Search,
          color: 'bg-yellow-500'
        });
        break;
      }
    }

    // Step 3 - 보기 판단
    const step3Patterns = [
      /3️⃣\s*Step\s*3\)\s*보기\s*판단([\s\S]*?)$/i,
      /Step\s*3[:\)]\s*보기\s*판단([\s\S]*?)$/i,
      /3\.\s*보기\s*판단([\s\S]*?)$/i,
      /【\s*Step\s*3\s*】\s*보기\s*판단([\s\S]*?)$/i,
    ];

    for (const pattern of step3Patterns) {
      const match = cleanText.match(pattern);
      if (match) {
        const content = match[1].trim();
        const hasCircledNumbers = /[①②③④⑤]/.test(content);
        steps.push({
          title: 'Step 3: 보기 판단',
          content: content,
          icon: CheckCircle,
          color: 'bg-green-500',
          hasCircledNumbers: hasCircledNumbers
        });
        break;
      }
    }

    return steps;
  };

  const steps = parseSteps(explanation);

  const toggleStep = (index: number) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSteps(newExpanded);
  };

  // 파싱이 안되면 원본 텍스트 표시
  if (steps.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-green-100 p-4">
        <h3 className="text-lg font-bold text-[#491B6D] mb-3">문제 해설</h3>
        <div className="space-y-2">
          {renderMessageText(explanation, {
            paragraphClassName: 'text-sm text-gray-700 leading-relaxed mb-2 last:mb-0',
            listClassName: 'list-disc pl-4 space-y-1 text-sm text-gray-700',
            boldClassName: 'font-semibold text-[#166534]',
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-green-100 p-4 space-y-3">
      <h3 className="text-lg font-bold text-[#491B6D]">문제 해설</h3>
      <div className="space-y-3">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <motion.div
              key={index}
              layout
              className={`border border-gray-100 rounded-2xl shadow-sm overflow-hidden`}
            >
              <button
                onClick={() => toggleStep(index)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                    <span className="text-white font-bold text-sm">{index + 1}</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800">{step.title}</p>
                </div>
                {expandedSteps.has(index) ? (
                  <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                )}
              </button>
              <AnimatePresence>
                {expandedSteps.has(index) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-4 pb-4 pt-2 bg-gray-50"
                  >
                    <div className="bg-white rounded-xl p-3 border border-gray-200">
                      {step.hasCircledNumbers ? (
                        enhanceContent(step.content)
                      ) : (
                        renderMessageText(step.content, {
                          paragraphClassName: 'text-sm text-gray-700 leading-relaxed mb-2 last:mb-0',
                          listClassName: 'list-disc pl-4 space-y-1 text-sm text-gray-700',
                          boldClassName: 'font-bold text-[#7C3AED]',
                        })
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
