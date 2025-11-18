import { useState, useCallback, useRef, useEffect } from 'react';
import { GameState, WordData, ZombieData } from '../types';
import { DEFAULT_GAME_CONFIG, ZOMBIE_MOVEMENT, SCORE_VALUES } from '../constants';

export function useGameState(vocabularyWords: WordData[]) {
  const [gameState, setGameState] = useState<GameState>({
    currentWord: null,
    zombies: [],
    score: 0,
    lives: DEFAULT_GAME_CONFIG.maxLives,
    isGameOver: false,
    isPaused: false,
    questionNumber: 0,
    totalQuestions: DEFAULT_GAME_CONFIG.totalQuestions,
  });

  const usedWordsRef = useRef<Set<string>>(new Set());
  const animationFrameRef = useRef<number>();
  const generateNextQuestionRef = useRef<() => void>(() => {});

  // 랜덤 위치 생성
  const getRandomPosition = () => ({
    x: ZOMBIE_MOVEMENT.MIN_X + Math.random() * (ZOMBIE_MOVEMENT.MAX_X - ZOMBIE_MOVEMENT.MIN_X),
    y: ZOMBIE_MOVEMENT.MIN_Y + Math.random() * (ZOMBIE_MOVEMENT.MAX_Y - ZOMBIE_MOVEMENT.MIN_Y),
  });

  // 다음 문제 생성
  const generateNextQuestion = useCallback(() => {
    if (vocabularyWords.length === 0) return;

    setGameState(prev => {
      // 사용하지 않은 단어 찾기
      const availableWords = vocabularyWords.filter(w => !usedWordsRef.current.has(w.id));

      if (availableWords.length === 0 || prev.questionNumber >= prev.totalQuestions) {
        return { ...prev, isGameOver: true };
      }

      // 정답 단어 선택
      const correctWord = availableWords[Math.floor(Math.random() * availableWords.length)];
      usedWordsRef.current.add(correctWord.id);

      // 오답 단어들 선택 (정답 제외)
      const wrongWords = vocabularyWords
        .filter(w => w.id !== correctWord.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, DEFAULT_GAME_CONFIG.zombieCount - 1);

      // 좀비 생성
      const allMeanings = [correctWord, ...wrongWords].sort(() => Math.random() - 0.5);
      const newZombies: ZombieData[] = allMeanings.map((word, index) => {
        const pos = getRandomPosition();
        return {
          id: `zombie-${Date.now()}-${index}`,
          wordId: word.id,
          meaning: word.meaning,
          x: pos.x,
          y: pos.y,
          speed: DEFAULT_GAME_CONFIG.zombieSpeed + Math.random() * 0.2,
          direction: Math.random() > 0.5 ? 'down' : 'up',
          isCorrect: word.id === correctWord.id,
        };
      });

      return {
        ...prev,
        currentWord: correctWord,
        zombies: newZombies,
        questionNumber: prev.questionNumber + 1,
      };
    });
  }, [vocabularyWords]);

  // Keep ref updated with latest function
  useEffect(() => {
    generateNextQuestionRef.current = generateNextQuestion;
  }, [generateNextQuestion]);

  // 좀비 클릭 처리
  const handleZombieClick = useCallback((zombieId: string) => {
    setGameState(prev => {
      const zombie = prev.zombies.find(z => z.id === zombieId);
      if (!zombie) return prev;

      if (zombie.isCorrect) {
        // 정답! - 다음 문제로 넘어감
        setTimeout(() => generateNextQuestionRef.current(), 500);
        return {
          ...prev,
          score: prev.score + SCORE_VALUES.CORRECT_ANSWER,
        };
      } else {
        // 오답
        const newLives = prev.lives - 1;
        return {
          ...prev,
          lives: newLives,
          score: Math.max(0, prev.score + SCORE_VALUES.WRONG_ANSWER),
          isGameOver: newLives <= 0,
        };
      }
    });
  }, []);

  // 좀비 이동 애니메이션 - 실시간 이동은 비활성화하고 고정 위치 사용
  // (무한 렌더링 방지를 위해 requestAnimationFrame 제거)
  useEffect(() => {
    // 좀비 이동 애니메이션은 현재 비활성화
    // 나중에 CSS 애니메이션이나 별도 최적화로 구현 가능
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameState.isPaused, gameState.isGameOver]);

  // 게임 시작
  const startGame = useCallback(() => {
    usedWordsRef.current.clear();
    setGameState({
      currentWord: null,
      zombies: [],
      score: 0,
      lives: DEFAULT_GAME_CONFIG.maxLives,
      isGameOver: false,
      isPaused: false,
      questionNumber: 0,
      totalQuestions: Math.min(DEFAULT_GAME_CONFIG.totalQuestions, vocabularyWords.length),
    });
    // Use setTimeout to defer the first question generation
    setTimeout(() => {
      generateNextQuestionRef.current();
    }, 100);
  }, [vocabularyWords.length]);

  // 게임 일시정지
  const togglePause = useCallback(() => {
    setGameState(prev => ({ ...prev, isPaused: !prev.isPaused }));
  }, []);

  return {
    gameState,
    startGame,
    handleZombieClick,
    togglePause,
    generateNextQuestion,
  };
}
