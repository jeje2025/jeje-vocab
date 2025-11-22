import { useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Target,
  BookOpen,
  Puzzle,
  Key,
  Trophy,
  Star,
  CheckCircle,
  Circle,
  Sparkles,
  List,
  FileText,
  Layers,
  Home,
  ChevronRight,
  Gamepad2,
  ArrowLeft,
  PenTool
} from 'lucide-react';
import { BackButton } from './BackButton';
import { QuizStatusUpdate } from './QuizStatusUpdate';
import { WordListScreen } from './WordListScreen';
import { FlashcardScreen } from './FlashcardScreen';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { PDFPrintScreen } from './PDFPrintScreen';
import { MatchQuizLayout } from './quizLayouts/MatchQuizLayout';
import { ArcadeQuizLayout } from './quizLayouts/ArcadeQuizLayout';
import { NormalQuizLayout } from './quizLayouts/NormalQuizLayout';
import {
  subjectStages,
  subjectNames,
  MIN_MATCH_WORDS,
  stageModeAvailability,
  buildQuestionBank,
  shuffleArray,
  normalizeWordForQuiz,
  removeParentheticalHints,
  maskSentence,
  cloneQuestion,
  type Question,
  type Stage,
  type NormalizedWord
} from '../utils/quiz';
import {
  generateFillInWordQuestions,
  generateFillInMeaningQuestions
} from '../utils/quiz';
import { useQuizStore } from '../stores/useQuizStore';
import { useVocabularyLoader } from '../hooks/useVocabularyLoader';
import { gradeFillInAnswer } from '../utils/gradingApi';


interface GameMapQuizScreenProps {
  onBack: () => void;
  onBackToHome?: () => void;
  onXPGain: (points: number) => void;
  userXP: number;
  selectedSubject?: {
    id: string;
    name: string;
    description: string;
    progress: number;
    icon: React.ReactNode;
    color: string;
  };
  vocabularyTitle?: string;
  vocabularyWords?: any[]; // Pre-loaded words from parent
  onQuizCompletion: (data: {
    xpGained: number;
    completionTime: string;
    accuracy: number;
    totalQuestions: number;
    correctAnswers: number;
    stageName: string;
  }) => void;
  onWrongAnswer?: (wordId: string) => void;
  onAddToStarred?: (wordId: string) => void;
  onMoveToGraveyard?: (wordId: string) => void;
  onDeletePermanently?: (wordId: string) => void;
  starredWordIds?: string[];
  graveyardWordIds?: string[];
  wrongAnswersWordIds?: string[];
  getAuthToken?: () => string;
  onRefreshVocabulary?: () => Promise<void>;
  vocabularyId?: string;
  isLoading?: boolean;
}

