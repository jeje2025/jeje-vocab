import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, CheckCircle, X, Trophy, Zap } from 'lucide-react';

interface SpeedQuizGameProps {
  words: Array<{
    id: string;
    word: string;
    meaning: string;
  }>;
  onComplete: (score: number, correctCount: number) => void;
  onWrongAnswer?: (wordId: string) => void;
}

interface QuizQuestion {
  id: string;
  word: string;
  wordId: string;
  options: string[];
  correctAnswer: number;
}

export function SpeedQuizGame({ words, onComplete, onWrongAnswer }: SpeedQuizGameProps) {
  const [gameStarted, setGameStarted] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [timePerQuestion] = useState(10); // 10 seconds per question
  const [timeLeft, setTimeLeft] = useState(10);
  const timerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (gameStarted && currentIndex < questions.length) {
      startQuestionTimer();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex, gameStarted]);

  const startQuestionTimer = () => {
    setTimeLeft(timePerQuestion);
    
    if (timerRef.current) clearInterval(timerRef.current);
    
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Time's up!
          if (timerRef.current) clearInterval(timerRef.current);
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleTimeout = () => {
    const currentQuestion = questions[currentIndex];
    if (onWrongAnswer && currentQuestion) {
      onWrongAnswer(currentQuestion.wordId);
    }
    
    setTimeout(() => {
      if (currentIndex + 1 >= questions.length) {
        endGame();
      } else {
        setCurrentIndex(prev => prev + 1);
        setSelectedAnswer(null);
        setShowFeedback(false);
      }
    }, 500);
  };

  const generateQuestions = () => {
    // Use up to 10 words
    const gameWords = words.slice(0, Math.min(10, words.length));
    
    const quizQuestions: QuizQuestion[] = gameWords.map(word => {
      // Get 3 wrong answers
      const wrongOptions = words
        .filter(w => w.id !== word.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map(w => w.meaning);
      
      const allOptions = [word.meaning, ...wrongOptions].sort(() => Math.random() - 0.5);
      const correctIndex = allOptions.indexOf(word.meaning);
      
      return {
        id: `q-${word.id}`,
        word: word.word,
        wordId: word.id,
        options: allOptions,
        correctAnswer: correctIndex
      };
    });
    
    setQuestions(quizQuestions);
  };

  const startGame = () => {
    generateQuestions();
    setGameStarted(true);
    setCurrentIndex(0);
    setScore(0);
    setCorrectCount(0);
    setSelectedAnswer(null);
    setShowFeedback(false);
  };

  const handleAnswer = (answerIndex: number) => {
    if (showFeedback) return;
    
    const currentQuestion = questions[currentIndex];
    setSelectedAnswer(answerIndex);
    setShowFeedback(true);
    
    if (timerRef.current) clearInterval(timerRef.current);
    
    if (answerIndex === currentQuestion.correctAnswer) {
      // Correct!
      const timeBonus = Math.floor(timeLeft * 2); // 2 points per second left
      setScore(prev => prev + 10 + timeBonus);
      setCorrectCount(prev => prev + 1);
    } else {
      // Wrong!
      if (onWrongAnswer) {
        onWrongAnswer(currentQuestion.wordId);
      }
    }
    
    setTimeout(() => {
      if (currentIndex + 1 >= questions.length) {
        endGame();
      } else {
        setCurrentIndex(prev => prev + 1);
        setSelectedAnswer(null);
        setShowFeedback(false);
      }
    }, 1200);
  };

  const endGame = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeout(() => {
      onComplete(score, correctCount);
    }, 500);
  };

  if (!gameStarted) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-orange-50 via-white to-yellow-50 p-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-3xl flex items-center justify-center shadow-2xl">
            <Zap className="w-12 h-12 text-white" />
          </div>
          
          <h1 className="text-2xl mb-3" style={{ fontWeight: 800, color: '#491B6D' }}>
            스피드 퀴즈
          </h1>
          
          <p className="text-sm mb-8" style={{ color: '#8B5CF6' }}>
            제한 시간 안에 정답을 골라주세요!<br />
            빠르게 맞출수록 높은 점수!
          </p>
          
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 mb-8 space-y-3 text-left max-w-xs mx-auto">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-orange-500" />
              </div>
              <div>
                <div className="text-xs" style={{ fontWeight: 700, color: '#491B6D' }}>문제당 10초</div>
                <div className="text-xs" style={{ color: '#8B5CF6' }}>빨리 답할수록 보너스 점수!</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Trophy className="w-4 h-4 text-yellow-500" />
              </div>
              <div>
                <div className="text-xs" style={{ fontWeight: 700, color: '#491B6D' }}>총 {Math.min(10, words.length)}문제</div>
                <div className="text-xs" style={{ color: '#8B5CF6' }}>정답 +10점 + 시간보너스</div>
              </div>
            </div>
          </div>
          
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={startGame}
            className="px-12 py-4 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-2xl shadow-xl"
          >
            <span style={{ fontWeight: 700 }}>게임 시작!</span>
          </motion.button>
        </motion.div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  if (!currentQuestion) return null;

  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-orange-50 via-white to-yellow-50 p-6">
      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs" style={{ fontWeight: 700, color: '#491B6D' }}>
            문제 {currentIndex + 1}/{questions.length}
          </span>
          <span className="text-xs" style={{ fontWeight: 700, color: '#EA580C' }}>
            점수: {score}
          </span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-gradient-to-r from-orange-500 to-yellow-500"
          />
        </div>
      </div>

      {/* Timer Circle */}
      <div className="flex justify-center mb-6">
        <div className="relative w-20 h-20">
          <svg className="w-20 h-20 transform -rotate-90">
            <circle
              cx="40"
              cy="40"
              r="35"
              stroke="#FED7AA"
              strokeWidth="6"
              fill="none"
            />
            <motion.circle
              cx="40"
              cy="40"
              r="35"
              stroke="#EA580C"
              strokeWidth="6"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 35}`}
              initial={{ strokeDashoffset: 0 }}
              animate={{ 
                strokeDashoffset: `${2 * Math.PI * 35 * (1 - timeLeft / timePerQuestion)}`
              }}
              transition={{ duration: 0.3 }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl" style={{ fontWeight: 800, color: '#EA580C' }}>
              {timeLeft}
            </span>
          </div>
        </div>
      </div>

      {/* Question */}
      <motion.div
        key={currentIndex}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 text-center"
      >
        <div className="inline-block bg-gradient-to-br from-orange-500 to-yellow-500 text-white px-8 py-4 rounded-3xl shadow-2xl">
          <h2 className="text-2xl" style={{ fontWeight: 800 }}>
            {currentQuestion.word}
          </h2>
        </div>
      </motion.div>

      {/* Options */}
      <div className="flex-1 space-y-3">
        {currentQuestion.options.map((option, index) => {
          const isSelected = selectedAnswer === index;
          const isCorrect = index === currentQuestion.correctAnswer;
          const showResult = showFeedback;
          
          let bgClass = 'bg-white border-orange-200';
          if (showResult && isCorrect) {
            bgClass = 'bg-gradient-to-br from-emerald-400 to-emerald-600 border-emerald-300';
          } else if (showResult && isSelected && !isCorrect) {
            bgClass = 'bg-gradient-to-br from-red-400 to-red-600 border-red-300';
          } else if (isSelected) {
            bgClass = 'bg-orange-100 border-orange-400';
          }
          
          return (
            <motion.button
              key={index}
              whileTap={{ scale: showFeedback ? 1 : 0.95 }}
              onClick={() => !showFeedback && handleAnswer(index)}
              disabled={showFeedback}
              className={`w-full p-4 rounded-2xl border-2 transition-all duration-200 ${bgClass}`}
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
                  <CheckCircle className="w-5 h-5 text-white ml-2 flex-shrink-0" />
                )}
                {showResult && isSelected && !isCorrect && (
                  <X className="w-5 h-5 text-white ml-2 flex-shrink-0" />
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
