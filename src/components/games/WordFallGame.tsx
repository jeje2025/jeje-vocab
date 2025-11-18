import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Trophy, Zap, Timer } from 'lucide-react';

interface WordFallGameProps {
  words: Array<{
    id: string;
    word: string;
    meaning: string;
  }>;
  onComplete: (score: number, correctCount: number) => void;
  onWrongAnswer?: (wordId: string) => void;
}

interface FallingWord {
  id: string;
  word: string;
  wordId: string;
  options: string[];
  correctAnswer: number;
  yPosition: number;
  speed: number;
}

export function WordFallGame({ words, onComplete, onWrongAnswer }: WordFallGameProps) {
  const [gameStarted, setGameStarted] = useState(false);
  const [fallingWords, setFallingWords] = useState<FallingWord[]>([]);
  const [currentWord, setCurrentWord] = useState<FallingWord | null>(null);
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [correctCount, setCorrectCount] = useState(0);
  const gameLoopRef = useRef<number>();
  const timerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (gameStarted) {
      startGameLoop();
      startTimer();
    }
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameStarted]);

  useEffect(() => {
    if (lives === 0 || timeLeft === 0) {
      endGame();
    }
  }, [lives, timeLeft]);

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startGameLoop = () => {
    spawnWord();
    
    const gameLoop = () => {
      setCurrentWord(prev => {
        if (!prev) return prev;
        
        const newY = prev.yPosition + prev.speed;
        
        // Word reached bottom - lose a life
        if (newY > 100) {
          setLives(l => l - 1);
          if (onWrongAnswer) onWrongAnswer(prev.wordId);
          setTimeout(() => spawnWord(), 500);
          return null;
        }
        
        return { ...prev, yPosition: newY };
      });
      
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };
    
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  };

  const spawnWord = () => {
    if (words.length === 0) return;
    
    const randomWord = words[Math.floor(Math.random() * words.length)];
    
    // Create wrong options
    const wrongOptions = words
      .filter(w => w.id !== randomWord.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map(w => w.meaning);
    
    const options = [randomWord.meaning, ...wrongOptions].sort(() => Math.random() - 0.5);
    const correctIndex = options.indexOf(randomWord.meaning);
    
    const newWord: FallingWord = {
      id: `word-${Date.now()}`,
      word: randomWord.word,
      wordId: randomWord.id,
      options,
      correctAnswer: correctIndex,
      yPosition: 0,
      speed: 0.3 + (score * 0.02) // Speed increases with score
    };
    
    setCurrentWord(newWord);
  };

  const handleAnswer = (selectedIndex: number) => {
    if (!currentWord) return;
    
    if (selectedIndex === currentWord.correctAnswer) {
      // Correct!
      setScore(prev => prev + 10);
      setCorrectCount(prev => prev + 1);
      setCurrentWord(null);
      setTimeout(() => spawnWord(), 300);
    } else {
      // Wrong!
      setLives(prev => prev - 1);
      if (onWrongAnswer) onWrongAnswer(currentWord.wordId);
      setCurrentWord(null);
      setTimeout(() => spawnWord(), 500);
    }
  };

  const endGame = () => {
    if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    
    setTimeout(() => {
      onComplete(score, correctCount);
    }, 1000);
  };

  const startGame = () => {
    setGameStarted(true);
    setLives(3);
    setScore(0);
    setCorrectCount(0);
    setTimeLeft(60);
  };

  if (!gameStarted) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl">
            <Zap className="w-12 h-12 text-white" />
          </div>
          
          <h1 className="text-2xl mb-3" style={{ fontWeight: 800, color: '#491B6D' }}>
            단어 낙하 게임
          </h1>
          
          <p className="text-sm mb-8" style={{ color: '#8B5CF6' }}>
            떨어지는 단어의 뜻을 맞추세요!<br />
            60초 안에 최대한 많이 맞추세요!
          </p>
          
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 mb-8 space-y-3 text-left max-w-xs mx-auto">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <Heart className="w-4 h-4 text-red-500" />
              </div>
              <div>
                <div className="text-xs" style={{ fontWeight: 700, color: '#491B6D' }}>생명: 3개</div>
                <div className="text-xs" style={{ color: '#8B5CF6' }}>틀리거나 놓치면 -1</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Timer className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <div className="text-xs" style={{ fontWeight: 700, color: '#491B6D' }}>시간: 60초</div>
                <div className="text-xs" style={{ color: '#8B5CF6' }}>시간 내에 최대한 많이!</div>
              </div>
            </div>
          </div>
          
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={startGame}
            className="px-12 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl shadow-xl"
          >
            <span style={{ fontWeight: 700 }}>게임 시작!</span>
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-indigo-50 via-white to-purple-50 relative overflow-hidden">
      {/* Game Stats Header */}
      <div className="p-4 bg-white/80 backdrop-blur-lg shadow-lg z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Lives */}
            <div className="flex items-center gap-2">
              {[...Array(3)].map((_, i) => (
                <Heart
                  key={i}
                  className={`w-6 h-6 ${
                    i < lives 
                      ? 'fill-red-500 text-red-500' 
                      : 'fill-gray-200 text-gray-200'
                  }`}
                />
              ))}
            </div>
            
            {/* Timer */}
            <div className="flex items-center gap-2 bg-blue-100 px-3 py-1 rounded-full">
              <Timer className="w-4 h-4 text-blue-600" />
              <span className="text-sm" style={{ fontWeight: 700, color: '#1E40AF' }}>
                {timeLeft}s
              </span>
            </div>
          </div>
          
          {/* Score */}
          <div className="flex items-center gap-2 bg-purple-100 px-4 py-1 rounded-full">
            <Trophy className="w-4 h-4 text-purple-600" />
            <span className="text-sm" style={{ fontWeight: 700, color: '#6B21A8' }}>
              {score}
            </span>
          </div>
        </div>
      </div>

      {/* Game Area */}
      <div className="flex-1 relative">
        <AnimatePresence>
          {currentWord && (
            <motion.div
              key={currentWord.id}
              initial={{ y: -100 }}
              style={{ top: `${currentWord.yPosition}%` }}
              className="absolute left-1/2 -translate-x-1/2 z-10"
            >
              <div className="bg-gradient-to-br from-purple-500 to-purple-700 text-white px-6 py-3 rounded-2xl shadow-2xl border-2 border-white/40">
                <div className="text-xl text-center" style={{ fontWeight: 800 }}>
                  {currentWord.word}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Answer Options */}
      {currentWord && (
        <div className="p-4 space-y-3 bg-white/90 backdrop-blur-lg z-20">
          {currentWord.options.map((option, index) => (
            <motion.button
              key={index}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleAnswer(index)}
              className="w-full p-4 bg-white border-2 border-purple-200 rounded-2xl text-left shadow-lg"
              style={{ touchAction: 'manipulation' }}
            >
              <span className="text-sm" style={{ fontWeight: 600, color: '#491B6D' }}>
                {option}
              </span>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}
