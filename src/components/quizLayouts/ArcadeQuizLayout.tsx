import { BackButton } from '../BackButton';
import { SpeedQuizGame } from '../games/SpeedQuizGame';
import { WordFallGame } from '../games/WordFallGame';

interface ArcadeQuizLayoutProps {
  words: any[];
  gameType: 'fall' | 'speed';
  onBack: () => void;
  onComplete: (score: number, correctCount: number) => void;
  onWrongAnswer?: (wordId: string) => void;
}

export function ArcadeQuizLayout({
  words,
  gameType,
  onBack,
  onComplete,
  onWrongAnswer
}: ArcadeQuizLayoutProps) {
  return (
    <div className="h-full bg-gradient-to-br from-indigo-50 via-white to-purple-50 relative">
      <div className="absolute top-6 left-6 z-30">
        <BackButton onClick={onBack} />
      </div>

      <div className="h-full pt-20">
        {gameType === 'fall' ? (
          <WordFallGame
            words={words}
            onComplete={onComplete}
            onWrongAnswer={onWrongAnswer}
          />
        ) : (
          <SpeedQuizGame
            words={words}
            onComplete={onComplete}
            onWrongAnswer={onWrongAnswer}
          />
        )}
      </div>
    </div>
  );
}
