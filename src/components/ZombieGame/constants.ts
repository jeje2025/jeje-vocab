import { GameConfig } from './types';

// 게임 기본 설정
export const DEFAULT_GAME_CONFIG: GameConfig = {
  maxLives: 3,
  zombieCount: 4, // 화면에 표시되는 좀비 수
  zombieSpeed: 0.3, // 이동 속도 (낮을수록 느림)
  totalQuestions: 10,
};

// 좀비 이동 관련
export const ZOMBIE_MOVEMENT = {
  MIN_Y: 10, // 최소 Y 위치 (%)
  MAX_Y: 70, // 최대 Y 위치 (%)
  MIN_X: 10, // 최소 X 위치 (%)
  MAX_X: 90, // 최대 X 위치 (%)
};

// 점수
export const SCORE_VALUES = {
  CORRECT_ANSWER: 100,
  WRONG_ANSWER: -50,
  BONUS_PER_LIFE: 200,
};

// 색상 (나중에 테마로 교체 가능)
export const COLORS = {
  BACKGROUND: '#0a1628',
  ZOMBIE_GLOW: '#4a5568',
  TEXT_PRIMARY: '#ffffff',
  TEXT_SECONDARY: '#9ca3af',
  HEART_FULL: '#ef4444',
  HEART_EMPTY: '#4b5563',
};
