import { create } from 'zustand';

// Quiz mode types
type QuizMode = 'normal' | 'match' | 'game';
type MatchGameType = 'card-match-word' | 'card-match-meaning';
type GameType = 'fall' | 'speed';

// Question type from GameMapQuizScreen
export type QuestionType = 'multiple-choice' | 'multi-select' | 'sentence';

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options: string[];
  correctAnswer: number | number[];
  explanation?: string;
  word?: any;
}

export interface Stage {
  id: number;
  title: string;
  icon: any;
  status: 'locked' | 'unlocked' | 'completed';
  xpReward: number;
}

interface QuizState {
  // Stage management
  stages: Stage[];
  currentStage: number | null;
  pendingStageId: number | null;
  completedModes: Record<number, Set<QuizMode>>;

  // Question management
  currentQuestion: number;
  shuffledQuestions: Record<number, Question[]>;

  // Answer management
  selectedAnswers: number[];
  showFeedback: boolean;
  lastAnswerCorrect: boolean | null;
  stageScore: number;
  correctAnswersCount: number;

  // Quiz mode
  selectedQuizMode: QuizMode;
  matchGameType: MatchGameType | null;
  gameType: GameType | null;
  showQuizModeSelector: boolean;

  // Progress tracking
  showStageComplete: boolean;
  showVictory: boolean;
  startTime: Date | null;

  // UI state
  activeTab: 'word-list' | 'quiz-map' | 'flashcards' | 'pdf-print';
  showSentenceTranslation: boolean;

  // Vocabulary loading
  rawVocabularyWords: any[];
  isLoadingWords: boolean;
  refreshCounter: number;

  // Actions
  setStages: (stages: Stage[]) => void;
  setCurrentStage: (stage: number | null) => void;
  setPendingStageId: (id: number | null) => void;
  setCompletedModes: (modes: Record<number, Set<QuizMode>>) => void;
  addCompletedMode: (stageId: number, mode: QuizMode) => void;

  setCurrentQuestion: (question: number) => void;
  setShuffledQuestions: (questions: Record<number, Question[]>) => void;
  updateShuffledQuestionsForStage: (stageId: number, questions: Question[]) => void;

  setSelectedAnswers: (answers: number[]) => void;
  setShowFeedback: (show: boolean) => void;
  setLastAnswerCorrect: (correct: boolean | null) => void;
  setStageScore: (score: number) => void;
  incrementStageScore: (points: number) => void;
  setCorrectAnswersCount: (count: number) => void;
  incrementCorrectAnswers: () => void;

  setQuizMode: (mode: QuizMode) => void;
  setMatchGameType: (type: MatchGameType | null) => void;
  setGameType: (type: GameType | null) => void;
  setShowQuizModeSelector: (show: boolean) => void;

  setShowStageComplete: (show: boolean) => void;
  setShowVictory: (show: boolean) => void;
  setStartTime: (time: Date | null) => void;

  setActiveTab: (tab: 'word-list' | 'quiz-map' | 'flashcards' | 'pdf-print') => void;
  setShowSentenceTranslation: (show: boolean) => void;

  setRawVocabularyWords: (words: any[]) => void;
  setIsLoadingWords: (loading: boolean) => void;
  incrementRefreshCounter: () => void;

  // Complex actions
  startQuiz: (stageId: number, mode: QuizMode) => void;
  resetQuiz: () => void;
  nextQuestion: () => void;
  submitAnswer: (isCorrect: boolean) => void;
  completeStage: (stageId: number, mode: QuizMode) => void;
  unlockNextStage: (currentStageId: number) => void;

  // Reset
  reset: () => void;
}

const initialState = {
  stages: [],
  currentStage: null,
  pendingStageId: null,
  completedModes: {
    1: new Set<QuizMode>(),
    2: new Set<QuizMode>(),
    3: new Set<QuizMode>(),
    4: new Set<QuizMode>(),
    5: new Set<QuizMode>()
  },

  currentQuestion: 0,
  shuffledQuestions: {},

  selectedAnswers: [],
  showFeedback: false,
  lastAnswerCorrect: null,
  stageScore: 0,
  correctAnswersCount: 0,

  selectedQuizMode: 'normal' as QuizMode,
  matchGameType: null,
  gameType: null,
  showQuizModeSelector: false,

  showStageComplete: false,
  showVictory: false,
  startTime: null,

  activeTab: 'word-list' as const,
  showSentenceTranslation: false,

  rawVocabularyWords: [],
  isLoadingWords: true,
  refreshCounter: 0
};

