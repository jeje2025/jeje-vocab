import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import Icons from '../imports/Icons-13-1005';
import { useState, useEffect } from 'react';

interface ProgressCardProps {
  illustrationImage: string;
  onStartQuiz: () => void;
  currentProgress?: number;
  totalQuizzesCompleted?: number;
}

export function ProgressCard({ 
  illustrationImage, 
  onStartQuiz, 
  currentProgress = 40,
  totalQuizzesCompleted = 0 
}: ProgressCardProps) {
  const [animatedProgress, setAnimatedProgress] = useState(currentProgress);
  const [displayProgress, setDisplayProgress] = useState(currentProgress);

  useEffect(() => {
    if (currentProgress !== animatedProgress) {
      // Animate progress change
      const duration = 1500;
      const steps = 30;
      const startProgress = animatedProgress;
      const progressDiff = currentProgress - startProgress;
      const increment = progressDiff / steps;
      
      let currentStep = 0;
      const timer = setInterval(() => {
        currentStep++;
        const newProgress = startProgress + (increment * currentStep);
        setDisplayProgress(Math.round(newProgress));
        
        if (currentStep >= steps) {
          clearInterval(timer);
          setDisplayProgress(currentProgress);
          setAnimatedProgress(currentProgress);
        }
      }, duration / steps);

      return () => clearInterval(timer);
    }
  }, [currentProgress]);

  const getProgressMessage = () => {
    if (displayProgress >= 80) {
      return "거의 다 왔어요! 퀴즈 하나만 더 완료하면 일일 목표 달성!";
    } else if (displayProgress >= 60) {
      return "좋은 진행! 일일 목표의 절반 이상을 달성했어요.";
    } else if (displayProgress >= 40) {
      return "단어로 하루를 채워요 — 오늘도 더 많이 마스터해봐요!";
    } else {
      return `학습 여정을 시작하세요! 퀴즈를 완료해서 ${displayProgress}% 진행률을 달성하세요.`;
    }
  };
  const characterImage = "https://images.unsplash.com/photo-1653671689368-13b828d04421?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHwzZCUyMHN0dWRlbnQlMjBjaGFyYWN0ZXIlMjBsZWFybmluZyUyMGVkdWNhdGlvbiUyMGNhcnRvb258ZW58MXx8fHwxNzU3NTEzMDc2fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.5 }}
      className="relative"
    >
      {/* Reference Books Icon */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 20, rotate: -10 }}
        animate={{
          opacity: 0.95,
          scale: 1,
          rotate: 0,
          y: 0
        }}
        transition={{
          delay: 0.6,
          duration: 0.8,
          type: "spring",
          stiffness: 200
        }}
        className="absolute -top-6 right-2 opacity-95 z-50 pointer-events-none"
        style={{
          width: '85px',
          height: '85px',
          filter: 'drop-shadow(0 8px 20px rgba(9, 26, 122, 0.25))'
        }}
      >
        <Icons />
      </motion.div>

      {/* Main Card Container - Matching DailyStreak size */}
      <motion.div
        whileTap={{ scale: 0.98 }}
        onClick={onStartQuiz}
        className="relative p-6 rounded-[20px] border border-white/20 shadow-card overflow-hidden cursor-pointer"
        style={{
          background: 'rgba(249, 250, 251, 1)',
          boxShadow: '0 2px 8px 0 rgba(0, 0, 0, 0.08)',
          position: 'relative',
          minHeight: '160px'
        }}
      >
        {/* Content Container */}
        <div className="relative z-10 h-full flex flex-col justify-center">
          {/* Title - Exact typography specifications */}
          <motion.h3
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            style={{
              fontFamily: 'Lexend, sans-serif',
              fontWeight: 700,
              fontSize: '18px',
              color: '#091A7A',
              lineHeight: '1.3',
              marginBottom: '12px'
            }}
          >
            내 단어장 목록
          </motion.h3>
          
          {/* Description with max width constraint */}
          <motion.p 
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            style={{
              fontFamily: 'Lexend, sans-serif',
              fontWeight: 500,
              fontSize: '14px',
              color: '#6B7280',
              lineHeight: '1.5',
              maxWidth: 'calc(100% - 64px)' // Leave space for character
            }}
          >
            {getProgressMessage()}
          </motion.p>
        </div>



        {/* Circular Action Button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.stopPropagation();
            onStartQuiz();
          }}
          className="absolute bottom-4 right-4 w-12 h-12 bg-white rounded-full shadow-interactive border-none cursor-pointer flex items-center justify-center z-15"
          style={{
            boxShadow: '0 10px 25px -5px rgba(9, 26, 122, 0.3), 0 8px 10px -6px rgba(9, 26, 122, 0.2)'
          }}
        >
          <ArrowRight 
            className="w-6 h-6" 
            style={{ color: '#091A7A' }} 
          />
        </motion.button>


        {/* Enhanced glass morphism overlay */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 50%, transparent 100%)',
            borderRadius: '20px'
          }}
        />
      </motion.div>
    </motion.div>
  );
}