import { Home } from 'lucide-react';
import { BackButton } from '../BackButton';
import { MeaningMatchGame } from '../games/MeaningMatchGame';
import { MultipleChoiceMeaningGame } from '../games/MultipleChoiceMeaningGame';
import type { Stage } from '../GameMapQuizScreen';

interface MatchQuizLayoutProps {
  words: any[];
  matchGameType: 'card-match-word' | 'card-match-meaning' | 'quiz-word';
  onBack: () => void;
  onBackToHome?: () => void;
  onComplete: (score: number, correctCount: number) => void;
  onWrongAnswer?: (wordId: string) => void;
  stage?: Stage;
  journeyName: string;
  wordCount: number;
  isStarredVocabulary: boolean;
}

export function MatchQuizLayout({
  words,
  matchGameType,
  onBack,
  onBackToHome,
  onComplete,
  onWrongAnswer,
  stage,
  journeyName,
  wordCount,
  isStarredVocabulary
}: MatchQuizLayoutProps) {
  const isCardMatch = matchGameType.startsWith('card-match');
  const mode =
    matchGameType === 'card-match-word' || matchGameType === 'quiz-word'
      ? ('word-to-meaning' as const)
      : ('meaning-to-word' as const);

  const headerAccent = isStarredVocabulary ? '#78350F' : '#091A7A';
  const subAccent = isStarredVocabulary ? '#D97706' : '#7C3AED';

  return (
    <div className="h-full bg-transparent overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full px-4 py-4 space-y-4">
        <div
          className={`rounded-3xl p-4 shadow-card border border-white/40 ${
            isStarredVocabulary
              ? 'bg-gradient-to-b from-[#FFFBEB]/90 via-[#FEF3C7]/80 to-white/90'
              : 'bg-gradient-to-b from-[#E9D5FF]/90 via-[#E0E7FF]/80 to-white/90'
          }`}
        >
          <div className="flex items-center gap-3">
            <BackButton onClick={onBack} />

            <div className="flex-1 text-center space-y-0.5">
              <h1 className="text-lg font-bold" style={{ color: headerAccent }}>
                {journeyName}
              </h1>
              <p className="text-xs font-medium" style={{ color: subAccent }}>
                {wordCount}개의 단어
              </p>
            </div>

            {onBackToHome ? (
              <button
                onClick={onBackToHome}
                className="w-10 h-10 bg-white/95 backdrop-blur-xl rounded-full flex items-center justify-center shadow-card border border-white/60"
              >
                <Home className="w-5 h-5" style={{ color: headerAccent }} />
              </button>
            ) : (
              <div className="w-10 h-10" />
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full px-4 pb-6">
        {isCardMatch ? (
          <MeaningMatchGame
            words={words}
            mode={mode}
            onComplete={onComplete}
            onWrongAnswer={onWrongAnswer}
          />
        ) : (
          <MultipleChoiceMeaningGame
            words={words}
            mode={mode}
            onComplete={onComplete}
            onWrongAnswer={onWrongAnswer}
          />
        )}
      </div>
    </div>
  );
}
