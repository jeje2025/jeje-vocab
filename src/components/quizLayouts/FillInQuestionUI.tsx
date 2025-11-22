import { useState } from 'react';
import { motion } from 'motion/react';
import { Lightbulb, Check } from 'lucide-react';

interface FillInQuestionUIProps {
  question: {
    id: string;
    text: string;
    type: 'fill-in-word' | 'fill-in-meaning';
    correctAnswer: string;
    explanation?: string;
    word?: any;
  };
  showFeedback: boolean;
  lastAnswerCorrect: boolean | null;
  aiFeedback?: string | null;
  onSubmitAnswer: (userAnswer: string) => void;
}

export function FillInQuestionUI({
  question,
  showFeedback,
  lastAnswerCorrect,
  aiFeedback,
  onSubmitAnswer
}: FillInQuestionUIProps) {
  const [userInput, setUserInput] = useState('');
  const [showHint, setShowHint] = useState(false);

  const isFillInWord = question.type === 'fill-in-word'; // KR → EN
  const isFillInMeaning = question.type === 'fill-in-meaning'; // EN → KR

  const handleSubmit = () => {
    if (!userInput.trim()) return;
    onSubmitAnswer(userInput.trim());
    setUserInput(''); // Clear input after submission
    setShowHint(false); // Hide hint after submission
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !showFeedback && userInput.trim()) {
      handleSubmit();
    }
  };

  const getHintText = () => {
    if (!question.word || !isFillInWord) return '';
    const answer = question.correctAnswer as string;
    if (answer.length <= 2) return answer[0];
    return answer.substring(0, 2);
  };

  return (
    <div className="space-y-4">
      {/* Input Field */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-3"
      >
        <div className="relative">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={showFeedback}
            placeholder={isFillInWord ? "영어 단어를 입력하세요" : "한글 뜻을 입력하세요"}
            className={`w-full px-4 py-3 rounded-2xl border-2 text-base font-medium transition-all duration-300 ${
              showFeedback
                ? lastAnswerCorrect
                  ? 'bg-emerald-50/95 border-emerald-300 text-emerald-700'
                  : 'bg-red-50/95 border-red-300 text-red-700'
                : 'bg-white/95 border-[#A78BFA] text-[#091A7A] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20'
            } outline-none`}
            autoFocus
          />
        </div>

        {/* Hint Button (only for KR → EN) */}
        {isFillInWord && !showFeedback && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            onClick={() => setShowHint(!showHint)}
            className="flex items-center gap-2 mx-auto px-4 py-2 rounded-full bg-[#F4F4FF] text-[#5B21B6] text-xs font-semibold shadow-inner hover:bg-[#EDE9FE] transition-colors"
          >
            <Lightbulb className="w-4 h-4" />
            {showHint ? '힌트 숨기기' : '힌트 보기'}
          </motion.button>
        )}

        {/* Hint Display */}
        {isFillInWord && showHint && !showFeedback && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-xl bg-amber-50/95 border border-amber-200"
          >
            <p className="text-sm text-amber-800 text-center">
              <span className="font-semibold">힌트:</span> {getHintText()}...
            </p>
          </motion.div>
        )}
      </motion.div>

      {/* Submit Button */}
      {!showFeedback && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <button
            onClick={handleSubmit}
            disabled={!userInput.trim()}
            className={`w-full py-3 rounded-2xl font-semibold shadow-card border transition-all duration-300 flex items-center justify-center gap-2 ${
              userInput.trim()
                ? 'bg-gradient-to-r from-[#7C3AED] to-[#A78BFA] text-white border-transparent hover:shadow-lg'
                : 'bg-white/70 text-gray-400 border-gray-200 cursor-not-allowed'
            }`}
          >
            <Check className="w-5 h-5" />
            정답 제출하기
          </button>
        </motion.div>
      )}

      {/* Feedback */}
      {showFeedback && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`p-5 rounded-2xl backdrop-blur-xl border shadow-card ${
            lastAnswerCorrect ? 'bg-emerald-50/95 border-emerald-200/60' : 'bg-red-50/95 border-red-200/60'
          }`}
        >
          <div className="space-y-3">
            <h3 className={`font-semibold text-sm ${
              lastAnswerCorrect ? 'text-emerald-700' : 'text-red-700'
            }`}>
              {lastAnswerCorrect ? '정답이에요! 🎉' : '다시 한번 생각해봐요'}
            </h3>

            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                <span className="font-semibold">입력한 답:</span> {userInput}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-semibold">정답 예시:</span> {question.correctAnswer}
              </p>
            </div>

            {/* AI Feedback for EN→KR mode */}
            {aiFeedback && question.type === 'fill-in-meaning' && (
              <div className="pt-2 border-t border-gray-200 mt-2">
                <p className="text-xs text-gray-500 font-semibold mb-1">AI 채점 피드백:</p>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {aiFeedback}
                </p>
              </div>
            )}

            {question.explanation && !aiFeedback && question.type !== 'fill-in-meaning' && (
              <p className="text-sm text-gray-600 leading-relaxed pt-2 border-t border-gray-200">
                {question.explanation}
              </p>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
