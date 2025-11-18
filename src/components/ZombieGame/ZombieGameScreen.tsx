import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Pause, Play, RotateCcw } from 'lucide-react';
import { ZombieGameScreenProps } from './types';
import { useGameState } from './hooks/useGameState';
import { Zombie } from './components/Zombie';
import { WordDisplay } from './components/WordDisplay';
import { HealthBar } from './components/HealthBar';
import { ScoreBoard } from './components/ScoreBoard';
import { Gun } from './components/Gun';
import { DEFAULT_GAME_CONFIG, COLORS } from './constants';

interface Bullet {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface Explosion {
  id: string;
  x: number;
  y: number;
  isCorrect: boolean;
}

export function ZombieGameScreen({ vocabularyWords, onBack, onBackToHome }: ZombieGameScreenProps) {
  const { gameState, startGame, handleZombieClick, togglePause } = useGameState(vocabularyWords);
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [explosions, setExplosions] = useState<Explosion[]>([]);
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const gunRef = useRef<HTMLDivElement>(null);

  // Wrapper for handleZombieClick that adds shooting effect
  const handleZombieClickWithBullet = useCallback((zombieId: string, event: React.MouseEvent) => {
    // Get click position for bullet target
    const rect = gameAreaRef.current?.getBoundingClientRect();
    const zombie = gameState.zombies.find(z => z.id === zombieId);

    if (rect && gunRef.current && zombie) {
      const gunRect = gunRef.current.getBoundingClientRect();
      const bulletId = `bullet-${Date.now()}`;
      const explosionId = `explosion-${Date.now()}`;

      // Start from gun position (center top of gun)
      const startX = gunRect.left + gunRect.width / 2 - rect.left;
      const startY = gunRect.top - rect.top;

      // End at click position
      const endX = event.clientX - rect.left;
      const endY = event.clientY - rect.top;

      setBullets(prev => [...prev, { id: bulletId, startX, startY, endX, endY }]);

      // Add explosion after bullet arrives
      setTimeout(() => {
        setExplosions(prev => [...prev, {
          id: explosionId,
          x: endX,
          y: endY,
          isCorrect: zombie.isCorrect
        }]);

        // Remove explosion after animation
        setTimeout(() => {
          setExplosions(prev => prev.filter(e => e.id !== explosionId));
        }, 600);
      }, 250);

      // Remove bullet after animation
      setTimeout(() => {
        setBullets(prev => prev.filter(b => b.id !== bulletId));
      }, 300);
    }

    // Call original handler
    handleZombieClick(zombieId);
  }, [handleZombieClick, gameState.zombies]);

  // 게임 시작 - 마운트 시 한 번만 실행
  useEffect(() => {
    if (vocabularyWords.length > 0) {
      startGame();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 배경 스크롤 방지
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalStyle;
      document.documentElement.style.overflow = '';
    };
  }, []);

  return (
    <div
      className="h-screen w-full flex flex-col relative overflow-hidden"
      style={{ background: COLORS.BACKGROUND }}
    >
      {/* 배경 효과 */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none z-0"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(59, 130, 246, 0.1) 0%, transparent 70%)',
        }}
      />

      {/* 헤더 */}
      <div className="relative z-20 flex items-center justify-between p-4">
        <button
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-sm"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>

        <ScoreBoard
          score={gameState.score}
          questionNumber={gameState.questionNumber}
          totalQuestions={gameState.totalQuestions}
        />

        <button
          onClick={togglePause}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-sm"
        >
          {gameState.isPaused ? (
            <Play className="w-5 h-5 text-white" />
          ) : (
            <Pause className="w-5 h-5 text-white" />
          )}
        </button>
      </div>

      {/* 생명력 */}
      <div className="relative z-20 flex justify-center py-2">
        <HealthBar lives={gameState.lives} maxLives={DEFAULT_GAME_CONFIG.maxLives} />
      </div>

      {/* 단어 표시 */}
      <div className="relative z-20 flex justify-center py-4">
        {gameState.currentWord && <WordDisplay word={gameState.currentWord.word} />}
      </div>

      {/* 게임 영역 */}
      <div ref={gameAreaRef} className="flex-1 relative z-30 overflow-hidden">
        <AnimatePresence>
          {gameState.zombies.map(zombie => (
            <Zombie
              key={zombie.id}
              zombie={zombie}
              onClick={(id) => {
                // Create a synthetic event for bullet positioning
                const zombieElement = document.querySelector(`[data-zombie-id="${id}"]`);
                if (zombieElement) {
                  const rect = zombieElement.getBoundingClientRect();
                  const syntheticEvent = {
                    clientX: rect.left + rect.width / 2,
                    clientY: rect.top + rect.height / 2,
                  } as React.MouseEvent;
                  handleZombieClickWithBullet(id, syntheticEvent);
                } else {
                  handleZombieClick(id);
                }
              }}
            />
          ))}
        </AnimatePresence>

        {/* 총알 */}
        <AnimatePresence>
          {bullets.map(bullet => (
            <motion.div
              key={bullet.id}
              initial={{
                x: bullet.startX,
                y: bullet.startY,
                scale: 1,
                opacity: 1,
              }}
              animate={{
                x: bullet.endX,
                y: bullet.endY,
                scale: 0.5,
                opacity: 0.8,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: 'linear' }}
              className="absolute pointer-events-none z-50"
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, #ff4444 0%, #cc0000 70%, #990000 100%)',
                boxShadow: '0 0 20px #ff4444, 0 0 40px #ff0000',
              }}
            />
          ))}
        </AnimatePresence>

        {/* 폭발 효과 */}
        <AnimatePresence>
          {explosions.map(explosion => (
            <motion.div
              key={explosion.id}
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: 3, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="absolute pointer-events-none z-50"
              style={{
                left: explosion.x,
                top: explosion.y,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {/* 메인 폭발 - 항상 빨간색 */}
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(255, 68, 68, 0.9) 0%, rgba(204, 0, 0, 0.5) 40%, transparent 70%)',
                  boxShadow: '0 0 40px rgba(255, 68, 68, 0.8), 0 0 80px rgba(255, 0, 0, 0.4)',
                }}
              />
              {/* 파티클들 - 빨간색 */}
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ x: 0, y: 0, opacity: 1 }}
                  animate={{
                    x: Math.cos((i * Math.PI * 2) / 8) * 50,
                    y: Math.sin((i * Math.PI * 2) / 8) * 50,
                    opacity: 0,
                  }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="absolute"
                  style={{
                    left: '50%',
                    top: '50%',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#ff4444',
                    boxShadow: '0 0 10px #ff0000',
                    transform: 'translate(-50%, -50%)',
                  }}
                />
              ))}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* 총 */}
      <div ref={gunRef} className="relative z-20 flex justify-center pb-8">
        <Gun />
      </div>

      {/* 일시정지 오버레이 */}
      <AnimatePresence>
        {gameState.isPaused && !gameState.isGameOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/70"
          >
            <div className="text-center">
              <h2 className="text-4xl font-bold text-white mb-8">PAUSED</h2>
              <button
                onClick={togglePause}
                className="px-8 py-4 bg-blue-600 text-white rounded-xl text-xl font-bold"
              >
                RESUME
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 게임 오버 화면 */}
      <AnimatePresence>
        {gameState.isGameOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/80"
          >
            <div className="text-center">
              <h2 className="text-4xl font-bold text-white mb-4">
                {gameState.lives > 0 ? 'COMPLETE!' : 'GAME OVER'}
              </h2>
              <p className="text-2xl text-white mb-2">Score: {gameState.score}</p>
              <p className="text-lg text-gray-400 mb-8">
                {gameState.questionNumber}/{gameState.totalQuestions} Questions
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={startGame}
                  className="px-6 py-3 bg-green-600 text-white rounded-xl text-lg font-bold flex items-center gap-2"
                >
                  <RotateCcw className="w-5 h-5" />
                  RETRY
                </button>
                <button
                  onClick={onBackToHome || onBack}
                  className="px-6 py-3 bg-gray-600 text-white rounded-xl text-lg font-bold"
                >
                  EXIT
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
