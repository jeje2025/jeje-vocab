import { motion } from 'motion/react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import wrongAnswerIcon from 'figma:asset/d591fc627aa5b7799a1427ce1ddf2818333b2abf.png';
import { StarredIcon2D } from './2d-icons/StarredIcon2D';
import { GraveyardIcon2D } from './2d-icons/GraveyardIcon2D';
import { Calendar } from 'lucide-react';

interface SubjectsSectionProps {
  onSubjectClick: (subject: Subject) => void;
  onCalendarClick?: () => void;
  starredCount?: number;
  graveyardCount?: number;
  wrongAnswersCount?: number;
}

export function SubjectsSection({ onSubjectClick, onCalendarClick, starredCount = 0, graveyardCount = 0, wrongAnswersCount = 0 }: SubjectsSectionProps) {
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
      icon: <ImageWithFallback src={wrongAnswerIcon} alt="Wrong Answers Icon" className="w-7 h-7" />,
      color: 'from-[#091A7A] to-[#EF4444]',
      count: wrongAnswersCount
    },
    {
      id: 'calendar',
      name: '시험 일정',
      description: '',
      progress: 0,
      icon: <Calendar className="w-7 h-7" />,
      color: 'from-[#091A7A] to-[#3B82F6]',
      count: 0
    }
  ];

  // Calculate circumference for progress animation
  const circumference = 2 * Math.PI * 30; // radius = 30px

  return (
    <div className="relative mx-6 mb-6">
      {/* Subjects Grid - 4 columns with compact design */}
      <div className="grid grid-cols-4 gap-3">
        {subjects.map((subject, index) => (
          <motion.div
            key={subject.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 + index * 0.1, duration: 0.5 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => subject.id === 'calendar' && onCalendarClick ? onCalendarClick() : onSubjectClick(subject)}
            className="relative flex-1 cursor-pointer"
          >
            {/* Subject Card Container - Compact design */}
            <div
              className="relative p-2 border rounded-[20px] overflow-visible group"
              style={{
                width: '75px',
                height: '75px',
                background: subject.id === 'starred'
                  ? 'linear-gradient(135deg, rgba(254, 252, 232, 1) 0%, rgba(254, 249, 195, 1) 100%)'
                  : subject.id === 'graveyard'
                  ? 'linear-gradient(135deg, rgba(249, 250, 251, 1) 0%, rgba(243, 244, 246, 1) 100%)'
                  : subject.id === 'wrong-answers'
                  ? 'linear-gradient(135deg, rgba(254, 242, 242, 1) 0%, rgba(254, 226, 226, 1) 100%)'
                  : subject.id === 'calendar'
                  ? 'linear-gradient(135deg, rgba(219, 234, 254, 1) 0%, rgba(191, 219, 254, 1) 100%)'
                  : 'linear-gradient(135deg, rgba(173, 200, 255, 1) 0%, rgba(173, 200, 255, 0.9) 100%)',
                borderColor: 'rgba(255, 255, 255, 0.3)',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.08)'
              }}
            >
              {/* Content Container - Icon + Text */}
              <div className="h-full flex flex-col items-center justify-center text-center gap-2">
                
                {/* Count Badge - Top Right (hide for calendar) */}
                {subject.id !== 'calendar' && (
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
                      top: '-4px',
                      right: '-4px',
                      background: subject.id === 'starred'
                        ? 'linear-gradient(135deg, #FCD34D 0%, #F59E0B 100%)'
                        : subject.id === 'graveyard'
                        ? 'linear-gradient(135deg, #9CA3AF 0%, #6B7280 100%)'
                        : 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
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
                )}
                
                {/* Icon Container */}
                {subject.icon && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{
                      scale: 1,
                      opacity: 0.9
                    }}
                    transition={{
                      delay: 0.8 + index * 0.15,
                      duration: 0.5,
                      type: "spring"
                    }}
                    className="w-7 h-7 flex items-center justify-center"
                    style={{
                      filter: 'drop-shadow(0 1px 1px rgba(0, 0, 0, 0.08))'
                    }}
                  >
                    {subject.icon}
                  </motion.div>
                )}

                {/* Subject Information */}
                <div className="flex flex-col items-center">
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
                  {/* Coming Soon Badge for Calendar */}
                  {subject.id === 'calendar' && (
                    <span
                      style={{
                        fontFamily: 'Lexend, sans-serif',
                        fontWeight: 500,
                        fontSize: '8px',
                        lineHeight: '10px',
                        color: '#6B7280',
                        marginTop: '2px'
                      }}
                    >
                      (준비중)
                    </span>
                  )}
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