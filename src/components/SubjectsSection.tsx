import { motion } from 'motion/react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import wrongAnswerIcon from 'figma:asset/d591fc627aa5b7799a1427ce1ddf2818333b2abf.png';
import { StarredIcon2D } from './2d-icons/StarredIcon2D';
import { GraveyardIcon2D } from './2d-icons/GraveyardIcon2D';

interface SubjectsSectionProps {
  onSubjectClick: (subject: Subject) => void;
  starredCount?: number;
  graveyardCount?: number;
  wrongAnswersCount?: number;
}

export function SubjectsSection({ onSubjectClick, starredCount = 0, graveyardCount = 0, wrongAnswersCount = 0 }: SubjectsSectionProps) {
  const subjects: Subject[] = [
    {
      id: 'starred',
      name: '중요 단어',
      description: '',
      progress: 0,
      icon: <StarredIcon2D />,
      color: 'from-[#091A7A] to-[#FCD34D]',
      count: starredCount
    },
    {
      id: 'graveyard',
      name: '무덤 단어',
      description: '',
      progress: 0,
      icon: <GraveyardIcon2D />,
      color: 'from-[#091A7A] to-[#6B7280]',
      count: graveyardCount
    },
    {
      id: 'wrong-answers',
      name: '오답 단어',
      description: '',
      progress: 0,
      icon: <ImageWithFallback src={wrongAnswerIcon} alt="Wrong Answers Icon" className="w-10 h-10" />,
      color: 'from-[#091A7A] to-[#EF4444]',
      count: wrongAnswersCount
    }
  ];

  // Calculate circumference for progress animation
  const circumference = 2 * Math.PI * 30; // radius = 30px

  return (
    <div className="relative mx-6 mb-6">
      {/* Floating ambient particles around the subject area */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden -inset-8">
        <motion.div
          className="absolute top-16 left-4 w-1.5 h-1.5 bg-gradient-to-br from-[#ADC8FF]/40 to-[#091A7A]/20 rounded-full blur-sm"
          animate={{
            y: [0, -25, 0],
            x: [0, 15, 0],
            scale: [0.4, 1.2, 0.4],
            opacity: [0.2, 0.7, 0.2]
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5
          }}
        />
        <motion.div
          className="absolute top-32 right-8 w-1 h-1 bg-gradient-to-br from-[#091A7A]/30 to-[#ADC8FF]/40 rounded-full blur-sm"
          animate={{
            y: [0, -18, 0],
            x: [0, -12, 0],
            scale: [0.3, 0.9, 0.3],
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{
            duration: 9,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
        />
        <motion.div
          className="absolute bottom-20 left-16 w-0.5 h-0.5 bg-gradient-to-br from-[#ADC8FF]/50 to-[#091A7A]/10 rounded-full blur-sm"
          animate={{
            y: [0, -30, 0],
            x: [0, 20, 0],
            scale: [0.5, 1.5, 0.5],
            opacity: [0.4, 0.8, 0.4]
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 4
          }}
        />
        <motion.div
          className="absolute top-24 right-2 w-2 h-2 bg-gradient-to-br from-yellow-300/30 to-orange-300/20 rounded-full blur-sm"
          animate={{
            y: [0, -22, 0],
            x: [0, -8, 0],
            scale: [0.2, 1, 0.2],
            opacity: [0.2, 0.5, 0.2],
            rotate: [0, 180, 360]
          }}
          transition={{
            duration: 11,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 6
          }}
        />
      </div>

      {/* Subjects Grid - 3 columns with compact design */}
      <div className="grid grid-cols-3 gap-3">
        {subjects.map((subject, index) => (
          <motion.div
            key={subject.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 + index * 0.1, duration: 0.5 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSubjectClick(subject)}
            className="relative flex-1 cursor-pointer"
          >
            {/* Subject Card Container - Compact design */}
            <div 
              className="relative p-2.5 backdrop-blur-lg border rounded-full overflow-visible group"
              style={{
                width: '95px',
                height: '95px',
                background: subject.id === 'starred' 
                  ? 'linear-gradient(135deg, rgba(254, 252, 232, 0.95) 0%, rgba(254, 249, 195, 0.9) 100%)'
                  : subject.id === 'graveyard'
                  ? 'linear-gradient(135deg, rgba(249, 250, 251, 0.95) 0%, rgba(243, 244, 246, 0.9) 100%)'
                  : subject.id === 'wrong-answers'
                  ? 'linear-gradient(135deg, rgba(254, 242, 242, 0.95) 0%, rgba(254, 226, 226, 0.9) 100%)'
                  : 'linear-gradient(135deg, rgba(173, 200, 255, 0.9) 0%, rgba(173, 200, 255, 0.7) 100%)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderColor: 'rgba(255, 255, 255, 0.3)',
                boxShadow: '0 8px 32px -8px rgba(9, 26, 122, 0.2)'
              }}
            >
              {/* Content Container - Icon + Text */}
              <div className="h-full flex flex-col items-center justify-center text-center gap-2">
                
                {/* Count Badge - Top Right */}
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ 
                    delay: 0.9 + index * 0.1, 
                    duration: 0.4,
                    type: "spring",
                    stiffness: 200
                  }}
                  className="absolute min-w-[24px] h-[24px] px-2 flex items-center justify-center rounded-full"
                  style={{
                    top: '2px',
                    right: '-6px',
                    background: subject.id === 'starred'
                      ? 'linear-gradient(135deg, #FCD34D 0%, #F59E0B 100%)'
                      : subject.id === 'graveyard'
                      ? 'linear-gradient(135deg, #9CA3AF 0%, #6B7280 100%)'
                      : 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'Lexend, sans-serif',
                      fontWeight: 700,
                      fontSize: '11px',
                      lineHeight: '14px',
                      color: '#FFFFFF'
                    }}
                  >
                    {subject.count}
                  </span>
                </motion.div>
                
                {/* Icon Container */}
                {subject.icon && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ 
                      scale: 1,
                      opacity: 0.9,
                      y: [0, -4, 0],
                    }}
                    transition={{ 
                      scale: { delay: 0.8 + index * 0.15, duration: 0.5, type: "spring" },
                      opacity: { delay: 0.8 + index * 0.15, duration: 0.5 },
                      y: {
                        duration: 4 + index * 0.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 1 + index * 0.3
                      }
                    }}
                    className="w-10 h-10 flex items-center justify-center"
                    style={{ 
                      filter: 'drop-shadow(0 4px 12px rgba(9, 26, 122, 0.12))'
                    }}
                  >
                    {subject.icon}
                  </motion.div>
                )}

                {/* Subject Information */}
                <div>
                  {/* Subject Title */}
                  <h4
                    style={{
                      fontFamily: 'Lexend, sans-serif',
                      fontWeight: 600,
                      fontSize: '10px',
                      lineHeight: '14px',
                      color: '#091A7A'
                    }}
                  >
                    {subject.name}
                  </h4>
                </div>
              </div>

              {/* Enhanced glass morphism overlay */}
              <div 
                className="absolute inset-0 pointer-events-none rounded-full"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 50%, transparent 100%)'
                }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}