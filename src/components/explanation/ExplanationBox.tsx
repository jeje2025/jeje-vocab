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

  // 3단계로 파싱
  const parseSteps = (text: string) => {
    const steps: Array<{
      title: string;
      content: string;
      icon: any;
      color: string;
    }> = [];

    // Step 1 파싱
    const step1Match = text.match(/1️⃣\s*Step\s*1\)\s*빈칸\s*타게팅([\s\S]*?)(?=2️⃣|$)/i);
    if (step1Match) {
      steps.push({
        title: 'Step 1: 빈칸 타게팅',
        content: step1Match[1].trim(),
        icon: Target,
        color: 'bg-red-500'
      });
    }

    // Step 2 파싱
    const step2Match = text.match(/2️⃣\s*Step\s*2\)\s*근거\s*확인([\s\S]*?)(?=3️⃣|$)/i);
    if (step2Match) {
      steps.push({
        title: 'Step 2: 근거 확인',
        content: step2Match[1].trim(),
        icon: Search,
        color: 'bg-yellow-500'
      });
    }

    // Step 3 파싱
    const step3Match = text.match(/3️⃣\s*Step\s*3\)\s*보기\s*판단([\s\S]*?)$/i);
    if (step3Match) {
      steps.push({
        title: 'Step 3: 보기 판단',
        content: step3Match[1].trim(),
        icon: CheckCircle,
        color: 'bg-green-500'
      });
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
            <div
              key={index}
              className="border border-gray-200 rounded-xl overflow-hidden"
            >
              <button
                onClick={() => toggleStep(index)}
                className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 ${step.color} rounded-lg flex items-center justify-center`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-semibold text-gray-800">{step.title}</span>
                </div>
                {expandedSteps.has(index) ? (
                  <ChevronUp className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                )}
              </button>

              <AnimatePresence>
                {expandedSteps.has(index) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 bg-white space-y-2">
                      {renderMessageText(step.content, {
                        paragraphClassName: 'text-sm text-gray-700 leading-relaxed mb-2 last:mb-0',
                        listClassName: 'list-disc pl-4 space-y-1 text-sm text-gray-700',
                        boldClassName: 'font-semibold text-[#166534]',
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