export const useQuizStore = create<QuizState>((set, get) => ({
  ...initialState,

  // Stage management
  setStages: (stages) => set({ stages }),
  setCurrentStage: (stage) => set({ currentStage: stage }),
  setPendingStageId: (id) => set({ pendingStageId: id }),
  setCompletedModes: (modes) => set({ completedModes: modes }),
  addCompletedMode: (stageId, mode) => set((state) => {
    const newCompletedModes = { ...state.completedModes };
    if (!newCompletedModes[stageId]) {
      newCompletedModes[stageId] = new Set();
    }
    newCompletedModes[stageId].add(mode);
    return { completedModes: newCompletedModes };
  }),

  // Question management
  setCurrentQuestion: (question) => set({ currentQuestion: question }),
  setShuffledQuestions: (questions) => set({ shuffledQuestions: questions }),
  updateShuffledQuestionsForStage: (stageId, questions) => set((state) => ({
    shuffledQuestions: {
      ...state.shuffledQuestions,
      [stageId]: questions
    }
  })),

  // Answer management
  setSelectedAnswers: (answers) => set({ selectedAnswers: answers }),
  setShowFeedback: (show) => set({ showFeedback: show }),
  setLastAnswerCorrect: (correct) => set({ lastAnswerCorrect: correct }),
  setStageScore: (score) => set({ stageScore: score }),
  incrementStageScore: (points) => set((state) => ({
    stageScore: state.stageScore + points
  })),
  setCorrectAnswersCount: (count) => set({ correctAnswersCount: count }),
  incrementCorrectAnswers: () => set((state) => ({
    correctAnswersCount: state.correctAnswersCount + 1
  })),

  // Quiz mode
  setQuizMode: (mode) => set({ selectedQuizMode: mode }),
  setMatchGameType: (type) => set({ matchGameType: type }),
  setGameType: (type) => set({ gameType: type }),
  setShowQuizModeSelector: (show) => set({ showQuizModeSelector: show }),

  // Progress tracking
  setShowStageComplete: (show) => set({ showStageComplete: show }),
  setShowVictory: (show) => set({ showVictory: show }),
  setStartTime: (time) => set({ startTime: time }),

  // UI state
  setActiveTab: (tab) => set({ activeTab: tab }),
  setShowSentenceTranslation: (show) => set({ showSentenceTranslation: show }),

  // Vocabulary loading
  setRawVocabularyWords: (words) => set({ rawVocabularyWords: words }),
  setIsLoadingWords: (loading) => set({ isLoadingWords: loading }),
  incrementRefreshCounter: () => set((state) => ({
    refreshCounter: state.refreshCounter + 1
  })),

  // Complex actions
  startQuiz: (stageId, mode) => {
    set({
      currentStage: stageId,
      selectedQuizMode: mode,
      currentQuestion: 0,
      selectedAnswers: [],
      showFeedback: false,
      lastAnswerCorrect: null,
      stageScore: 0,
      correctAnswersCount: 0,
      startTime: new Date(),
      showQuizModeSelector: false,
      pendingStageId: null
    });
  },

  resetQuiz: () => {
    set({
      currentStage: null,
      currentQuestion: 0,
      selectedAnswers: [],
      showFeedback: false,
      lastAnswerCorrect: null,
      stageScore: 0,
      correctAnswersCount: 0,
      startTime: null,
      showStageComplete: false,
      matchGameType: null,
      gameType: null
    });
  },

  nextQuestion: () => {
    set((state) => ({
      currentQuestion: state.currentQuestion + 1,
      selectedAnswers: [],
      showFeedback: false,
      lastAnswerCorrect: null
    }));
  },

  submitAnswer: (isCorrect) => {
    set((state) => ({
      showFeedback: true,
      lastAnswerCorrect: isCorrect,
      correctAnswersCount: isCorrect ? state.correctAnswersCount + 1 : state.correctAnswersCount
    }));
  },

  completeStage: (stageId, mode) => {
    const state = get();

    // Add to completed modes
    const newCompletedModes = { ...state.completedModes };
    if (!newCompletedModes[stageId]) {
      newCompletedModes[stageId] = new Set();
    }
    newCompletedModes[stageId].add(mode);

    set({
      completedModes: newCompletedModes,
      showStageComplete: true
    });
  },

  unlockNextStage: (currentStageId) => {
    set((state) => {
      const newStages = state.stages.map(stage => {
        if (stage.id === currentStageId + 1 && stage.status === 'locked') {
          return { ...stage, status: 'unlocked' as const };
        }
        return stage;
      });

      // Check if all stages are completed
      const allCompleted = newStages.every(s => s.status === 'completed');

      return {
        stages: newStages,
        showVictory: allCompleted
      };
    });
  },

  // Reset
  reset: () => set(initialState)
}));
