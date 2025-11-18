// 단어 데이터 타입
export interface WordData {
  id: string;
  word: string;
  meaning: string;
  pronunciation?: string;
}

// 좀비 상태
export interface ZombieData {
  id: string;
  wordId: string;
  meaning: string;
  x: number; // 화면 x 위치 (0-100%)
  y: number; // 화면 y 위치 (0-100%)
  speed: number; // 이동 속도
  direction: 'down' | 'up'; // 이동 방향
  isCorrect: boolean; // 정답 좀비인지
}

// 게임 상태
export interface GameState {
  currentWord: WordData | null;
  zombies: ZombieData[];
  score: number;
  lives: number;
  isGameOver: boolean;
  isPaused: boolean;
  questionNumber: number;
  totalQuestions: number;
}

// 게임 설정
export interface GameConfig {
  maxLives: number;
  zombieCount: number;
  zombieSpeed: number;
  totalQuestions: number;
}

// 컴포넌트 Props
export interface ZombieGameScreenProps {
  vocabularyWords: WordData[];
  onBack: () => void;
  onBackToHome?: () => void;
}

export interface ZombieProps {
  zombie: ZombieData;
  onClick: (zombieId: string) => void;
}

export interface WordDisplayProps {
  word: string;
}

export interface HealthBarProps {
  lives: number;
  maxLives: number;
}

export interface ScoreBoardProps {
  score: number;
  questionNumber: number;
  totalQuestions: number;
}