export function GameMapQuizScreen({
  onBack,
  onBackToHome,
  onXPGain,
  userXP: _userXP,
  selectedSubject,
  vocabularyTitle,
  vocabularyWords: propsVocabularyWords,
  onQuizCompletion,
  onWrongAnswer,
  onAddToStarred,
  onMoveToGraveyard,
  onDeletePermanently,
  starredWordIds = [],
  graveyardWordIds = [],
  wrongAnswersWordIds = [],
  getAuthToken,
  onRefreshVocabulary,
  vocabularyId,
  isLoading
}: GameMapQuizScreenProps) {
  // Get subject-specific stages and questions
  const subjectId = selectedSubject?.id || 'math';
  const journeyName = vocabularyTitle || subjectNames[subjectId] || "Math Journey";
  const canOpenPdfExport = !!selectedSubject;
  const isStarredVocabulary = selectedSubject?.id === 'starred';

  // Zustand Store - Quiz State Management
  const {
    stages, setStages,
    currentStage, setCurrentStage,
    currentQuestion, setCurrentQuestion,
    selectedAnswers, setSelectedAnswers,
    showFeedback, setShowFeedback,
    lastAnswerCorrect, setLastAnswerCorrect,
    aiFeedback, setAiFeedback,
    stageScore, setStageScore, incrementStageScore,
    showStageComplete, setShowStageComplete,
    showVictory, setShowVictory,
    startTime, setStartTime,
    correctAnswersCount, setCorrectAnswersCount, incrementCorrectAnswers,
    showQuizModeSelector, setShowQuizModeSelector,
    selectedQuizMode, setQuizMode,
    matchGameType, setMatchGameType,
    gameType, setGameType,
    fillInType, setFillInType,
    pendingStageId, setPendingStageId,
    activeTab, setActiveTab,
    shuffledQuestions, updateShuffledQuestionsForStage,
    completedModes, addCompletedMode,
    showSentenceTranslation, setShowSentenceTranslation,
    startQuiz: storeStartQuiz,
    resetQuiz,
    nextQuestion: storeNextQuestion,
    submitAnswer: storeSubmitAnswer,
    completeStage: storeCompleteStage,
    unlockNextStage
  } = useQuizStore();

  // Vocabulary Loader Hook
  const {
    rawVocabularyWords,
    isLoadingWords,
    refreshVocabulary,
    invalidateVocabulary
  } = useVocabularyLoader({
    propsVocabularyWords,
    selectedSubject,
    getAuthToken,
    starredWordIds,
    graveyardWordIds,
    wrongAnswersWordIds
  });

  // Alias for consistency
  const vocabularyWords = rawVocabularyWords;

  // Initialize stages on mount or when subject changes
  useEffect(() => {
    setStages(subjectStages[subjectId] || subjectStages.math);
  }, [subjectId, setStages]);

  // Shuffle stage questions helper
  const shuffleStageQuestions = useCallback((stageId: number, bank: Record<number, Question[]>) => {
    const baseQuestions = bank[stageId] || [];
    if (!baseQuestions.length) return;
    const shuffled = shuffleArray(baseQuestions);
    updateShuffledQuestionsForStage(stageId, shuffled);
  }, [updateShuffledQuestionsForStage]);

  // Filter out graveyard words before building question bank
  // BUT only if this is NOT the graveyard vocabulary itself
  const isGraveyardVocabulary = selectedSubject?.id === 'graveyard';
  const filteredWords = useMemo(() => {
    if (!vocabularyWords.length) return [];
    // Don't filter if this IS the graveyard vocabulary (user wants to quiz graveyard words)
    if (isGraveyardVocabulary) return vocabularyWords;
    if (!graveyardWordIds.length) return vocabularyWords;

    const graveyardSet = new Set(graveyardWordIds);
    return vocabularyWords.filter(word => {
      const wordId = word?.id || word?.term;
      return !graveyardSet.has(String(wordId));
    });
  }, [vocabularyWords, graveyardWordIds, isGraveyardVocabulary]);

  const dynamicQuestionBank = useMemo<Record<number, Question[]> | null>(
    () => buildQuestionBank(filteredWords),
    [filteredWords]
  );
  const questionBank = useMemo<Record<number, Question[]>>(() => {
    if (dynamicQuestionBank) {
      return dynamicQuestionBank;
    }
    // Return empty object if no questions can be generated
    return {};
  }, [dynamicQuestionBank]);
  const matchWordPools = useMemo<Record<number, any[]>>(() => {
    const derivativePool = filteredWords
      .flatMap((word: any) =>
        (word?.derivatives || []).map((der: any, index: number) => ({
          id: `${word.id}-derivative-${index}`,
          word: der?.word || der?.term || '',
          meaning: der?.meaning || '',
        }))
      )
      .filter((entry) => entry.word && entry.meaning);

    return {
      1: filteredWords,
      2: derivativePool.length ? derivativePool : filteredWords,
      3: filteredWords,
      4: filteredWords,
      5: filteredWords
    };
  }, [filteredWords]);

  const getMatchWordsForStage = useCallback(
    (stageId: number) => {
      const pool = matchWordPools[stageId];
      return pool && pool.length ? pool : filteredWords;
    },
    [matchWordPools, filteredWords]
  );

  // vocabularyWords are now loaded via useVocabularyLoader hook


  useEffect(() => {
    setShowSentenceTranslation(false);
  }, [currentQuestion, currentStage]);

  const handleStageClick = (stageId: number) => {
    const stage = stages.find(s => s.id === stageId);
    if (!stage) return;

    const modes = stageModeAvailability[stageId] || ['normal'];

    if (modes.length === 1) {
      const mode = modes[0];
      if (mode === 'match') {
        const poolLength = getMatchWordsForStage(stageId).length;
        if (poolLength < MIN_MATCH_WORDS) {
          alert(`매치 모드를 이용하려면 최소 ${MIN_MATCH_WORDS}개 이상의 단어가 필요해요.`);
          return;
        }
      }
      setQuizMode(mode);
      startQuiz(stageId, mode);
      return;
    }

    setPendingStageId(stageId);
    setShowQuizModeSelector(true);
  };

  const startQuiz = (stageId: number, mode: 'normal' | 'match' | 'game' | 'fill-in', overrideFillInType?: 'kr-to-en' | 'en-to-kr') => {
    if (mode === 'match') {
      const poolLength = getMatchWordsForStage(stageId).length;
      if (poolLength < MIN_MATCH_WORDS) {
        alert(`매치 모드를 이용하려면 최소 ${MIN_MATCH_WORDS}개 이상의 단어가 필요해요.`);
        return;
      }
    }

    if (mode !== 'match' && mode !== 'fill-in') {
      const stageQuestions = questionBank[stageId] || [];
      if (!stageQuestions.length) {
        if (vocabularyWords.length > 0) {
          const stageTitle = stages.find((s) => s.id === stageId)?.title || '이 퀴즈';
          alert(`${stageTitle}를 만들 단어가 부족해요. 단어장을 조금 더 채운 후 다시 시도해 주세요.`);
        }
        return;
      }
    }

    // Fill-in mode: generate questions on the fly based on fillInType
    if (mode === 'fill-in') {
      if (!filteredWords.length) {
        alert('주관식 퀴즈를 만들 단어가 부족해요.');
        return;
      }

      const normalizedWords = filteredWords
        .map(normalizeWordForQuiz)
        .filter((word): word is NormalizedWord => !!word);

      if (!normalizedWords.length) {
        alert('주관식 퀴즈를 만들 단어가 부족해요.');
        return;
      }

      // Use overrideFillInType if provided, otherwise use fillInType from store
      const currentFillInType = overrideFillInType || fillInType;

      console.log('Normalized words for fill-in:', normalizedWords);
      console.log('Fill-in type:', currentFillInType);

      let fillInQuestions: Question[] = [];
      if (currentFillInType === 'kr-to-en') {
        // KR → EN: 뜻 보고 단어 쓰기
        fillInQuestions = generateFillInWordQuestions(normalizedWords, 10);
      } else if (currentFillInType === 'en-to-kr') {
        // EN → KR: 단어 보고 뜻 쓰기 (AI grading)
        fillInQuestions = generateFillInMeaningQuestions(normalizedWords, 10);
      }

      console.log('Generated fill-in questions:', fillInQuestions);

      if (!fillInQuestions.length) {
        alert('주관식 퀴즈를 만들 수 없어요. 단어 데이터를 확인해주세요.');
        return;
      }

      // Update fillInType in store if override was provided
      if (overrideFillInType) {
        setFillInType(overrideFillInType);
      }

      // Store fill-in questions for this stage
      updateShuffledQuestionsForStage(stageId, fillInQuestions);
    }

    setCurrentStage(stageId);
    setCurrentQuestion(0);
    setStageScore(0);
    setSelectedAnswers([]);
    setShowFeedback(false);
    setLastAnswerCorrect(null);
    setStartTime(new Date());
    setCorrectAnswersCount(0);
    setQuizMode(mode);
    setShowQuizModeSelector(false);
    setPendingStageId(null);
    setShowSentenceTranslation(false);

    // Shuffle questions for normal mode
    if (mode !== 'fill-in') {
      shuffleStageQuestions(stageId, questionBank);
    }

    // Set game type once when starting (not on every render)
    if (mode === 'match') {
      setMatchGameType('card-match-word');
    } else if (mode === 'game') {
      setGameType(Math.random() > 0.5 ? 'fall' : 'speed');
    }
  };

  const handleVocabularyGameCompletion = useCallback(
    (correctCount: number, stage?: Stage) => {
      setStageScore(correctCount);
      setCorrectAnswersCount(correctCount);
      setShowStageComplete(true);

      if (!currentStage) return;

      if (correctCount >= 3) {
        setStages((prevStages) =>
          prevStages.map((s) => {
            if (s.id === currentStage) {
              return { ...s, status: 'completed' as const };
            }
            if (s.id === currentStage + 1 && s.status === 'locked') {
              return { ...s, status: 'current' as const };
            }
            return s;
          })
        );
      }
    },
    [currentStage]
  );

  const handleAnswerSelect = (answerIndex: number) => {
    if (showFeedback) return;
    const stageQuestions = currentStage
      ? shuffledQuestions[currentStage] || questionBank[currentStage]
      : null;
    const question = stageQuestions ? stageQuestions[currentQuestion] : null;
    if (!question) return;

    if (question.type === 'multi-select') {
      const newAnswers = selectedAnswers.includes(answerIndex)
        ? selectedAnswers.filter((value) => value !== answerIndex)
        : [...selectedAnswers, answerIndex];
      setSelectedAnswers(newAnswers);
    } else {
      const nextSelection = [answerIndex];
      setSelectedAnswers(nextSelection);
      // Slight delay to let selection state render before auto submit
      setTimeout(() => {
        handleSubmitAnswer(nextSelection);
      }, 120);
    }
  };

  const handleSubmitAnswer = async (overrideAnswers?: number[] | string) => {
    if (!currentStage) return;

    const questions =
      shuffledQuestions[currentStage] ||
      questionBank[currentStage] ||
      [];
    const currentQ = questions[currentQuestion];

    // Handle fill-in questions (string answer)
    if (typeof overrideAnswers === 'string') {
      const userAnswer = overrideAnswers.trim();
      if (!userAnswer || !currentQ) return;

      let isCorrect = false;

      if (currentQ.type === 'fill-in-word') {
        // KR → EN: Exact match (case-insensitive)
        isCorrect = userAnswer.toLowerCase() === (currentQ.correctAnswer as string).toLowerCase();
      } else if (currentQ.type === 'fill-in-meaning') {
        // EN → KR: Use Gemini API for semantic comparison
        const englishWord = currentQ.text;
        const correctAnswer = currentQ.correctAnswer as string;

        try {
          const gradingResult = await gradeFillInAnswer(englishWord, correctAnswer, userAnswer);
          isCorrect = gradingResult.isCorrect;

          // Store feedback for display
          setAiFeedback(gradingResult.feedback);
          console.log('Gemini feedback:', gradingResult.feedback);
        } catch (error) {
          console.error('Grading error, falling back to simple matching:', error);
          // Fallback to simple string matching
          isCorrect = userAnswer.includes(correctAnswer) || correctAnswer.includes(userAnswer);
          setAiFeedback('채점 중 오류가 발생했습니다.');
        }
      }

      setShowFeedback(true);
      setLastAnswerCorrect(isCorrect);

      if (isCorrect) {
        incrementStageScore(1);
        incrementCorrectAnswers();
      } else {
        const wrongId = currentQ.word?.id || currentQ.word?.term;
        if (onWrongAnswer && wrongId) {
          onWrongAnswer(wrongId);
        }
      }

      setTimeout(() => {
        if (currentQuestion < questions.length - 1) {
          setCurrentQuestion(currentQuestion + 1);
          setSelectedAnswers([]);
          setShowFeedback(false);
          setLastAnswerCorrect(null);
          setAiFeedback(null);
        } else {
          setSelectedAnswers([]);
          setShowFeedback(false);
          setLastAnswerCorrect(null);
          setAiFeedback(null);
          completeStage();
        }
      }, 2500);

      return;
    }

    // Handle multiple choice questions (number[] answer)
    const answers = overrideAnswers ?? selectedAnswers;
    if (!currentQ || answers.length === 0) return;

    let isCorrect = false;
    if (currentQ.type === 'multi-select' && (currentQ as any).correctAnswers) {
      const sortedSelected = [...answers].sort();
      const sortedCorrect = [...(currentQ as any).correctAnswers].sort();
      isCorrect =
        sortedSelected.length === sortedCorrect.length &&
        sortedSelected.every((value, index) => value === sortedCorrect[index]);
    } else if (typeof currentQ.correctAnswer === 'number') {
      isCorrect = answers[0] === currentQ.correctAnswer;
    }

    setShowFeedback(true);
    setLastAnswerCorrect(isCorrect);

    if (isCorrect) {
      incrementStageScore(1);
      incrementCorrectAnswers();
    } else {
      // 틀린 답변 추적 - 질문 ID를 단어 ID로 사용
      const wrongId = (currentQ as any).wordId || (currentQ as any).word;
      if (onWrongAnswer && wrongId) {
        onWrongAnswer(wrongId);
      }
    }

    setTimeout(() => {
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
        setSelectedAnswers([]);
        setShowFeedback(false);
        setLastAnswerCorrect(null);
        setShowSentenceTranslation(false);
      } else {
        setSelectedAnswers([]);
        setShowFeedback(false);
        setLastAnswerCorrect(null);
        setShowSentenceTranslation(false);
        completeStage();
      }
    }, 2500);
  };

  const completeStage = () => {
    if (!currentStage) return;

    const stage = stages.find(s => s.id === currentStage);
    if (!stage) return;

    // 현재 모드를 완료로 표시
    addCompletedMode(currentStage, selectedQuizMode);

    // Mark current stage as completed (하나라도 완료하면 completed)
    const updatedStages = stages.map(s => {
      if (s.id === currentStage) {
        return { ...s, status: 'completed' as const };
      }
      if (s.id === currentStage + 1) {
        return { ...s, status: 'unlocked' as const };
      }
      return s;
    });
    setStages(updatedStages);

    // Auto-advance to next stage or return to map
    if (currentStage === 5) {
      // Calculate completion stats for the entire journey
      const endTime = new Date();
      const completionTimeMs = startTime ? endTime.getTime() - startTime.getTime() : 0;
      const minutes = Math.floor(completionTimeMs / 60000);
      const seconds = Math.floor((completionTimeMs % 60000) / 1000);
      const completionTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;

      const totalQuestions = Object.values(questionBank).flat().length;
      const accuracy = Math.round((correctAnswersCount / totalQuestions) * 100);

      // Trigger full journey completion screen
      onQuizCompletion({
        xpGained: 0,
        completionTime,
        accuracy,
        totalQuestions,
        correctAnswers: correctAnswersCount,
        stageName: journeyName
      });
    } else {
      // Auto-advance to next stage after a short delay
      setTimeout(() => {
        const nextStage = stages.find(s => s.id === currentStage + 1);
        if (nextStage && nextStage.status !== 'locked') {
          handleStageClick(currentStage + 1);
        } else {
          resetToMap();
        }
      }, 800);
    }
  };

  const resetToMap = () => {
    setCurrentStage(null);
    setShowStageComplete(false);
    setCurrentQuestion(0);
    setSelectedAnswers([]);
    setShowFeedback(false);
    setLastAnswerCorrect(null);
    setShowSentenceTranslation(false);
    setStageScore(0);
  };

  const resetGame = () => {
    setStages(subjectStages[subjectId] || subjectStages.math);
    setShowVictory(false);
    setSessionXP(0);
    resetToMap();
  };





  if (currentStage) {
    const stage = stages.find(s => s.id === currentStage);
    
    // Check if we're in Match or Game mode and should show vocabulary games
    if (selectedQuizMode === 'match') {
      const matchWords = currentStage ? getMatchWordsForStage(currentStage) : vocabularyWords;
      if (!matchWords.length) {
        return (
          <div className="min-h-screen flex items-center justify-center text-[#091A7A]">
            <p>매치 게임을 진행할 단어가 부족합니다.</p>
          </div>
        );
      }
      return (
        <MatchQuizLayout
          words={matchWords}
          matchGameType={matchGameType || 'card-match-word'}
          onBack={resetToMap}
          onBackToHome={onBackToHome ? () => {
            resetQuiz();
            setActiveTab('word-list');
            onBackToHome();
          } : undefined}
          onComplete={(_, correctCount) => handleVocabularyGameCompletion(correctCount, stage)}
          onWrongAnswer={onWrongAnswer}
          stage={stage}
          journeyName={journeyName}
          wordCount={matchWords.length}
          isStarredVocabulary={isStarredVocabulary}
        />
      );
    }
    
    if (selectedQuizMode === 'game' && vocabularyWords.length > 0) {
      return (
        <ArcadeQuizLayout
          words={vocabularyWords}
          gameType={gameType || 'fall'}
          onBack={resetToMap}
          onComplete={(_, correctCount) => handleVocabularyGameCompletion(correctCount, stage)}
          onWrongAnswer={onWrongAnswer}
        />
      );
    }
    
    // Normal quiz mode
    const questions = currentStage
      ? shuffledQuestions[currentStage] || questionBank[currentStage] || []
      : [];
    const currentQ = questions[currentQuestion];

    if (!currentQ) {
      return (
        <div className="min-h-screen flex items-center justify-center text-[#091A7A]">
          <p>준비된 문제가 없습니다. 단어를 더 추가해 주세요.</p>
        </div>
      );
    }

    const isMultiSelect = currentQ.type === 'multi-select';
    const isSentenceQuestion = currentQ.type === 'sentence' && currentQ.sentenceData;

    return (
      <NormalQuizLayout
        stage={stage}
        currentStageId={currentStage}
        currentQuestionIndex={currentQuestion}
        totalQuestions={questions.length}
        question={currentQ}
        selectedAnswers={selectedAnswers}
        showFeedback={showFeedback}
        lastAnswerCorrect={lastAnswerCorrect}
        aiFeedback={aiFeedback}
        isMultiSelect={isMultiSelect}
        isSentenceQuestion={Boolean(isSentenceQuestion)}
        sentenceTranslationVisible={showSentenceTranslation}
        onBack={resetToMap}
        onBackToHome={onBackToHome ? () => {
          resetQuiz();
          setActiveTab('word-list');
          onBackToHome();
        } : undefined}
        onAnswerSelect={handleAnswerSelect}
        onToggleSentenceTranslation={() => setShowSentenceTranslation(!showSentenceTranslation)}
        onSubmitAnswer={handleSubmitAnswer}
        journeyName={journeyName}
        wordCount={filteredWords.length}
        isStarredVocabulary={isStarredVocabulary}
      />
    );
  }
                    
                    
  return (
    <div className="h-full bg-transparent relative flex flex-col">
      {/* Fixed Header and Tabs Container */}
      <div className={`flex-shrink-0 z-50 pdf-print-overlay bg-gradient-to-b ${isStarredVocabulary ? 'from-[#FFFBEB]/80 to-[#FEF3C7]/70' : 'from-[#D4C5FF] to-transparent'}`}>
        {/* Header */}
        <div className="p-6 pb-3">
          <div className="flex items-center justify-between">
            <BackButton onClick={onBack} />

            <div className="flex-1 mx-4 text-center">
              <h1 style={{ fontSize: '18px', fontWeight: 700, color: isStarredVocabulary ? '#78350F' : '#5B21B6' }}>
                {isStarredVocabulary ? '⭐ Starred Words' : journeyName}
              </h1>
              <p style={{ fontSize: '12px', fontWeight: 500, color: isStarredVocabulary ? '#D97706' : '#A78BFA' }}>
                {filteredWords.length}개의 단어
              </p>
            </div>

            {/* Home Button */}
            {onBackToHome ? (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  resetQuiz();
                  setActiveTab('word-list');
                  onBackToHome();
                }}
                className="w-10 h-10 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center shadow-card"
              >
                <Home className="w-5 h-5" style={{ color: isStarredVocabulary ? '#78350F' : '#5B21B6' }} />
              </motion.button>
            ) : (
              <div className="w-10 h-10"></div>
            )}
          </div>
        </div>

        {/* Tab Navigation - Fixed at top */}
        <div className="px-4 pb-2">
          <div className="bg-white/90 backdrop-blur-lg rounded-2xl border border-white/40 shadow-lg p-1.5">
          <div className="grid grid-cols-4 gap-1">
            {/* Word List Tab */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setActiveTab('word-list')}
              className={`py-2.5 px-2 rounded-xl flex flex-col items-center gap-1 transition-all duration-200 ${
                activeTab === 'word-list'
                  ? isStarredVocabulary
                    ? 'bg-gradient-to-br from-[#F59E0B] to-[#FCD34D] shadow-md'
                    : 'bg-gradient-to-br from-[#7C3AED] to-[#A78BFA] shadow-md'
                  : 'hover:bg-white/50'
              }`}
            >
              <List className={`w-4 h-4 ${activeTab === 'word-list' ? 'text-white' : isStarredVocabulary ? 'text-[#D97706]' : 'text-[#7C3AED]'}`} />
              <span className={`text-[10px] font-semibold ${activeTab === 'word-list' ? 'text-white' : isStarredVocabulary ? 'text-[#78350F]' : 'text-[#5B21B6]'}`}>
                Word List
              </span>
            </motion.button>

            {/* Quiz Map Tab */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setActiveTab('quiz-map')}
              className={`py-2.5 px-2 rounded-xl flex flex-col items-center gap-1 transition-all duration-200 ${
                activeTab === 'quiz-map'
                  ? isStarredVocabulary
                    ? 'bg-gradient-to-br from-[#F59E0B] to-[#FCD34D] shadow-md'
                    : 'bg-gradient-to-br from-[#7C3AED] to-[#A78BFA] shadow-md'
                  : 'hover:bg-white/50'
              }`}
            >
              <Gamepad2 className={`w-4 h-4 ${activeTab === 'quiz-map' ? 'text-white' : isStarredVocabulary ? 'text-[#D97706]' : 'text-[#7C3AED]'}`} />
              <span className={`text-[10px] font-semibold ${activeTab === 'quiz-map' ? 'text-white' : isStarredVocabulary ? 'text-[#78350F]' : 'text-[#5B21B6]'}`}>
                Quiz Map
              </span>
            </motion.button>

            {/* Flash Cards Tab */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setActiveTab('flashcards')}
              className={`py-2.5 px-2 rounded-xl flex flex-col items-center gap-1 transition-all duration-200 ${
                activeTab === 'flashcards'
                  ? isStarredVocabulary
                    ? 'bg-gradient-to-br from-[#F59E0B] to-[#FCD34D] shadow-md'
                    : 'bg-gradient-to-br from-[#7C3AED] to-[#A78BFA] shadow-md'
                  : 'hover:bg-white/50'
              }`}
            >
              <Layers className={`w-4 h-4 ${activeTab === 'flashcards' ? 'text-white' : isStarredVocabulary ? 'text-[#D97706]' : 'text-[#7C3AED]'}`} />
              <span className={`text-[10px] font-semibold ${activeTab === 'flashcards' ? 'text-white' : isStarredVocabulary ? 'text-[#78350F]' : 'text-[#5B21B6]'}`}>
                Flash Cards
              </span>
            </motion.button>

            {/* PDF Print Tab */}
            <motion.button
              whileTap={{ scale: canOpenPdfExport ? 0.97 : 1 }}
              onClick={() => canOpenPdfExport && setActiveTab('pdf-print')}
              className={`py-2.5 px-2 rounded-xl flex flex-col items-center gap-1 transition-all duration-200 ${
                activeTab === 'pdf-print'
                  ? isStarredVocabulary
                    ? 'bg-gradient-to-br from-[#F59E0B] to-[#FCD34D] shadow-md'
                    : 'bg-gradient-to-br from-[#7C3AED] to-[#A78BFA] shadow-md'
                  : canOpenPdfExport
                  ? 'hover:bg-white/50'
                  : 'opacity-40 cursor-not-allowed'
              }`}
            >
              <FileText className={`w-4 h-4 ${activeTab === 'pdf-print' ? 'text-white' : isStarredVocabulary ? 'text-[#D97706]' : 'text-[#7C3AED]'}`} />
              <span className={`text-[10px] font-semibold ${activeTab === 'pdf-print' ? 'text-white' : isStarredVocabulary ? 'text-[#78350F]' : 'text-[#5B21B6]'}`}>
                PDF Print
              </span>
            </motion.button>
          </div>
        </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 relative z-10 overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 'word-list' && (
            <motion.div
              key="word-list"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <WordListScreen
                onBack={onBack}
                onBackToHome={onBackToHome}
                vocabularyTitle={selectedSubject?.name || "어휘 학습"}
                unitName="Unit 1"
                vocabularyWords={vocabularyWords}
                starredWordIds={starredWordIds}
                graveyardWordIds={graveyardWordIds}
                wrongAnswersWordIds={wrongAnswersWordIds}
                isLoading={isLoading}
                vocabularyId={vocabularyId}
                onAddToStarred={onAddToStarred}
                onMoveToGraveyard={onMoveToGraveyard}
                onDeletePermanently={onDeletePermanently}
                onStartFlashcards={() => {
                  console.log('[GameMapQuizScreen] 💜 Flashcard button clicked in WordList! Setting activeTab to flashcards');
                  setActiveTab('flashcards');
                }}
                onRefreshVocabulary={refreshVocabulary}
                hideHeader={true}
              />
            </motion.div>
          )}

          {activeTab === 'quiz-map' && (
            <motion.div
              key="quiz-map"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="h-full overflow-y-auto scrollbar-hide"
            >
              {/* Duolingo-Style Map */}
              <div className="max-w-sm mx-auto relative pt-2 pb-4">
                {/* Elegant Connection Path */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none z-0"
                  viewBox="0 0 300 500"
                  preserveAspectRatio="xMidYMin meet"
                >
                  <defs>
                    <linearGradient id="pathGradientTab" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor={isStarredVocabulary ? "#FEF3C7" : "#DDD6FE"} stopOpacity="0.8" />
                      <stop offset="30%" stopColor={isStarredVocabulary ? "#FCD34D" : "#C4B5FD"} stopOpacity="0.5" />
                      <stop offset="70%" stopColor={isStarredVocabulary ? "#F59E0B" : "#A78BFA"} stopOpacity="0.5" />
                      <stop offset="100%" stopColor={isStarredVocabulary ? "#FEF3C7" : "#DDD6FE"} stopOpacity="0.8" />
                    </linearGradient>
                    <filter id="pathGlowTab">
                      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  <motion.path
                    d="M 150 30
                       C 150 45, 120 70, 90 110
                       C 60 150, 140 170, 210 200
                       C 280 230, 180 250, 90 290
                       C 0 330, 120 350, 150 390"
                    stroke="url(#pathGradientTab)"
                    strokeWidth="4"
                    fill="none"
                    strokeLinecap="round"
                    filter="url(#pathGlowTab)"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 2, ease: "easeInOut" }}
                  />
                </svg>

                {/* Enhanced Stage Nodes */}
                <div className="relative z-10">
                  {stages.map((stage, index) => {
                    const positions = [
                      { x: '50%', y: '30px', transform: 'translateX(-50%)' },
                      { x: '25%', y: '110px', transform: 'translateX(-50%)' },
                      { x: '65%', y: '200px', transform: 'translateX(-50%)' },
                      { x: '25%', y: '290px', transform: 'translateX(-50%)' },
                      { x: '50%', y: '380px', transform: 'translateX(-50%)' },
                    ];

                    const position = positions[index];

                    return (
                      <motion.div
                        key={stage.id}
                        initial={{ opacity: 0, scale: 0.8, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{
                          delay: index * 0.15,
                          duration: 0.7,
                          ease: [0.34, 1.56, 0.64, 1]
                        }}
                        className="absolute"
                        style={{
                          left: position.x,
                          top: position.y,
                          transform: position.transform,
                        }}
                      >
                        {/* Premium Stage Button */}
                        <motion.button
                          whileTap={{ scale: 0.92 }}
                          onClick={() => handleStageClick(stage.id)}
                          className={`relative w-[72px] h-[72px] rounded-3xl flex items-center justify-center transition-all duration-300 backdrop-blur-lg border-2 ${
                            stage.status === 'completed'
                              ? 'bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 border-white/30 text-white shadow-xl shadow-emerald-500/40'
                              : stage.status === 'current'
                              ? isStarredVocabulary
                                ? 'bg-gradient-to-br from-[#F59E0B] via-[#FBBF24] to-[#FCD34D] border-white/30 text-white shadow-xl shadow-amber-500/40'
                                : 'bg-gradient-to-br from-[#7C3AED] via-[#8B5CF6] to-[#A78BFA] border-white/30 text-white shadow-xl shadow-purple-500/40'
                              : 'bg-white/70 border-white/50 text-gray-400 shadow-md'
                          }`}
                        >
                          {/* Icon Display */}
                          {stage.status === 'completed' ? (
                            <motion.div
                              initial={{ scale: 0, rotate: -180 }}
                              animate={{ scale: 1, rotate: 0 }}
                              transition={{ delay: 0.4, type: "spring", stiffness: 300, damping: 15 }}
                            >
                              <CheckCircle className="w-8 h-8 drop-shadow-lg" />
                            </motion.div>
                          ) : (
                            <div className="relative">
                              <div className={`w-6 h-6 ${stage.status === 'locked' ? 'opacity-40' : ''}`}>
                                {stage.icon}
                              </div>
                            </div>
                          )}

                          {/* Number Badge */}
                          <div className={`absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-lg ${
                            stage.status === 'completed'
                              ? 'bg-white text-emerald-600'
                              : stage.status === 'current'
                              ? isStarredVocabulary
                                ? 'bg-white text-amber-600'
                                : 'bg-white text-purple-600'
                              : 'bg-gray-200 text-gray-500'
                          }`}>
                            {stage.id}
                          </div>

                          {/* Animated Glow for Current Stage */}
                          {stage.status === 'current' && (
                            <>
                              <motion.div
                                animate={{
                                  scale: [1, 1.3, 1],
                                  opacity: [0.6, 0, 0.6]
                                }}
                                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                                className={`absolute inset-0 ${isStarredVocabulary ? 'bg-amber-400' : 'bg-purple-400'} rounded-3xl blur-lg -z-10`}
                              />
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-0 rounded-3xl -z-10"
                                style={{
                                  background: isStarredVocabulary
                                    ? 'conic-gradient(from 0deg, transparent 0deg, rgba(251, 191, 36, 0.3) 90deg, transparent 180deg)'
                                    : 'conic-gradient(from 0deg, transparent 0deg, rgba(167, 139, 250, 0.3) 90deg, transparent 180deg)',
                                }}
                              />
                            </>
                          )}

                          {/* Success Glow */}
                          {stage.status === 'completed' && (
                            <motion.div
                              animate={{
                                scale: [1, 1.15, 1],
                                opacity: [0.5, 0.8, 0.5]
                              }}
                              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                              className="absolute inset-0 bg-emerald-400 rounded-3xl blur-xl -z-10"
                            />
                          )}
                        </motion.button>

                        {/* Enhanced Label */}
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.15 + 0.5 }}
                          className="absolute top-[78px] text-center z-20 max-w-[130px]"
                          style={{
                            left:
                              index === 3
                                ? '-15px'
                                : index === 1
                                ? '0px'
                                : index === 0 || index === 2
                                ? '26px'
                                : '36px',
                            transform:
                              index === 1
                                ? 'translateX(-100%)'
                                : index === 3
                                ? 'translateX(-120%)'
                                : 'translateX(-50%)'
                          }}
                        >
                          <div className={`px-2.5 py-1.5 rounded-xl backdrop-blur-lg shadow-md border ${
                            stage.status === 'completed'
                              ? 'bg-emerald-50/95 border-emerald-200/60 text-emerald-700'
                              : stage.status === 'current'
                              ? isStarredVocabulary
                                ? 'bg-white/95 border-amber-200/60 text-amber-700'
                                : 'bg-white/95 border-purple-200/60 text-purple-700'
                              : 'bg-white/80 border-white/40 text-gray-500'
                          }`}>
                            <div className={`text-[11px] ${stage.status === 'completed' ? 'font-semibold' : 'font-medium'}`}>
                              {stage.title}
                            </div>
                          </div>
                        </motion.div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Enhanced Progress Card - Compact */}
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2, duration: 0.8 }}
                  className="mt-[500px] mx-4 p-5 bg-white/95 backdrop-blur-xl rounded-3xl border-2 border-white/60 shadow-2xl"
                >
                  <div className="text-center space-y-4">
                    <div>
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <Sparkles className={`w-4 h-4 ${isStarredVocabulary ? 'text-amber-500' : 'text-purple-500'}`} />
                        <h3 className={`text-sm ${isStarredVocabulary ? 'text-amber-700' : 'text-purple-700'}`} style={{ fontWeight: 700 }}>Your Progress</h3>
                        <Sparkles className={`w-4 h-4 ${isStarredVocabulary ? 'text-amber-500' : 'text-purple-500'}`} />
                      </div>
                      <p className={`text-xs ${isStarredVocabulary ? 'text-amber-400' : 'text-purple-400'}`}>{journeyName}</p>
                    </div>

                    <div className="flex items-center justify-center gap-6">
                      <div className="text-center">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 1.5, type: "spring", stiffness: 200 }}
                          className={`text-2xl bg-gradient-to-br ${isStarredVocabulary ? 'from-amber-600 to-amber-400' : 'from-purple-600 to-purple-400'} bg-clip-text text-transparent mb-1`}
                          style={{ fontWeight: 700 }}
                        >
                          {stages.filter(s => s.status === 'completed').length}
                        </motion.div>
                        <div className={`text-xs ${isStarredVocabulary ? 'text-amber-500' : 'text-purple-500'}`} style={{ fontWeight: 600 }}>Completed</div>
                      </div>
                      <div className={`w-px h-10 bg-gradient-to-b from-transparent ${isStarredVocabulary ? 'via-amber-200' : 'via-purple-200'} to-transparent`}></div>
                      <div className="text-center">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 1.6, type: "spring", stiffness: 200 }}
                          className="text-2xl text-gray-300 mb-1"
                          style={{ fontWeight: 700 }}
                        >
                          {stages.filter(s => s.status === 'locked').length}
                        </motion.div>
                        <div className="text-xs text-gray-400" style={{ fontWeight: 600 }}>Remaining</div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className={`w-full h-2.5 ${isStarredVocabulary ? 'bg-amber-100/60' : 'bg-purple-100/60'} rounded-full overflow-hidden shadow-inner`}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(stages.filter(s => s.status === 'completed').length / stages.length) * 100}%` }}
                          transition={{ delay: 2, duration: 1.5, ease: [0.34, 1.56, 0.64, 1] }}
                          className={`h-full bg-gradient-to-r ${isStarredVocabulary ? 'from-amber-500 via-amber-400 to-amber-500' : 'from-purple-500 via-purple-400 to-purple-500'} rounded-full shadow-lg relative`}
                        >
                          <motion.div
                            animate={{ x: [-20, 100], opacity: [0, 1, 0] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                          />
                        </motion.div>
                      </div>
                      <div className={`text-[10px] ${isStarredVocabulary ? 'text-amber-400' : 'text-purple-400'}`} style={{ fontWeight: 600 }}>
                        {Math.round((stages.filter(s => s.status === 'completed').length / stages.length) * 100)}% Complete
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}

          {activeTab === 'flashcards' && (
            <motion.div
              key="flashcards"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <FlashcardScreen
                onBack={() => setActiveTab('word-list')}
                onBackToHome={onBackToHome}
                vocabularyWords={filteredWords}
                starredWordIds={starredWordIds}
                graveyardWordIds={graveyardWordIds}
                vocabularyId={vocabularyId}
                vocabularyTitle={selectedSubject?.name}
                onAddToStarred={onAddToStarred}
                onMoveToGraveyard={onMoveToGraveyard}
                onRefreshVocabulary={refreshVocabulary}
                hideHeader={true}
              />
            </motion.div>
          )}

          {activeTab === 'pdf-print' && canOpenPdfExport && (
            <motion.div
              key="pdf-print"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <PDFPrintScreen
                onBack={() => setActiveTab('word-list')}
                vocabularyId={selectedSubject?.id || ''}
                vocabularyTitle={selectedSubject?.name || ''}
                words={vocabularyWords}
                hideHeader={true}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Quiz Mode Selector Modal - for Quiz Map tab */}
      <AnimatePresence>
        {showQuizModeSelector && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={() => {
              setShowQuizModeSelector(false);
              setPendingStageId(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 20 }}
              className="bg-white/95 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border-2 border-white/60 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <h3 className="text-lg mb-1" style={{ fontWeight: 700, color: '#491B6D' }}>
                  퀴즈 방식 선택
                </h3>
                <p className="text-xs" style={{ color: '#8B5CF6' }}>
                  원하는 학습 방식을 선택하세요
                </p>
              </div>

              {(() => {
                const modalAvailableModes = pendingStageId
                  ? stageModeAvailability[pendingStageId] || ['normal']
                  : [];

                return (
                  <div className="space-y-3">
                    {/* Normal Mode */}
                    {modalAvailableModes.includes('normal') && (
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => pendingStageId && startQuiz(pendingStageId, 'normal')}
                        className={`w-full p-4 rounded-2xl shadow-lg flex items-center justify-between relative ${
                          pendingStageId && completedModes[pendingStageId]?.has('normal')
                            ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white'
                            : 'bg-gradient-to-br from-[#7C3AED] to-[#A78BFA] text-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                            <Target className="w-5 h-5" />
                          </div>
                          <div className="text-left">
                            <div className="text-sm" style={{ fontWeight: 700 }}>Normal</div>
                            <div className="text-xs opacity-80">일반 객관식 퀴즈</div>
                          </div>
                        </div>
                        {pendingStageId && completedModes[pendingStageId]?.has('normal') ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                      </motion.button>
                    )}

                    {/* Match Mode */}
                    {modalAvailableModes.includes('match') && (() => {
                      const poolLength = pendingStageId ? getMatchWordsForStage(pendingStageId).length : 0;
                      const matchDisabled = poolLength < MIN_MATCH_WORDS;
                      return (
                        <motion.button
                          whileTap={{ scale: matchDisabled ? 1 : 0.95 }}
                          onClick={() => {
                            if (matchDisabled || !pendingStageId) return;
                            startQuiz(pendingStageId, 'match');
                          }}
                          className={`w-full p-4 rounded-2xl shadow-md flex items-center justify-between ${
                            matchDisabled
                              ? 'bg-gray-100 border-2 border-dashed border-gray-300 text-gray-400 cursor-not-allowed'
                              : pendingStageId && completedModes[pendingStageId]?.has('match')
                              ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white border-2 border-emerald-300'
                              : 'bg-white border-2 border-[#A78BFA]'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              matchDisabled
                                ? 'bg-gray-200'
                                : pendingStageId && completedModes[pendingStageId]?.has('match')
                                ? 'bg-white/20'
                                : 'bg-[#EDE9FE]'
                          }`}>
                            <Puzzle className={`w-5 h-5 ${
                              matchDisabled
                                ? 'text-gray-400'
                                : pendingStageId && completedModes[pendingStageId]?.has('match')
                                ? 'text-white'
                                : 'text-[#7C3AED]'
                              }`} />
                            </div>
                            <div className="text-left">
                              <div className="text-sm" style={{
                                fontWeight: 700,
                              color: matchDisabled
                                ? '#9CA3AF'
                                : pendingStageId && completedModes[pendingStageId]?.has('match') ? '#fff' : '#491B6D'
                            }}>
                                Match
                              </div>
                              <div className="text-xs" style={{
                                color: matchDisabled
                                  ? '#9CA3AF'
                                  : pendingStageId && completedModes[pendingStageId]?.has('match') ? 'rgba(255,255,255,0.8)' : '#8B5CF6'
                              }}>
                                {matchDisabled ? `단어가 부족해요 (${poolLength}/${MIN_MATCH_WORDS})` : '단어-뜻 매칭 게임'}
                              </div>
                          </div>
                        </div>
                        {pendingStageId && completedModes[pendingStageId]?.has('match') ? (
                          <CheckCircle className="w-5 h-5 text-white" />
                          ) : matchDisabled ? (
                            <span className="text-xs text-gray-400">준비중</span>
                          ) : (
                            <ChevronRight className="w-5 h-5 text-[#7C3AED]" />
                          )}
                        </motion.button>
                      );
                    })()}

                    {/* Fill-in Mode */}
                    {modalAvailableModes.includes('normal') && (
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          if (!pendingStageId) return;
                          // Close quiz mode selector and show fill-in submode selector
                          setShowQuizModeSelector(false);
                          setQuizMode('fill-in');
                        }}
                        className={`w-full p-4 rounded-2xl shadow-md flex items-center justify-between ${
                          pendingStageId && completedModes[pendingStageId]?.has('fill-in')
                            ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white border-2 border-emerald-300'
                            : 'bg-white border-2 border-[#A78BFA]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            pendingStageId && completedModes[pendingStageId]?.has('fill-in')
                              ? 'bg-white/20'
                              : 'bg-[#EDE9FE]'
                          }`}>
                            <PenTool className={`w-5 h-5 ${
                              pendingStageId && completedModes[pendingStageId]?.has('fill-in')
                                ? 'text-white'
                                : 'text-[#7C3AED]'
                            }`} />
                          </div>
                          <div className="text-left">
                            <div className="text-sm" style={{
                              fontWeight: 700,
                              color: pendingStageId && completedModes[pendingStageId]?.has('fill-in') ? '#fff' : '#491B6D'
                            }}>
                              Fill-in
                            </div>
                            <div className="text-xs" style={{
                              color: pendingStageId && completedModes[pendingStageId]?.has('fill-in') ? 'rgba(255,255,255,0.8)' : '#8B5CF6'
                            }}>
                              주관식 타이핑 퀴즈
                            </div>
                          </div>
                        </div>
                        {pendingStageId && completedModes[pendingStageId]?.has('fill-in') ? (
                          <CheckCircle className="w-5 h-5 text-white" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-[#7C3AED]" />
                        )}
                      </motion.button>
                    )}
                  </div>
                );
              })()}

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setShowQuizModeSelector(false);
                  setPendingStageId(null);
                }}
                className="mt-4 w-full p-3 bg-gray-100 rounded-xl"
              >
                <span className="text-sm" style={{ fontWeight: 600, color: '#6B7280' }}>취소</span>
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fill-in Submode Selector Modal */}
      <AnimatePresence>
        {!showQuizModeSelector && selectedQuizMode === 'fill-in' && pendingStageId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => {
              setPendingStageId(null);
              setQuizMode('normal');
            }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 20 }}
              className="bg-white/95 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border-2 border-white/60 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <h3 className="text-lg mb-1" style={{ fontWeight: 700, color: '#491B6D' }}>
                  주관식 퀴즈 유형
                </h3>
                <p className="text-xs" style={{ color: '#8B5CF6' }}>
                  원하는 방향을 선택하세요
                </p>
              </div>

              <div className="space-y-3">
                {/* KR -> EN (뜻 보고 단어 쓰기) */}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    startQuiz(pendingStageId, 'fill-in', 'kr-to-en');
                  }}
                  className="w-full p-4 rounded-2xl shadow-md flex items-center justify-between bg-gradient-to-br from-[#7C3AED] to-[#A78BFA] text-white"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm" style={{ fontWeight: 700 }}>KR → EN</div>
                      <div className="text-xs opacity-80">뜻 보고 단어 쓰기</div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5" />
                </motion.button>

                {/* EN -> KR (단어 보고 뜻 쓰기) */}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    startQuiz(pendingStageId, 'fill-in', 'en-to-kr');
                  }}
                  className="w-full p-4 rounded-2xl shadow-md flex items-center justify-between bg-white border-2 border-[#A78BFA]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#EDE9FE] rounded-xl flex items-center justify-center">
                      <PenTool className="w-5 h-5 text-[#7C3AED]" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm" style={{ fontWeight: 700, color: '#491B6D' }}>EN → KR</div>
                      <div className="text-xs" style={{ color: '#8B5CF6' }}>단어 보고 뜻 쓰기 (AI 채점)</div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[#7C3AED]" />
                </motion.button>
              </div>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setQuizMode('normal');
                }}
                className="mt-4 w-full p-3 bg-gray-100 rounded-xl"
              >
                <span className="text-sm" style={{ fontWeight: 600, color: '#6B7280' }}>뒤로</span>
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
