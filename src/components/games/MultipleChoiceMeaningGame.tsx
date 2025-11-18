import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, X, Target, Trophy, Sparkles } from 'lucide-react';

interface MultipleChoiceMeaningGameProps {
  words: Array<{
    id: string;
    word: string;
    meaning: string;
  }>;
  mode: 'word-to-meaning' | 'meaning-to-word';
  onComplete: (score: number, correctCount: number) => void;
  onWrongAnswer?: (wordId: string) => void;
}

interface Question {
  id: string;
  prompt: string;
  wordId: string;
  options: string[];
  correctAnswer: number;
}

export function MultipleChoiceMeaningGame({ 
  words, 
  mode, 
  onComplete, 
  onWrongAnswer 
}: MultipleChoiceMeaningGameProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  useEffect(() => {
    generateQuestions();
  }, [words, mode]);

  const generateQuestions = () => {
    // Use up to 10 words
    const gameWords = words.slice(0, Math.min(10, words.length));
    
    const quizQuestions: Question[] = gameWords.map(word => {
      // Get 3 wrong answers
      const wrongAnswers = words
        .filter(w => w.id !== word.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
      
      let prompt: string;
      let correctOption: string;
      let wrongOptions: string[];
      
      if (mode === 'word-to-meaning') {
        prompt = word.word;
        correctOption = word.meaning;
        wrongOptions = wrongAnswers.map(w => w.meaning);
      } else {
        prompt = word.meaning;
        correctOption = word.word;
        wrongOptions = wrongAnswers.map(w => w.word);
      }
      
      const allOptions = [correctOption, ...wrongOptions].sort(() => Math.random() - 0.5);
      const correctIndex = allOptions.indexOf(correctOption);
      
      return {
        id: `q-${word.id}`,
        prompt,
        wordId: word.id,
        options: allOptions,
        correctAnswer: correctIndex
      };
    });
    
    setQuestions(quizQuestions);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowFeedback(false);
    setScore(0);
    setCorrectCount(0);
  };

  const handleAnswer = (answerIndex: number) => {
    if (showFeedback) return;
    
    const currentQuestion = questions[currentIndex];
    setSelectedAnswer(answerIndex);
    setShowFeedback(true);
    
    if (answerIndex === currentQuestion.correctAnswer) {
      // Correct!
      setScore(prev => prev + 1);
      setCorrectCount(prev => prev + 1);
    } else {
      // Wrong!
      if (onWrongAnswer) {
        onWrongAnswer(currentQuestion.wordId);
      }
    }
    
    setTimeout(() => {
      if (currentIndex + 1 >= questions.length) {
        // Game complete
        onComplete(score + (answerIndex === currentQuestion.correctAnswer ? 1 : 0), 
                   correctCount + (answerIndex === currentQuestion.correctAnswer ? 1 : 0));
      } else {
        setCurrentIndex(prev => prev + 1);
        setSelectedAnswer(null);
        setShowFeedback(false);
      }
    }, 1500);
  };

  if (questions.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-pink-50">
        <div className="text-center">
          <p style={{ color: '#8B5CF6' }}>Loading questions...</p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-purple-50 via-white to-pink-50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl flex items-center justify-center">
            <Target className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg" style={{ fontWeight: 700, color: '#491B6D' }}>
              {mode === 'word-to-meaning' ? '단어 → 뜻' : '뜻 → 단어'}
            </h2>
            <p className="text-xs" style={{ color: '#8B5CF6' }}>
              정답을 선택하세요
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl" style={{ fontWeight: 800, color: '#491B6D' }}>
            {currentIndex + 1}/{questions.length}
          </div>
          <div className="text-xs" style={{ color: '#8B5CF6' }}>
            점수: {score}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-gradient-to-r from-purple-500 to-purple-700"
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Question */}
      <motion.div
        key={currentIndex}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 text-center"
      >
        <div className="inline-block bg-gradient-to-br from-purple-500 to-purple-700 text-white px-8 py-6 rounded-3xl shadow-2xl border-2 border-white/40">
          <h3 className="text-xl" style={{ fontWeight: 800 }}>
            {currentQuestion.prompt}
          </h3>
        </div>
      </motion.div>

      {/* Options */}
      <div className="flex-1 space-y-3">
        {currentQuestion.options.map((option, index) => {
          const isSelected = selectedAnswer === index;
          const isCorrect = index === currentQuestion.correctAnswer;
          const showResult = showFeedback;
          
          let bgClass = 'bg-white border-purple-200';
          if (showResult && isCorrect) {
            bgClass = 'bg-gradient-to-br from-emerald-400 to-emerald-600 border-emerald-300';
          } else if (showResult && isSelected && !isCorrect) {
            bgClass = 'bg-gradient-to-br from-red-400 to-red-600 border-red-300';
          } else if (isSelected) {
            bgClass = 'bg-purple-100 border-purple-400';
          }
          
          return (
            <motion.button
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              whileTap={{ scale: showFeedback ? 1 : 0.95 }}
              onClick={() => !showFeedback && handleAnswer(index)}
              disabled={showFeedback}
              className={`w-full p-5 rounded-2xl border-2 transition-all duration-200 ${bgClass}`}
              style={{ touchAction: 'manipulation' }}
            >
              <div className="flex items-center justify-between">
                <span 
                  className={`text-sm flex-1 text-left ${
                    showResult && (isCorrect || (isSelected && !isCorrect))
                      ? 'text-white'
                      : 'text-[#491B6D]'
                  }`}
                  style={{ fontWeight: 600 }}
                >
                  {option}
                </span>
                {showResult && isCorrect && (
                  <CheckCircle className="w-6 h-6 text-white ml-2 flex-shrink-0" />
                )}
                {showResult && isSelected && !isCorrect && (
                  <X className="w-6 h-6 text-white ml-2 flex-shrink-0" />
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Feedback Message */}
      <AnimatePresence>
        {showFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mt-4 text-center"
          >
            {selectedAnswer === currentQuestion.correctAnswer ? (
              <div className="flex items-center justify-center gap-2 text-emerald-600">
                <Sparkles className="w-5 h-5" />
                <span style={{ fontWeight: 700 }}>정답입니다! 🎉</span>
              </div>
            ) : (
              <div className="text-red-600">
                <span style={{ fontWeight: 700 }}>틀렸습니다. 다음 문제로!</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
