import { Target, BookOpen, Puzzle, Key, Trophy } from 'lucide-react';

export interface Stage {
  id: number;
  title: string;
  icon: any;
  status: 'locked' | 'unlocked' | 'current' | 'completed';
  xpReward: number;
}

export const subjectStages: Record<string, Stage[]> = {
  math: [
    { id: 1, title: "Meaning Quiz", icon: <Target className="w-6 h-6" />, status: 'current', xpReward: 50 },
    { id: 2, title: "Derivatives", icon: <BookOpen className="w-6 h-6" />, status: 'locked', xpReward: 75 },
    { id: 3, title: "Synonyms & Antonyms", icon: <Puzzle className="w-6 h-6" />, status: 'locked', xpReward: 100 },
    { id: 4, title: "Sentence Completion", icon: <Key className="w-6 h-6" />, status: 'locked', xpReward: 125 },
    { id: 5, title: "All in One", icon: <Trophy className="w-6 h-6" />, status: 'locked', xpReward: 150 }
  ],
  english: [
    { id: 1, title: "Grammar Basics", icon: <Target className="w-6 h-6" />, status: 'current', xpReward: 50 },
    { id: 2, title: "Reading & Writing", icon: <BookOpen className="w-6 h-6" />, status: 'locked', xpReward: 75 },
    { id: 3, title: "Literary Analysis", icon: <Puzzle className="w-6 h-6" />, status: 'locked', xpReward: 100 },
    { id: 4, title: "Advanced Composition", icon: <Key className="w-6 h-6" />, status: 'locked', xpReward: 125 },
    { id: 5, title: "Literary Mastery", icon: <Trophy className="w-6 h-6" />, status: 'locked', xpReward: 150 }
  ],
  science: [
    { id: 1, title: "Basic Science", icon: <Target className="w-6 h-6" />, status: 'current', xpReward: 50 },
    { id: 2, title: "Physical Science", icon: <BookOpen className="w-6 h-6" />, status: 'locked', xpReward: 75 },
    { id: 3, title: "Biology & Chemistry", icon: <Puzzle className="w-6 h-6" />, status: 'locked', xpReward: 100 },
    { id: 4, title: "Physics & Earth", icon: <Key className="w-6 h-6" />, status: 'locked', xpReward: 125 },
    { id: 5, title: "Advanced Science", icon: <Trophy className="w-6 h-6" />, status: 'locked', xpReward: 150 }
  ],
  social: [
    { id: 1, title: "Civics & Geography", icon: <Target className="w-6 h-6" />, status: 'current', xpReward: 50 },
    { id: 2, title: "American History", icon: <BookOpen className="w-6 h-6" />, status: 'locked', xpReward: 75 },
    { id: 3, title: "World Cultures", icon: <Puzzle className="w-6 h-6" />, status: 'locked', xpReward: 100 },
    { id: 4, title: "Government & Economics", icon: <Key className="w-6 h-6" />, status: 'locked', xpReward: 125 },
    { id: 5, title: "Global Studies", icon: <Trophy className="w-6 h-6" />, status: 'locked', xpReward: 150 }
  ]
};

export const subjectNames: Record<string, string> = {
  math: "Voca Master Journey",
  english: "English Journey",
  science: "Science Journey",
  social: "Social Studies Journey"
};

export const MIN_MATCH_WORDS = 5;

export const stageModeAvailability: Record<number, Array<'normal' | 'match' | 'game'>> = {
  1: ['normal', 'match'],
  2: ['normal', 'match'],
  3: ['normal'],
  4: ['normal'],
  5: ['normal']
};
