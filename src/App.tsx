import { VocabularyCreatorScreen } from './components/VocabularyCreatorScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { SubjectDetailScreen } from './components/SubjectDetailScreen';
import { VideosScreen } from './components/VideosScreen';
import { VocabularyListScreen, invalidateVocabularyListCache } from './components/VocabularyListScreen';
import { LessonPlayerScreen } from './components/LessonPlayerScreen';
import { ProgressNotification } from './components/ProgressNotification';
import { InlineXPNotification } from './components/InlineXPNotification';
import { ProgressManager, UserProgress, ProgressUtils } from './components/ProgressManager';
import { ProgressSaveIndicator, useSaveStatus } from './components/ProgressSaveIndicator';
import { LoginScreen } from './components/LoginScreen';
import { SignupScreen } from './components/SignupScreen';
import { TextExtractorScreen } from './components/TextExtractorScreen';
import { WordListScreen } from './components/WordListScreen';
import { FlashcardScreen } from './components/FlashcardScreen';
import { GiftScreen } from './components/GiftScreen';
import { WordSelectionScreen } from './components/WordSelectionScreen';
import { AdminDashboard } from './components/AdminDashboard';
import { FullCalendarScreen } from './components/FullCalendarScreen';
import profileImage from './assets/1627f3a870e9b56d751d07f53392d7a84aa55817.png';
import { projectId, publicAnonKey } from './utils/supabase/info';
import { useAuth } from './hooks/useAuth';
import { useWordLists } from './hooks/useWordLists';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Header } from './components/Header';
import { SubjectsSection } from './components/SubjectsSection';
import { ProgressCard } from './components/ProgressCard';
import { CalendarWidget } from './components/CalendarWidget';
import { BottomNavigation } from './components/BottomNavigation';
import { VocabularyListSection, invalidateVocabularyListSectionCache } from './components/VocabularyListSection';
import { QuizScreen } from './components/QuizScreen';
import { GameMapQuizScreen } from './components/GameMapQuizScreen';
import { QuizCompletionScreen } from './components/QuizCompletionScreen';
import { AITutorScreen } from './components/AITutorScreen';
import { ZombieGameScreen } from './components/ZombieGame';
import { StudentCalendarScreen } from './admission/student/CalendarScreen';
import { Toaster } from './components/ui/sonner';

export type Screen =
  | 'login'
  | 'signup'
  | 'home'
  | 'quiz'
  | 'game-map-quiz'
  | 'quiz-completion'
  | 'ai'
  | 'ai-tutor'
  | 'profile'
  | 'subject-detail'
  | 'videos'
  | 'vocabulary-list'
  | 'lesson-player'
  | 'text-extractor'
  | 'word-list'
  | 'flashcard'
  | 'gift'
  | 'word-selection'
  | 'vocabulary-creator'
  | 'full-calendar'
  | 'calendar'
  | 'zombie-game';

const SCREEN_TO_PATH: Record<Screen, string> = {
  login: '/login',
  signup: '/signup',
  home: '/',
  quiz: '/quiz',
  'game-map-quiz': '/game-map-quiz',
  'quiz-completion': '/quiz-completion',
  ai: '/ai',
  'ai-tutor': '/ai-tutor',
  profile: '/profile',
  'subject-detail': '/subject-detail',
  videos: '/videos',
  'vocabulary-list': '/vocabulary-list',
  'lesson-player': '/lesson-player',
  'text-extractor': '/text-extractor',
  'word-list': '/word-list',
  flashcard: '/flashcard',
  gift: '/gift',
  'word-selection': '/word-selection',
  'vocabulary-creator': '/vocabulary-creator',
  'full-calendar': '/full-calendar',
  calendar: '/calendar',
  'zombie-game': '/zombie-game',
};

const PATH_TO_SCREEN: Record<string, Screen> = Object.entries(SCREEN_TO_PATH).reduce(
  (acc, [screen, path]) => {
    acc[path] = screen as Screen;
    return acc;
  },
  {} as Record<string, Screen>
);

PATH_TO_SCREEN['/home'] = 'home';
PATH_TO_SCREEN[''] = 'home';

export interface Subject {
  id: string;
  name: string;
  description: string;
  progress: number;
  icon: React.ReactNode;
  color: string;
}

