import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { renderMessageText } from '../common/markdown';

const stripEnKrMarkers = (text: string) => {
  return text
    .replace(/\[EN\]/gi, '')
    .replace(/\[KR\]/gi, '')
    .replace(/[ ]{2,}/g, ' ')
    .trim();
};

interface AnalysisBoxProps {
  analysis: string;
}

interface OverallSummary {
  material: string;
  subject: string;
  mainPoint: string;
  threeLine: string[];
  background: string;
}

export function AnalysisBox({ analysis }: AnalysisBoxProps) {
  const [expandedSentences, setExpandedSentences] = useState<Set<number>>(new Set([0]));
  const [overallExpanded, setOverallExpanded] = useState<boolean>(true);

  if (!analysis) {
    return null;
  }

  const parseOverallSummary = (text: string): OverallSummary | null => {
    const summaryMatch = text.match(/\[전체 요약\]([\s\S]*?)(?=\[문장별 분석\]|$)/i);
    if (!summaryMatch) return null;

    const summaryText = summaryMatch[1].trim();
    const summary: OverallSummary = {
      material: '',
      subject: '',
      mainPoint: '',
      threeLine: [],
      background: ''
    };

    // Parse 소재
    const materialMatch = summaryText.match(/소재:\s*(.+?)(?=\n요지:|$)/i);
    if (materialMatch) summary.material = materialMatch[1].trim();

    // Parse 요지 (can be multi-line)
    const mainPointMatch = summaryText.match(/요지:\s*([\s\S]*?)(?=\n3줄 요약:|$)/i);
    if (mainPointMatch) summary.mainPoint = mainPointMatch[1].trim();

    // Parse 3줄 요약
    const threeLineMatch = summaryText.match(/3줄 요약:([\s\S]*?)(?=\n주제:|$)/i);
    if (threeLineMatch) {
      const lines = threeLineMatch[1].split('\n')
        .map(l => l.trim())
        .filter(l => l.startsWith('-') || l.startsWith('•'))
        .map(l => l.replace(/^[-•]\s*/, '').trim())
        .filter(Boolean);
      summary.threeLine = lines;
    }

    // Parse 주제 (this is now the one-line summary)
    const subjectMatch = summaryText.match(/주제:\s*(.+?)(?=\n배경지식:|$)/i);
    if (subjectMatch) summary.subject = subjectMatch[1].trim();

    // Parse 배경지식
    const backgroundMatch = summaryText.match(/배경지식:\s*([\s\S]+?)$/i);
    if (backgroundMatch) summary.background = backgroundMatch[1].trim();

    return summary;
  };

  const parseSentences = (text: string) => {
    const sentences: Array<{
      number: string;
      english: string;
      translation: string;
      paraphrase: string;
      summary: string;
    }> = [];

    // Extract only the sentence analysis section
    const sentenceSection = text.match(/\[문장별 분석\]([\s\S]*?)$/i);
    const textToParse = sentenceSection ? sentenceSection[1] : text;

    // Clean up markdown and extra formatting
    const cleanText = textToParse
      .replace(/\*\*/g, '') // Remove bold markdown
      .replace(/\*/g, '') // Remove italic markdown
      .replace(/^#+\s+/gm, '') // Remove markdown headers
      .trim();

    // Split by circled numbers (more flexible pattern)
    const parts = cleanText.split(/(?=①|②|③|④|⑤|⑥|⑦|⑧|⑨|⑩)/);

    parts.forEach((part) => {
      if (!part.trim()) return;

      const lines = part.trim().split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length < 1) return;

      // Find the circled number (more flexible)
      const numberMatch = lines[0].match(/^(①|②|③|④|⑤|⑥|⑦|⑧|⑨|⑩)/);
      if (!numberMatch) return;

      // Convert circled number to regular number
      const circledToRegular: Record<string, string> = {
        '①': '1', '②': '2', '③': '3', '④': '4', '⑤': '5',
        '⑥': '6', '⑦': '7', '⑧': '8', '⑨': '9', '⑩': '10'
      };

      const sentence: any = {
        number: circledToRegular[numberMatch[1]] || numberMatch[1],
        english: '',
        translation: '',
        paraphrase: '',
        summary: ''
      };

      // Collect all text into single strings for each field
      let currentField = '';

      lines.forEach((line, idx) => {
        // Skip the number line
        if (idx === 0 && line.startsWith(sentence.number)) {
          return;
        }

        // Detect field markers
        if (line.includes('[EN]') || line.startsWith('[EN]')) {
          currentField = 'english';
          const content = line.replace(/\[EN\]/gi, '').trim();
          if (content) sentence.english += (sentence.english ? ' ' : '') + content;
        } else if (line.includes('[KR]') || line.startsWith('[KR]')) {
          currentField = 'translation';
          const content = line.replace(/\[KR\]/gi, '').trim();
          if (content) sentence.translation += (sentence.translation ? ' ' : '') + content;
        } else if (line.startsWith('=>') || line.startsWith('⇒')) {
          currentField = 'paraphrase';
          const content = line.replace(/^[=>⇒]+\s*/, '').trim();
          if (content) sentence.paraphrase += (sentence.paraphrase ? ' ' : '') + content;
        } else if (line.includes('한 줄 요약') || line.includes('요약:')) {
          currentField = 'summary';
          const content = line
            .replace(/.*한 줄 요약:\s*/i, '')
            .replace(/.*요약:\s*/i, '')
            .replace(/^[()（）]+/, '')
            .replace(/[()（）]+$/, '')
            .trim();
          if (content) sentence.summary += (sentence.summary ? ' ' : '') + content;
        } else if (currentField && line.trim()) {
          // Continue previous field
          const content = line.trim();
          if (currentField === 'english') sentence.english += ' ' + content;
          else if (currentField === 'translation') sentence.translation += ' ' + content;
          else if (currentField === 'paraphrase') sentence.paraphrase += ' ' + content;
          else if (currentField === 'summary') sentence.summary += ' ' + content;
        }
      });

      // Clean up extra spaces
      sentence.english = sentence.english.replace(/\s+/g, ' ').trim();
      sentence.translation = sentence.translation.replace(/\s+/g, ' ').trim();
      sentence.paraphrase = sentence.paraphrase.replace(/\s+/g, ' ').trim();
      sentence.summary = sentence.summary.replace(/\s+/g, ' ').trim();

      // Only add if we have at least English text
      if (sentence.english) {
        sentences.push(sentence);
      }
    });

    return sentences;
  };

  const overallSummary = parseOverallSummary(analysis);
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

  if (sentences.length === 0 && !overallSummary) {
    return (
      <div className="bg-white rounded-2xl border border-blue-100 p-4 space-y-2">
        <h3 className="text-lg font-bold text-[#491B6D] mb-2">지문 분석</h3>
        <div className="space-y-2">
          {renderMessageText(stripEnKrMarkers(analysis), {
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
      <div className="space-y-3">
        {overallSummary && (
          <motion.div
            layout
            className="border border-purple-200 rounded-2xl bg-gradient-to-br from-purple-50 to-white shadow-sm overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setOverallExpanded(!overallExpanded)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-purple-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">📋</span>
                <p className="text-sm font-bold text-gray-900">전체 요약</p>
              </div>
              {overallExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
              )}
            </button>
            <AnimatePresence>
              {overallExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-4 pb-4 pt-2 space-y-3 bg-white"
                >
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                      <span>🗂️</span> 분야 & 소재
                    </p>
                    <div className="bg-purple-50 rounded-xl p-3 border border-purple-100">
                      <p className="text-sm text-gray-800 leading-relaxed font-medium">{overallSummary.material}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                      <span>🪧</span> 지문 요지
                    </p>
                    <div className="bg-purple-50 rounded-xl p-3 border border-purple-100">
                      <p className="text-sm text-gray-800 leading-relaxed">{overallSummary.mainPoint}</p>
                      {overallSummary.threeLine.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {overallSummary.threeLine.map((line, idx) => (
                            <li key={idx} className="text-sm text-gray-700 leading-relaxed flex items-start gap-2">
                              <span className="text-purple-500 flex-shrink-0">•</span>
                              <span>{line}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  {overallSummary.subject && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                        <span>☝🏻</span> 한줄 요약
                      </p>
                      <div className="bg-gradient-to-br from-purple-100 to-purple-50 border border-purple-200 p-3 rounded-xl">
                        <p className="text-sm text-purple-900 leading-relaxed font-semibold">{overallSummary.subject}</p>
                      </div>
                    </div>
                  )}

                  {overallSummary.background && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                        <span>💡</span> 배경지식
                      </p>
                      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 p-3 rounded-xl">
                        <p className="text-sm text-indigo-900 leading-relaxed">{overallSummary.background}</p>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {sentences.map((sentence, index) => (
          <motion.div
            key={index}
            layout
            className="border border-gray-200 rounded-2xl bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow"
          >
            <button
              type="button"
              onClick={() => toggleSentence(index)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="w-8 h-8 bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-sm">
                  {sentence.number}
                </span>
                <p className="text-sm text-gray-700 font-medium truncate">{sentence.english}</p>
              </div>
              {expandedSentences.has(index) ? (
                <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
              )}
            </button>
            <AnimatePresence>
              {expandedSentences.has(index) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-4 pb-4 pt-2 space-y-3 bg-gray-50"
                >
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-[#7C3AED] uppercase tracking-wider">끊어읽기</p>
                    <div className="bg-white rounded-xl p-3 border border-gray-200">
                      <p className="text-sm text-gray-900 leading-relaxed font-medium whitespace-pre-line">{sentence.english}</p>
                      {sentence.translation && (
                        <p className="text-sm text-gray-600 leading-relaxed mt-2 whitespace-pre-line">{sentence.translation}</p>
                      )}
                    </div>
                  </div>
                  {sentence.paraphrase && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-[#8B5CF6] uppercase tracking-wider">의역</p>
                      <div className="bg-white rounded-xl p-3 border border-gray-200">
                        {renderMessageText(sentence.paraphrase, {
                          paragraphClassName: 'text-sm text-gray-700 leading-relaxed mb-1 last:mb-0',
                          listClassName: 'list-disc pl-4 space-y-1 text-sm text-gray-700',
                          boldClassName: 'font-semibold text-[#7C3AED]',
                        })}
                      </div>
                    </div>
                  )}
                  {sentence.summary && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-[#D97706] uppercase tracking-wider">한 줄 요약</p>
                      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 p-3 rounded-xl">
                        <div className="text-sm text-amber-900 leading-relaxed font-medium">
                          {renderMessageText(sentence.summary, {
                            paragraphClassName: 'text-sm text-amber-900 leading-relaxed mb-1 last:mb-0',
                            listClassName: 'list-disc pl-4 space-y-1 text-sm text-amber-900',
                            boldClassName: 'font-bold text-amber-900',
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
