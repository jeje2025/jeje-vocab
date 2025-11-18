import { motion, AnimatePresence } from 'motion/react';
import { Home, CheckCircle, Circle } from 'lucide-react';
import { BackButton } from '../BackButton';
import type { ComponentType } from 'react';
import type { Stage, Question } from '../GameMapQuizScreen';

interface NormalQuizLayoutProps {
  stage?: Stage;
  currentStageId: number;
  currentQuestionIndex: number;
  totalQuestions: number;
  question: Question;
  selectedAnswers: number[];
  showFeedback: boolean;
  lastAnswerCorrect: boolean | null;
  isMultiSelect: boolean;
  isSentenceQuestion: boolean;
  sentenceTranslationVisible: boolean;
  showConfetti: boolean;
  ConfettiComponent: ComponentType;
  onBack: () => void;
  onBackToHome?: () => void;
  onAnswerSelect: (optionIndex: number) => void;
  onToggleSentenceTranslation: () => void;
  onSubmitAnswer: () => void;
  journeyName: string;
  wordCount: number;
  isStarredVocabulary: boolean;
}

export function NormalQuizLayout({
  stage,
  currentStageId,
  currentQuestionIndex,
  totalQuestions,
  question,
  selectedAnswers,
  showFeedback,
  lastAnswerCorrect,
  isMultiSelect,
  isSentenceQuestion,
  sentenceTranslationVisible,
  showConfetti,
  ConfettiComponent,
  onBack,
  onBackToHome,
  onAnswerSelect,
  onToggleSentenceTranslation,
  onSubmitAnswer,
  journeyName,
  wordCount,
  isStarredVocabulary
}: NormalQuizLayoutProps) {
  const headerAccent = isStarredVocabulary ? '#78350F' : '#091A7A';
  const subAccent = isStarredVocabulary ? '#D97706' : '#7C3AED';

  return (
    <div className="h-full bg-transparent overflow-y-auto">
      {showConfetti && <ConfettiComponent />}

      <div className="max-w-md mx-auto w-full px-4 py-4 space-y-4">
        <div
          className={`rounded-3xl p-4 shadow-card border border-white/40 ${
            isStarredVocabulary
              ? 'bg-gradient-to-b from-[#FFFBEB]/90 via-[#FEF3C7]/80 to-white/90'
              : 'bg-gradient-to-b from-[#E9D5FF]/90 via-[#E0E7FF]/80 to-white/90'
          }`}
        >
          <div className="flex items-center gap-3">
            <BackButton onClick={onBack} />

            <div className="flex-1 text-center space-y-0.5">
              <h1 className="text-lg font-bold" style={{ color: headerAccent }}>
                {journeyName}
              </h1>
              <p className="text-xs font-medium" style={{ color: subAccent }}>
                {wordCount}개의 단어
              </p>
            </div>

            {onBackToHome ? (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onBackToHome}
                className="w-10 h-10 bg-white/95 backdrop-blur-xl rounded-full flex items-center justify-center shadow-card border border-white/60"
              >
                <Home className="w-5 h-5" style={{ color: headerAccent }} />
              </motion.button>
            ) : (
              <div className="w-10 h-10" />
            )}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white/95 backdrop-blur-xl rounded-3xl p-5 shadow-card border border-white/60"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#091A7A] to-[#4F8EFF] rounded-2xl flex items-center justify-center shadow-md">
              <div className="w-6 h-6 text-white flex items-center justify-center">
                {stage?.icon}
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#091A7A]">{stage?.title}</p>
              <p className="text-xs text-[#4F8EFF] mt-0.5">
                Stage {currentStageId} • Question {currentQuestionIndex + 1} / {totalQuestions}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
                className="h-full bg-gradient-to-r from-[#091A7A] to-[#4F8EFF] rounded-full"
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
          </div>
        </motion.div>

        <motion.div
          key={currentQuestionIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white/95 backdrop-blur-xl rounded-3xl p-5 shadow-card border border-white/60"
        >
          <div className="space-y-3">
            <p className="text-xs font-semibold text-[#7C3AED] text-center">
              Question {currentQuestionIndex + 1}
            </p>
            <h2 className="text-base font-semibold text-[#091A7A] text-center leading-relaxed">
              {question.question}
            </h2>

            {isSentenceQuestion && question.sentenceData && (
              <div className="space-y-2 text-center">
                <p className="text-sm font-semibold text-[#1E1B4B] leading-relaxed">
                  {sentenceTranslationVisible && question.sentenceData.translation
                    ? question.sentenceData.translation
                    : question.sentenceData.english}
                </p>
                {question.sentenceData.translation && (
                  <button
                    onClick={onToggleSentenceTranslation}
                    className="mx-auto px-3 py-1.5 rounded-full bg-[#F4F4FF] text-[#5B21B6] text-xs font-semibold shadow-inner"
                  >
                    {sentenceTranslationVisible ? '영어 보기' : '한글 보기'}
                  </button>
                )}
              </div>
            )}
          </div>
        </motion.div>

        <div className={isMultiSelect ? 'grid grid-cols-2 gap-3' : 'space-y-3'}>
          {question.options.map((option, index) => {
            const isChosen = selectedAnswers.includes(index);
            const isCorrectOption =
              question.correctAnswers?.includes(index) ||
              (typeof question.correctAnswer === 'number' && question.correctAnswer === index);

            let cardStyle = 'bg-white/95 border-white/60';
            let textColor = 'text-[#091A7A]';
            let iconBg = 'bg-gray-100 text-gray-500';

            if (showFeedback) {
              if (isCorrectOption) {
                cardStyle = 'bg-emerald-50/95 border-emerald-200/60';
                textColor = 'text-emerald-700';
                iconBg = 'bg-emerald-100 text-emerald-600';
              } else if (isChosen) {
                cardStyle = 'bg-red-50/90 border-red-200/60';
                textColor = 'text-red-700';
                iconBg = 'bg-red-100 text-red-600';
              }
            } else if (isChosen) {
              cardStyle = 'bg-[#091A7A]/10 border-[#091A7A]/20';
              textColor = 'text-[#091A7A]';
              iconBg = 'bg-[#091A7A] text-white';
            }

            return (
              <motion.button
                key={index}
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.05 }}
                whileHover={{ scale: showFeedback ? 1 : 1.01 }}
                whileTap={{ scale: showFeedback ? 1 : 0.98 }}
                onClick={() => onAnswerSelect(index)}
                disabled={showFeedback}
                className={`w-full p-3 rounded-2xl backdrop-blur-xl border transition-all duration-300 text-left shadow-sm ${cardStyle}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-2xl flex items-center justify-center font-semibold text-sm ${iconBg}`}>
                    {String.fromCharCode(65 + index)}
                  </div>
                  <span className={`font-medium flex-1 text-sm ${textColor}`}>{option}</span>
                  {showFeedback && isCorrectOption && (
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>

        <AnimatePresence>
          {showFeedback && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ delay: 0.2 }}
              className={`p-5 rounded-2xl backdrop-blur-xl border shadow-card ${
                lastAnswerCorrect ? 'bg-emerald-50/95 border-emerald-200/60' : 'bg-red-50/95 border-red-200/60'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    lastAnswerCorrect ? 'bg-emerald-100' : 'bg-red-100'
                  }`}
                >
                  {lastAnswerCorrect ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Circle className="w-4 h-4 text-red-600" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className={`font-semibold text-sm mb-1 ${
                    lastAnswerCorrect ? 'text-emerald-700' : 'text-red-700'
                  }`}>
                    {lastAnswerCorrect ? 'Excellent! +10 XP' : 'Not quite right'}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{question.explanation}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!showFeedback && isMultiSelect && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="pt-1"
          >
            <button
              onClick={onSubmitAnswer}
              disabled={!selectedAnswers.length}
              className={`w-full py-3 rounded-2xl font-semibold shadow-card border transition-all duration-300 ${
                selectedAnswers.length
                  ? 'bg-gradient-to-r from-[#7C3AED] to-[#A78BFA] text-white border-transparent'
                  : 'bg-white/70 text-gray-400 border-gray-200 cursor-not-allowed'
              }`}
            >
              {selectedAnswers.length ? '정답 제출하기' : '답안을 선택하세요'}
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
