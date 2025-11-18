import { ScoreBoardProps } from '../types';

export function ScoreBoard({ score, questionNumber, totalQuestions }: ScoreBoardProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="text-white">
        <span className="text-sm opacity-70">SCORE</span>
        <div className="text-2xl font-bold">{score}</div>
      </div>
      <div className="text-white">
        <span className="text-sm opacity-70">QUESTION</span>
        <div className="text-2xl font-bold">
          {questionNumber}/{totalQuestions}
        </div>
      </div>
    </div>
  );
}