export default function App() {
  // ============================================
  // HOOKS
  // ============================================
  const auth = useAuth();
  const wordLists = useWordLists(auth.getAuthToken);
  const { saveStatus, showIndicator, triggerSave } = useSaveStatus();
  const navigate = useNavigate();
  const location = useLocation();
  const currentScreen = useMemo<Screen>(() => {
    let normalizedPath = location.pathname;
    if (normalizedPath.length > 1 && normalizedPath.endsWith('/')) {
      normalizedPath = normalizedPath.replace(/\/+$/, '');
    }
    return (PATH_TO_SCREEN[normalizedPath] ?? 'home') as Screen;
  }, [location.pathname]);
  
  // ============================================
  // STATE
  // ============================================
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);
  const [selectedVocabulary, setSelectedVocabulary] = useState<{ id: string; title: string; unitNumber?: number } | null>(null);
  const [isLoadingVocabulary, setIsLoadingVocabulary] = useState(false);
  const [vocabularyWords, setVocabularyWords] = useState<any[]>([]); // 단어 데이터 저장
  const [selectedSharedVocabulary, setSelectedSharedVocabulary] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userXP, setUserXP] = useState(5500);
  const [completionData, setCompletionData] = useState({
    xpGained: 0,
    completionTime: '0:00',
    accuracy: 0,
    totalQuestions: 0,
    correctAnswers: 0,
    stageName: ''
  });
  const [currentProgress, setCurrentProgress] = useState(40);
  const [totalQuizzesCompleted, setTotalQuizzesCompleted] = useState(2);
  const [showXPAnimation, setShowXPAnimation] = useState(false);
  const [recentXPGain, setRecentXPGain] = useState(0);
  const [showProgressNotification, setShowProgressNotification] = useState(false);
  const [notificationData, setNotificationData] = useState({
    type: 'xp-gain' as const,
    title: '',
    subtitle: '',
    xpGain: 0
  });
  const [showInlineXP, setShowInlineXP] = useState(false);
  const [levelProgress, setLevelProgress] = useState(ProgressUtils.calculateLevel(5500));
  const [completedStages, setCompletedStages] = useState<number[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [showAdmin, setShowAdmin] = useState(false);
  const [selectedDday, setSelectedDday] = useState<{ name: string; date: Date; color: string } | null>({
    name: '서울대학교 원서접수',
    date: new Date(2025, 8, 15), // Sep 15, 2025
    color: '#8B5CF6'
  });
  const [showDdayModal, setShowDdayModal] = useState(false);
  const [showWordList, setShowWordList] = useState(false);
  const vocabularyCacheRef = useRef<Record<string, any[]>>({});
  const prefetchPromisesRef = useRef<Record<string, Promise<void> | null>>({});

  const fetchVocabulary = async (vocabId: string, unitNumber?: number) => {
    const token = auth.getAuthToken();
    if (!token) throw new Error('인증 토큰이 없습니다.');

    const isSpecial =
      vocabId === 'starred' || vocabId === 'graveyard' || vocabId === 'wrong-answers';

    let endpoint = isSpecial
      ? `https://${projectId}.supabase.co/functions/v1/server/${vocabId}`
      : `https://${projectId}.supabase.co/functions/v1/server/user-vocabularies/${vocabId}`;

    // Add unit number query parameter if specified
    if (unitNumber && !isSpecial) {
      endpoint += `?unit=${unitNumber}`;
    }

    const response = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to load ${vocabId} words`);
    }

    const data = await response.json();
    return data.words || [];
  };
  
  const illustrationImage = "https://images.unsplash.com/photo-1743247299142-8f1c919776c4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHwzZCUyMGNoYXJhY3RlciUyMGxlYXJuaW5nJTIwaWxsdXN0cmF0aW9ufGVufDF8fHx8MTc1NzQzMTU5MHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral";

  // Navigation helper functions
  const navigateToScreen = useCallback((screen: Screen, options?: { replace?: boolean }) => {
    const path = SCREEN_TO_PATH[screen];
    if (!path) return;
    console.log('[Navigate] Going to screen:', screen, path);
    navigate(path, { replace: options?.replace });
  }, [navigate]);

  const navigateBack = useCallback(() => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      navigate(-1);
    } else {
      navigateToScreen('home', { replace: true });
    }
  }, [navigate, navigateToScreen]);

  const selectVocabulary = (id: string, title: string, unitNumber?: number) => {
    const cacheKey = unitNumber ? `${id}-unit-${unitNumber}` : id;
    const cachedWords = vocabularyCacheRef.current[cacheKey];
    if (cachedWords) {
      setVocabularyWords(cachedWords);
      setIsLoadingVocabulary(false);
    } else {
      setIsLoadingVocabulary(true);
    }
    setSelectedVocabulary({ id, title, unitNumber });
  };

  // Refresh current vocabulary data (invalidate cache and reload)
  const refreshCurrentVocabulary = useCallback(async () => {
    console.log('[App] refreshCurrentVocabulary called, selectedVocabulary:', selectedVocabulary);
    if (!selectedVocabulary?.id) {
      console.log('[App] No selectedVocabulary.id, skipping refresh');
      return;
    }

    const cacheKey = selectedVocabulary.unitNumber
      ? `${selectedVocabulary.id}-unit-${selectedVocabulary.unitNumber}`
      : selectedVocabulary.id;

    console.log('[App] Invalidating cache for key:', cacheKey);
    // Invalidate cache
    delete vocabularyCacheRef.current[cacheKey];

    // Reload vocabulary
    try {
      setIsLoadingVocabulary(true);
      console.log('[App] Fetching fresh vocabulary data...');
      const words = await fetchVocabulary(selectedVocabulary.id, selectedVocabulary.unitNumber);
      console.log(`[App] Fetched ${words.length} words`);
      vocabularyCacheRef.current[cacheKey] = words;
      setVocabularyWords(words);
      console.log('[App] vocabularyWords state updated');
    } catch (error) {
      console.error('[App] Error refreshing vocabulary:', error);
    } finally {
      setIsLoadingVocabulary(false);
    }
  }, [selectedVocabulary?.id, selectedVocabulary?.unitNumber]);

  const handleSubjectClick = (subject: Subject) => {
    setSelectedSubject(subject);

    if (subject.id === 'starred' || subject.id === 'graveyard' || subject.id === 'wrong-answers') {
      selectVocabulary(subject.id, subject.name);
      navigateToScreen('word-list');
    } else {
      navigateToScreen('subject-detail');
    }
  };

  const handleBackToHome = () => {
    setSelectedSubject(null);
    setSelectedLesson(null);
    navigateToScreen('home', { replace: true });
  };

  useEffect(() => {
    if (currentScreen === 'home') {
      setSelectedSubject(null);
      setSelectedLesson(null);
    }
  }, [currentScreen]);

  const handleXPGain = (points: number) => {
    const oldXP = userXP;
    const newXP = oldXP + points;
    
    setRecentXPGain(points);
    setShowXPAnimation(true);
    setUserXP(newXP);
    
    // Update level progress
    const newLevelProgress = ProgressUtils.calculateLevel(newXP);
    setLevelProgress(newLevelProgress);
    
    // Check for level up
    const leveledUp = ProgressUtils.checkForLevelUp(oldXP, newXP);
    if (leveledUp) {
      setNotificationData({
        type: 'level-up',
        title: `Level ${newLevelProgress.currentLevel}!`,
        subtitle: 'You leveled up! Keep going!',
        xpGain: points
      });
      setShowProgressNotification(true);
    } else {
      // Show immediate inline XP feedback
      setShowInlineXP(true);
      setTimeout(() => setShowInlineXP(false), 2000);
      
      // Show detailed XP gain notification for larger amounts
      if (points >= 25) {
        setNotificationData({
          type: 'xp-gain',
          title: 'Excellent Work!',
          subtitle: 'You earned bonus XP!',
          xpGain: points
        });
        setShowProgressNotification(true);
      }
    }
    
    // Trigger save indicator
    triggerProgressSave();
  };

  const handleLessonClick = (lessonTitle: string) => {
    setSelectedLesson(lessonTitle);
    navigateToScreen('lesson-player');
  };

  const handleQuizCompletion = (data: {
    xpGained: number;
    completionTime: string;
    accuracy: number;
    totalQuestions: number;
    correctAnswers: number;
    stageName: string;
  }) => {
    setCompletionData(data);
    
    // Update progress and stats
    setTotalQuizzesCompleted(prev => prev + 1);
    const newProgress = Math.min(100, currentProgress + (data.accuracy >= 50 ? 20 : 10));
    setCurrentProgress(newProgress);
    
    // Real-time XP gain
    const oldXP = userXP;
    const newXP = oldXP + data.xpGained;
    setRecentXPGain(data.xpGained);
    setShowXPAnimation(true);
    setUserXP(newXP);
    
    // Update level progress
    const newLevelProgress = ProgressUtils.calculateLevel(newXP);
    setLevelProgress(newLevelProgress);
    
    // Check for level up
    const leveledUp = ProgressUtils.checkForLevelUp(oldXP, newXP);
    
    // Show completion notification
    setTimeout(() => {
      if (leveledUp) {
        setNotificationData({
          type: 'level-up',
          title: `Level ${newLevelProgress.currentLevel}!`,
          subtitle: 'Quiz completed with a level up!',
          xpGain: data.xpGained
        });
      } else {
        setNotificationData({
          type: 'quiz-complete',
          title: 'Quiz Completed!',
          subtitle: `${data.correctAnswers}/${data.totalQuestions} correct • ${data.accuracy}% accuracy`,
          xpGain: data.xpGained
        });
      }
      setShowProgressNotification(true);
    }, 1000);
    
    // Trigger save indicator
    triggerProgressSave();
    
    navigateToScreen('quiz-completion');
  };

  const handleXPAnimationComplete = () => {
    setShowXPAnimation(false);
    setRecentXPGain(0);
  };

  const handleNotificationComplete = () => {
    setShowProgressNotification(false);
  };

  // Handle progress loading from storage
  const handleProgressLoaded = (progress: UserProgress) => {
    setUserXP(progress.userXP);
    setCurrentProgress(progress.currentProgress);
    setTotalQuizzesCompleted(progress.totalQuizzesCompleted);
    setLevelProgress(progress.levelProgress);
    setCompletedStages(progress.completedStages);
    setAchievements(progress.achievements);
    console.log('📊 Progress loaded:', progress);
  };

  // Trigger save indicator when progress changes
  const triggerProgressSave = () => {
    triggerSave();
  };

  const handleRetakeQuiz = () => {
    navigateToScreen('game-map-quiz');
  };

  const handleNextChallenge = () => {
    handleBackToHome();
  };

  const handleOpeningComplete = () => {
    navigateToScreen('signup');
  };

  const handleSignupComplete = (user: any, token: string) => {
    console.log('✅ Signup complete! User:', user.id);
    auth.login(user, token);
    navigateToScreen('home');
    
    // ✅ 로그인 후 즉시 단어 목록 로드
    setTimeout(() => {
      console.log('🔄 Loading word lists after login...');
      wordLists.loadWordLists();
    }, 100); // 약간의 지연으로 토큰이 확실히 저장되도록
  };

  const handleAdminAccess = () => {
    setShowAdmin(true);
  };

  const handleAdminClose = () => {
    setShowAdmin(false);
  };

  const handleLogout = () => {
    if (confirm('정말 로그아웃 하시겠습니까?')) {
      // Use auth hook's logout
      auth.logout();
      if (wordLists.resetStore) {
        wordLists.resetStore();
      }
      
      // Clear all user progress data
      setUserXP(0);
      setCompletedStages([]);
      
      // Navigate to login screen
      navigateToScreen('login', { replace: true });
      
      console.log('✅ Logged out successfully');
    }
  };

  // Load vocabulary words when selectedVocabulary changes
  useEffect(() => {
    const loadVocabularyWords = async () => {
      if (!selectedVocabulary || !selectedVocabulary.id) {
        setVocabularyWords([]);
        setIsLoadingVocabulary(false);
        return;
      }

      const cacheKey = selectedVocabulary.unitNumber
        ? `${selectedVocabulary.id}-unit-${selectedVocabulary.unitNumber}`
        : selectedVocabulary.id;
      const cachedWords = vocabularyCacheRef.current[cacheKey];
      if (cachedWords) {
        setVocabularyWords(cachedWords);
        setIsLoadingVocabulary(false);
      } else {
        setIsLoadingVocabulary(true);
      }

      try {
        const logMessage = selectedVocabulary.unitNumber
          ? `🔄 Loading words for vocabulary: ${selectedVocabulary.id} (Unit ${selectedVocabulary.unitNumber})`
          : `🔄 Loading words for vocabulary: ${selectedVocabulary.id}`;
        console.log(logMessage);
        const words = await fetchVocabulary(selectedVocabulary.id, selectedVocabulary.unitNumber);
        console.log(`✅ Loaded ${words.length} words for vocabulary`);
        vocabularyCacheRef.current[cacheKey] = words;
        setVocabularyWords(words);
      } catch (error) {
        console.error('❌ Error loading vocabulary words:', error);
        setVocabularyWords([]);
      } finally {
        setIsLoadingVocabulary(false);
      }
    };
    loadVocabularyWords();
  }, [selectedVocabulary?.id, selectedVocabulary?.unitNumber]); // Depend on ID and unitNumber

  const schedulePrefetch = useCallback(
    (cacheKey: string) => {
      // ✅ Don't prefetch if still initializing or not authenticated
      if (auth.isInitializing || !auth.isAuthenticated) {
        return;
      }

      delete vocabularyCacheRef.current[cacheKey];

      if (prefetchPromisesRef.current[cacheKey]) {
        return;
      }

      if (typeof navigator !== 'undefined' && navigator && 'onLine' in navigator) {
        if (!navigator.onLine) return;
      }

      prefetchPromisesRef.current[cacheKey] = new Promise((resolve) => {
        setTimeout(async () => {
          try {
            const words = await fetchVocabulary(cacheKey);
            vocabularyCacheRef.current[cacheKey] = words;
            if (selectedVocabulary?.id === cacheKey) {
              setVocabularyWords(words);
              setIsLoadingVocabulary(false);
            }
          } catch (error) {
            console.warn(`[Prefetch] Failed to refresh ${cacheKey}:`, error);
          } finally {
            prefetchPromisesRef.current[cacheKey] = null;
            resolve();
          }
        }, 200);
      });
    },
    [selectedVocabulary?.id, auth.isAuthenticated, auth.isInitializing]
  );

  // Invalidate caches when starred/graveyard/wrong-answers lists change
  useEffect(() => {
    if (auth.isAuthenticated) {
      schedulePrefetch('starred');
    }
  }, [wordLists.starredWords, schedulePrefetch, auth.isAuthenticated]);

  useEffect(() => {
    if (auth.isAuthenticated) {
      schedulePrefetch('graveyard');
    }
  }, [wordLists.graveyardWords, schedulePrefetch, auth.isAuthenticated]);

  useEffect(() => {
    if (auth.isAuthenticated) {
      schedulePrefetch('wrong-answers');
    }
  }, [wordLists.wrongAnswersWords, schedulePrefetch, auth.isAuthenticated]);

  // Handle authentication redirects
  useEffect(() => {
    if (auth.isInitializing) {
      return;
    }

    if (auth.isAuthenticated) {
      if (currentScreen === 'login' || currentScreen === 'signup') {
        navigateToScreen('home', { replace: true });
      }
    } else if (currentScreen !== 'login' && currentScreen !== 'signup') {
      navigateToScreen('login', { replace: true });
    }
  }, [auth.isAuthenticated, auth.isInitializing, currentScreen, navigateToScreen]);

  // ✅ Auto-load word lists when app mounts and user is authenticated
  useEffect(() => {
    if (auth.isAuthenticated && !auth.isInitializing) {
      console.log('🚀 App mounted with authenticated user, loading word lists...');
      // Small delay to ensure token is ready
      setTimeout(() => {
        wordLists.loadWordLists();
      }, 200);
    }
  }, [auth.isAuthenticated, auth.isInitializing]);

  const renderScreen = () => {
    // ✅ Wait for auth initialization
    if (auth.isInitializing) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      );
    }

    switch (currentScreen) {
      case 'login':
        return <LoginScreen onLoginComplete={handleSignupComplete} onGoToSignup={() => navigateToScreen('signup')} />;
      case 'signup':
        return <SignupScreen onBack={() => navigateToScreen('login')} onSignupComplete={handleSignupComplete} />;
      case 'home':
        return (
          <div className="space-y-6">
            <Header
              profileImage={profileImage}
              userXP={userXP}
              recentXPGain={recentXPGain}
              showXPAnimation={showXPAnimation}
              onXPAnimationComplete={handleXPAnimationComplete}
              levelProgress={levelProgress}
              onAdminAccess={handleAdminAccess}
              ddayInfo={selectedDday}
              onDdayClick={() => setShowDdayModal(true)}
              onLogout={handleLogout}
              userName={auth.currentUser?.user_metadata?.name || auth.currentUser?.email?.split('@')[0]}
            />
            <SubjectsSection
              onSubjectClick={handleSubjectClick}
              onCalendarClick={() => navigateToScreen('calendar')}
              starredCount={wordLists.starredWords.length}
              graveyardCount={wordLists.graveyardWords.length}
              wrongAnswersCount={wordLists.wrongAnswersWords.length}
            />
            <VocabularyListSection
              onSelectVocabulary={(id, title, unitNumber) => {
                selectVocabulary(id, title, unitNumber);
                setSelectedSubject({
                  id: id,
                  name: title,
                  description: '',
                  progress: 0,
                  icon: null,
                  color: '#491B6D'
                });
                navigateToScreen('game-map-quiz');
              }}
              onStartFlashcards={(id, title, unitNumber) => {
                selectVocabulary(id, title, unitNumber);
                setSelectedSubject({
                  id: id,
                  name: title,
                  description: '',
                  progress: 0,
                  icon: null,
                  color: '#491B6D'
                });
                navigateToScreen('flashcard');
              }}
              getAuthToken={auth.getAuthToken}
              onRefresh={() => {
                // Invalidate cache and refresh
                wordLists.refreshMyVocabularies();
              }}
            />
            {/* Copyright Footer */}
            <div className="px-6 pb-4 pt-3">
              <div className="text-center text-gray-600" style={{ fontSize: '11px' }}>
                © JEJETRANSFER. All rights reserved. · Made by 제제샘
              </div>
            </div>
          </div>
        );
      case 'quiz':
        return <QuizScreen onBack={navigateBack} onXPGain={handleXPGain} />;
      case 'game-map-quiz':
        return <GameMapQuizScreen
          onBack={navigateBack}
          onBackToHome={handleBackToHome}
          onXPGain={handleXPGain}
          userXP={userXP}
          selectedSubject={selectedSubject}
          vocabularyTitle={selectedVocabulary?.title}
          vocabularyWords={vocabularyWords}
          onQuizCompletion={handleQuizCompletion}
          onWrongAnswer={wordLists.addWrongAnswer}
          starredWordIds={wordLists.starredWords}
          graveyardWordIds={wordLists.graveyardWords}
          wrongAnswersWordIds={wordLists.wrongAnswersWords}
          onAddToStarred={wordLists.toggleStarred}
          onMoveToGraveyard={wordLists.moveToGraveyard}
          onDeletePermanently={wordLists.deletePermanently}
          getAuthToken={auth.getAuthToken}
          onRefreshVocabulary={refreshCurrentVocabulary}
          vocabularyId={selectedVocabulary?.id}
          isLoading={isLoadingVocabulary}
        />;
      case 'quiz-completion':
        return <QuizCompletionScreen
          onBack={navigateBack}
          onRetakeQuiz={handleRetakeQuiz}
          onNextChallenge={handleNextChallenge}
          userXP={userXP}
          xpGained={completionData.xpGained}
          completionTime={completionData.completionTime}
          accuracy={completionData.accuracy}
          totalQuestions={completionData.totalQuestions}
          correctAnswers={completionData.correctAnswers}
          stageName={completionData.stageName}
        />;
      case 'ai':
      case 'ai-tutor':
        return <AITutorScreen onBack={navigateBack} />;
      case 'profile':
        return <ProfileScreen onBack={navigateBack} userXP={userXP} profileImage={profileImage} levelProgress={levelProgress} />;
      case 'videos':
        return <VideosScreen onBack={navigateBack} getAuthToken={auth.getAuthToken} />;
      case 'vocabulary-list':
        return <VocabularyListScreen
          key={Date.now()} // Force remount when navigating to this screen
          onBack={navigateBack}
          onBackToHome={handleBackToHome}
          onSelectVocabulary={(id, title, unitNumber) => {
            selectVocabulary(id, title, unitNumber);
            setSelectedSubject({
              id: id,
              name: title,
              description: '',
              progress: 0,
              icon: null,
              color: '#491B6D'
            });
            navigateToScreen('game-map-quiz');
          }}
          onStartFlashcards={(id, title, unitNumber) => {
            selectVocabulary(id, title, unitNumber);
            setSelectedSubject({
              id: id,
              name: title,
              description: '',
              progress: 0,
              icon: null,
              color: '#491B6D'
            });
            navigateToScreen('flashcard');
          }}
          getAuthToken={auth.getAuthToken}
        />;
      case 'subject-detail':
        return selectedSubject ? (
          <SubjectDetailScreen 
            subject={selectedSubject} 
            onBack={navigateBack}
            onStartQuiz={() => navigateToScreen('game-map-quiz')}
            onLessonClick={handleLessonClick}
          />
        ) : null;
      case 'lesson-player':
        return <LessonPlayerScreen 
          onBack={navigateBack} 
          onTakeQuiz={() => navigateToScreen('game-map-quiz')} 
          lessonTitle={selectedLesson || 'Introduction to Algebra'}
        />;
      case 'text-extractor':
        return <TextExtractorScreen
          onBack={navigateBack}
          onNavigateToTutor={(question, context) => {
            // Store the context and question for AI Tutor
            sessionStorage.setItem('tutorContext', context);
            sessionStorage.setItem('tutorInitialQuestion', question);
            navigateToScreen('ai-tutor');
          }}
        />;
      case 'word-list':
        if (!selectedSubject) return null;

        // 로딩 스피너 표시 (별표/무덤/오답 단어장)
        if (wordLists.isLoading && (selectedSubject.id === 'starred' || selectedSubject.id === 'graveyard' || selectedSubject.id === 'wrong-answers')) {
          return (
            <div className="h-full flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
                <p className="text-sm font-medium text-purple-600">단어를 불러오는 중...</p>
              </div>
            </div>
          );
        }

        // 별표 단어장에만 GameMapQuizScreen 사용 (4-tab 인터페이스)
        if (selectedSubject.id === 'starred') {
          return (
            <GameMapQuizScreen
              onBack={navigateBack}
              onBackToHome={handleBackToHome}
              onXPGain={handleXPGain}
              userXP={userXP}
              selectedSubject={selectedSubject}
              vocabularyTitle={selectedSubject.name}
              onQuizCompletion={handleQuizCompletion}
              onWrongAnswer={wordLists.addWrongAnswer}
              starredWordIds={wordLists.starredWords}
              graveyardWordIds={wordLists.graveyardWords}
              wrongAnswersWordIds={wordLists.wrongAnswersWords}
              onAddToStarred={wordLists.toggleStarred}
              onMoveToGraveyard={wordLists.moveToGraveyard}
              onDeletePermanently={wordLists.deletePermanently}
              getAuthToken={auth.getAuthToken}
              onRefreshVocabulary={refreshCurrentVocabulary}
              vocabularyId={selectedVocabulary?.id}
              isLoading={isLoadingVocabulary}
            />
          );
        }

        // 묘지/오답 단어장에는 WordListScreen 사용 (게임 포함)
        if (selectedSubject.id === 'graveyard' || selectedSubject.id === 'wrong-answers') {
          return (
            <WordListScreen
              onBack={navigateBack}
              onBackToHome={handleBackToHome}
              vocabularyTitle={selectedSubject.name}
              unitName={selectedSubject.id === 'graveyard' ? 'Graveyard Collection' : 'Wrong Answers Collection'}
              vocabularyWords={vocabularyWords}
              filterType={selectedSubject.id === 'graveyard' ? 'graveyard' : 'wrong-answers'}
              starredWordIds={wordLists.starredWords}
              graveyardWordIds={wordLists.graveyardWords}
              wrongAnswersWordIds={wordLists.wrongAnswersWords}
              isLoading={isLoadingVocabulary}
              vocabularyId={selectedVocabulary?.id}
              onAddToStarred={wordLists.toggleStarred}
              onMoveToGraveyard={wordLists.moveToGraveyard}
              onDeletePermanently={wordLists.deletePermanently}
              onStartFlashcards={() => navigateToScreen('flashcard')}
              onRefreshVocabulary={refreshCurrentVocabulary}
            />
          );
        }

        // 일반 단어장에는 WordListScreen 사용
        return (
          <WordListScreen
            onBack={navigateBack}
            onBackToHome={handleBackToHome}
            vocabularyTitle={selectedSubject.name}
            unitName={selectedVocabulary?.unitNumber ? `Unit ${selectedVocabulary.unitNumber}` : 'Unit 1'}
            vocabularyWords={vocabularyWords}
            filterType={'all'}
            starredWordIds={wordLists.starredWords}
            graveyardWordIds={wordLists.graveyardWords}
            wrongAnswersWordIds={wordLists.wrongAnswersWords}
            isLoading={isLoadingVocabulary}
            vocabularyId={selectedVocabulary?.id}
            onAddToStarred={wordLists.toggleStarred}
            onMoveToGraveyard={wordLists.moveToGraveyard}
            onDeletePermanently={wordLists.deletePermanently}
            onStartFlashcards={() => {
              console.log('[App] onStartFlashcards called, navigating to flashcard');
              navigateToScreen('flashcard');
            }}
            onRefreshVocabulary={refreshCurrentVocabulary}
          />
        );
      case 'flashcard':
        return <FlashcardScreen
          onBack={navigateBack}
          onBackToHome={handleBackToHome}
          vocabularyWords={vocabularyWords}
          starredWordIds={wordLists.starredWords}
          graveyardWordIds={wordLists.graveyardWords}
          onAddToStarred={wordLists.toggleStarred}
          onMoveToGraveyard={wordLists.moveToGraveyard}
          vocabularyId={selectedVocabulary?.id}
          vocabularyTitle={selectedVocabulary?.title}
          onRefreshVocabulary={refreshCurrentVocabulary}
        />;
      case 'zombie-game':
        return <ZombieGameScreen
          vocabularyWords={vocabularyWords}
          onBack={navigateBack}
          onBackToHome={handleBackToHome}
        />;
      case 'gift':
        return <GiftScreen
          onBack={() => {
            navigateBack();
            // 홈으로 돌아갈 때 단어장 목록 새로고침
            invalidateVocabularyListCache();
            invalidateVocabularyListSectionCache();
            wordLists.refreshMyVocabularies();
          }}
          onSelectVocabulary={async (vocab) => {
            console.log('📚 Adding shared vocabulary:', vocab.title);

            try {
              // Get all words from the shared vocabulary
              const wordsResponse = await fetch(
                `https://${projectId}.supabase.co/functions/v1/server/shared-vocabulary/${vocab.id}/words`,
                {
                  headers: {
                    'Authorization': `Bearer ${publicAnonKey}`,
                  },
                }
              );

              const wordsData = await wordsResponse.json();
              const allWords = wordsData.words || [];
              const selectedWordIds = allWords.map((w: any) => w.id);

              console.log(`📦 Adding ${selectedWordIds.length} words...`);

              // Call API to add to user collection
              const addResponse = await fetch(
                `https://${projectId}.supabase.co/functions/v1/server/user-vocabularies/add-shared`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${auth.getAuthToken()}`,
                  },
                  body: JSON.stringify({
                    sharedVocabularyId: vocab.id,
                    selectedWordIds,
                  }),
                }
              );

              const result = await addResponse.json();

              if (!addResponse.ok) {
                console.error('❌ Server error:', addResponse.status, result);
                throw new Error(result.error || `Server error: ${addResponse.status}`);
              }

              if (result.vocabulary) {
                console.log('✅ Successfully added vocabulary to user collection');

                alert(`"${vocab.title}" 단어장이 추가되었습니다! (${selectedWordIds.length}개 단어)`);
              } else {
                throw new Error(result.error || 'Failed to add vocabulary');
              }
            } catch (error) {
              console.error('❌ Error adding vocabulary:', error);
              alert(`단어장 추가에 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
            }
          }}
        />;
      case 'word-selection':
        return selectedSharedVocabulary ? (
          <WordSelectionScreen 
            vocabularyId={selectedSharedVocabulary.id}
            vocabularyName={selectedSharedVocabulary.title}
            totalWords={selectedSharedVocabulary.total_words || 0}
            onBack={navigateBack}
            onComplete={async (selectedWordIds, wordsPerUnit) => {
              try {
                console.log('📚 Adding shared vocabulary to user collection...');
                console.log('Selected words:', selectedWordIds.length);
                console.log('Words per unit:', wordsPerUnit);
                
                // Get full word details from shared vocabulary
                const response = await fetch(
                  `https://${projectId}.supabase.co/functions/v1/server/shared-vocabulary/${selectedSharedVocabulary.id}/words`,
                  {
                    headers: {
                      'Authorization': `Bearer ${publicAnonKey}`,
                    },
                  }
                );
                
                const data = await response.json();
                const allWords = data.words || [];
                
                // Filter selected words
                const selectedWords = allWords.filter((word: any) => 
                  selectedWordIds.includes(word.id)
                );
                
                // Call Supabase API to add to user collection
                const addResponse = await fetch(
                  `https://${projectId}.supabase.co/functions/v1/server/user-vocabularies/add-shared`,
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${auth.getAuthToken()}`,
                    },
                    body: JSON.stringify({
                      sharedVocabularyId: selectedSharedVocabulary.id,
                      title: selectedSharedVocabulary.title,
                      description: selectedSharedVocabulary.description || '',
                      wordsPerUnit,
                      selectedWordIds,
                    }),
                  }
                );
                
                const result = await addResponse.json();
                console.log('📦 Add shared vocabulary response:', result);
                if (!addResponse.ok) {
                  console.error('❌ Server error:', addResponse.status, result);
                  throw new Error(result.error || `Server error: ${addResponse.status}`);
                }
                if (result.vocabulary) {
                  console.log('✅ Successfully added vocabulary to user collection');

                  // Invalidate cache and refresh vocabulary list to show the newly added vocabulary
                  invalidateVocabularyListCache();
                  await wordLists.refreshMyVocabularies();

                  alert(`"${selectedSharedVocabulary.title}" 단어장이 추가되었습니다! (${selectedWords.length}개 단어, ${Math.ceil(selectedWords.length / wordsPerUnit)}개 유닛)`);
                } else {
                  throw new Error(result.error || 'Failed to add vocabulary');
                }
              } catch (error) {
                console.error('❌ Error adding vocabulary:', error);
                alert(`단어장 추가에 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
              } finally {
                setSelectedSharedVocabulary(null);
                handleBackToHome();
              }
            }}
          />
        ) : null;
      case 'vocabulary-creator':
        return <VocabularyCreatorScreen
          onBack={navigateBack}
          getAuthToken={auth.getAuthToken}
          onNavigateToGift={() => navigateToScreen('gift')}
          onSaveComplete={(vocabId, vocabTitle) => {
            // 단어장 생성 완료 후 바로 해당 단어장의 WordList로 이동
            console.log(`✅ Vocabulary created: ${vocabId}, navigating to WordList`);
            
            // 단어장 목록 새로고침
            wordLists.refreshMyVocabularies();
            
            selectVocabulary(vocabId, vocabTitle);
            setSelectedSubject({
              id: vocabId,
              name: vocabTitle,
              description: '',
              progress: 0,
              icon: null,
              color: '#491B6D'
            });
            navigateToScreen('word-list');
          }}
        />; 
      case 'full-calendar':
        return <FullCalendarScreen onBack={navigateBack} onHomeClick={handleBackToHome} />;
      case 'calendar':
        return <StudentCalendarScreen onBack={navigateBack} />;
      default:
        return null;
    }
  };

  return (
    <div
      className="min-h-screen overflow-hidden flex flex-col"
      style={{
        background: currentScreen === 'word-list' && selectedSubject
          ? selectedSubject.id === 'starred'
            ? '#FFFEF5'
            : selectedSubject.id === 'graveyard'
            ? '#FCFCFC'
            : selectedSubject.id === 'wrong-answers'
            ? '#FFFAFA'
            : '#F2ECFE'
          : '#F2ECFE'
      }}
    >
      {/* Admin Dashboard Overlay */}
      {showAdmin && <AdminDashboard onClose={handleAdminClose} />}

      {/* Progress Manager - Invisible component for handling saves */}
      <ProgressManager
        userXP={userXP}
        currentProgress={currentProgress}
        totalQuizzesCompleted={totalQuizzesCompleted}
        onProgressLoaded={handleProgressLoaded}
      />

      {/* Main Content - Perfectly scrollable */}
      <div className={`flex-1 ${currentScreen === 'word-list' ? 'overflow-hidden' : 'overflow-y-auto scrollbar-hide'} relative`}>
        {/* Opening Animation - No transition wrapper needed */}
        {currentScreen === 'opening' ? (
          renderScreen()
        ) : (
          /* Modern Screen Transition Animation for all other screens */
          <motion.div
            key={currentScreen}
            className={currentScreen === 'word-list' ? 'h-full' : ''}
            initial={{
              opacity: 0,
              scale: currentScreen === 'welcome' ? 0.95 : (currentScreen === 'home' ? 1 : 0.98),
              y: currentScreen === 'welcome' ? 20 : (currentScreen === 'home' ? 0 : 15),
              filter: 'blur(8px)'
            }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
              filter: 'blur(0px)'
            }}
            exit={{
              opacity: 0,
              scale: 0.95,
              y: -15,
              filter: 'blur(4px)'
            }}
            transition={{
              duration: currentScreen === 'welcome' ? 0.8 : 0.5,
              ease: currentScreen === 'welcome' ? [0.23, 1, 0.32, 1] : "easeInOut",
              type: currentScreen === 'welcome' ? "spring" : "tween",
              bounce: currentScreen === 'welcome' ? 0.25 : 0
            }}
          >
            {/* Enhanced Transition Effects for Welcome Screen */}
            {currentScreen === 'welcome' && (
              <>
                {/* Subtle Particle Background */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  className="absolute inset-0 pointer-events-none"
                >
                  {[...Array(12)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ 
                        x: Math.random() * 400,
                        y: Math.random() * 800,
                        opacity: 0,
                        scale: 0
                      }}
                      animate={{ 
                        opacity: [0, 0.4, 0],
                        scale: [0, 1, 0],
                        x: [
                          Math.random() * 400,
                          Math.random() * 400,
                          Math.random() * 400
                        ],
                        y: [
                          Math.random() * 800,
                          Math.random() * 800 + 50,
                          Math.random() * 800 + 100
                        ]
                      }}
                      transition={{
                        duration: 6,
                        delay: Math.random() * 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="absolute w-2 h-2 rounded-full"
                      style={{
                        background: `linear-gradient(45deg, #C8B6FF, #7C3AED)`,
                        filter: 'blur(1px)'
                      }}
                    />
                  ))}
                </motion.div>

                {/* Gradient Overlay for Enhanced Depth */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ 
                    opacity: [0, 0.3, 0],
                    background: [
                      'radial-gradient(circle at 30% 20%, #C8B6FF 0%, transparent 50%)',
                      'radial-gradient(circle at 70% 60%, #7C3AED 0%, transparent 40%)',
                      'radial-gradient(circle at 20% 80%, #C8B6FF 0%, transparent 60%)'
                    ]
                  }}
                  transition={{ 
                    opacity: { duration: 2, ease: "easeInOut" },
                    background: { duration: 8, repeat: Infinity, ease: "easeInOut" }
                  }}
                  className="absolute inset-0 pointer-events-none"
                />
              </>
            )}

            {renderScreen()}
          </motion.div>
        )}
        
        {/* Progress Notification */}
        <ProgressNotification
          show={showProgressNotification}
          type={notificationData.type}
          title={notificationData.title}
          subtitle={notificationData.subtitle}
          xpGain={notificationData.xpGain}
          onComplete={handleNotificationComplete}
        />
        
        {/* Inline XP Notification - Quick feedback */}
        <InlineXPNotification
          show={showInlineXP}
          xpGain={recentXPGain}
        />
        
        {/* Progress Save Indicator */}
        <ProgressSaveIndicator
          show={showIndicator}
          status={saveStatus}
        />
        
        {/* Bottom padding for navigation */}
        <div className={currentScreen === 'subject-detail' || currentScreen === 'lesson-player' || currentScreen === 'game-map-quiz' || currentScreen === 'vocabulary-list' || currentScreen === 'word-list' ? 'h-8' : 'h-28'} />
      </div>
      
      {/* Bottom Navigation - Fixed positioning - Hidden on opening, signup, welcome, subject detail, lesson player, game map quiz, vocabulary list, word list, full-calendar, and completion screens */}
      {currentScreen !== 'login' && currentScreen !== 'signup' && currentScreen !== 'opening' && currentScreen !== 'welcome' && currentScreen !== 'subject-detail' && currentScreen !== 'lesson-player' && currentScreen !== 'game-map-quiz' && currentScreen !== 'vocabulary-list' && currentScreen !== 'word-list' && currentScreen !== 'quiz-completion' && currentScreen !== 'full-calendar' && !selectedSharedVocabulary && (
        <BottomNavigation currentScreen={currentScreen} onScreenChange={(screen) => {
          // Scroll to top on tab change (instant to avoid flickering)
          window.scrollTo({ top: 0, behavior: 'instant' });

          if (screen === 'home') {
            handleBackToHome();
          } else {
            navigateToScreen(screen);
          }
        }} />
      )}

      {/* Toast notifications */}
      <Toaster position="top-center" richColors />
    </div>
  );
}
