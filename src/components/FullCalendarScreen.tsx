import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Plus, Search, X, Home, Clock, FileText, Calendar, Target } from 'lucide-react';
import { useState, useEffect } from 'react';

interface FullCalendarScreenProps {
  onBack: () => void;
  onHomeClick?: () => void;
}

interface University {
  id: number;
  name: string;
  department: string;
  deadline: string;
  color: string;
}

interface CalendarEvent {
  date: number;
  month: number;
  year: number;
  title: string;
  subtitle: string;
  color: string;
}

export function FullCalendarScreen({ onBack, onHomeClick }: FullCalendarScreenProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<{ date: number; month: number; year: number } | null>(null);
  
  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  const universities = [
    { 
      id: 1, 
      name: '서울대학교', 
      department: '경영학과', 
      deadline: '2025.09.15',
      color: '#491B6D'
    },
    { 
      id: 2, 
      name: '연세대학교', 
      department: '경제학부', 
      deadline: '2025.09.20',
      color: '#5B21B6'
    },
    { 
      id: 3, 
      name: '고려대학교', 
      department: '국제학부', 
      deadline: '2025.09.25',
      color: '#7C3AED'
    }
  ];

  const [showAddModal, setShowAddModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showAdmissionModal, setShowAdmissionModal] = useState(false);
  const [showDdayModal, setShowDdayModal] = useState(false);
  const [selectedDday, setSelectedDday] = useState<{ name: string; date: Date; color: string } | null>(null);
  
  const today = new Date();
  const daysInWeek = ['일', '월', '화', '수', '목', '금', '토'];
  
  // Get calendar data for current month
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
  
  const emptyDays = Array.from({ length: firstDay }, (_, i) => i);
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Sample calendar events
  const calendarEvents: CalendarEvent[] = [
    { date: 15, month: 8, year: 2025, title: '서울대', subtitle: '원서접수', color: '#10B981' },
    { date: 17, month: 8, year: 2025, title: '서울대', subtitle: '원서접수', color: '#10B981' },
    { date: 18, month: 8, year: 2025, title: '서울대', subtitle: '원서접수', color: '#10B981' },
    { date: 18, month: 8, year: 2025, title: '연세대', subtitle: '접수시작', color: '#F59E0B' },
    { date: 19, month: 8, year: 2025, title: '서울대', subtitle: '원서접수', color: '#10B981' },
    { date: 19, month: 8, year: 2025, title: '연세대', subtitle: '원서접수', color: '#F59E0B' },
    { date: 20, month: 8, year: 2025, title: '서울대', subtitle: '접수마감', color: '#10B981' },
    { date: 20, month: 8, year: 2025, title: '연세대', subtitle: '접수마감', color: '#F59E0B' },
    { date: 21, month: 8, year: 2025, title: '연세대', subtitle: '원서접수', color: '#10B981' },
    { date: 22, month: 8, year: 2025, title: '연세대', subtitle: '원서접수', color: '#10B981' },
    { date: 22, month: 8, year: 2025, title: '성균관', subtitle: '접수시작', color: '#8B5CF6' },
    { date: 23, month: 8, year: 2025, title: '연세대', subtitle: '접수마감', color: '#10B981' },
    { date: 23, month: 8, year: 2025, title: '성균관', subtitle: '원서접수', color: '#8B5CF6' },
    { date: 24, month: 8, year: 2025, title: '성균관', subtitle: '원서접수', color: '#8B5CF6' },
    { date: 25, month: 8, year: 2025, title: '서울대', subtitle: '1차발표', color: '#6366F1' },
    { date: 25, month: 8, year: 2025, title: '성균관', subtitle: '원서접수', color: '#8B5CF6' },
    { date: 26, month: 8, year: 2025, title: '성균관', subtitle: '원서접수', color: '#10B981' },
    { date: 27, month: 8, year: 2025, title: '연세대', subtitle: '1차발표', color: '#6366F1' },
    { date: 27, month: 8, year: 2025, title: '성균관', subtitle: '접수마감', color: '#10B981' },
    { date: 28, month: 8, year: 2025, title: '성균관', subtitle: '1차발표', color: '#6366F1' }
  ];

  const getEventForDate = (date: number) => {
    return calendarEvents.filter(event => 
      event.date === date && 
      event.month === month && 
      event.year === year
    );
  };

  const handleDateClick = (date: number) => {
    setSelectedDate({ date, month, year });
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDate(null);
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDate(null);
  };

  const getSelectedDateEvents = () => {
    if (!selectedDate) return [];
    return calendarEvents.filter(event => 
      event.date === selectedDate.date && 
      event.month === selectedDate.month && 
      event.year === selectedDate.year
    );
  };

  // Calculate D-Day
  const calculateDday = () => {
    if (!selectedDday) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const target = new Date(selectedDday.date);
    target.setHours(0, 0, 0, 0);
    const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="min-h-screen pb-24" style={{
      background: 'transparent'
    }}>
      {/* Header */}
      <div className="relative p-6" style={{ background: 'transparent' }}>
        <div className="flex items-center justify-between">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{
              background: 'white',
              boxShadow: '0 4px 12px rgba(73, 27, 109, 0.15)'
            }}
          >
            <ChevronLeft className="w-5 h-5" style={{ color: '#491B6D' }} />
          </motion.button>

          <h1
            style={{
              fontFamily: 'Lexend, sans-serif',
              fontWeight: 700,
              fontSize: '20px',
              color: '#491B6D'
            }}
          >
            시험 일정 Calendar
          </h1>

          {onHomeClick && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onHomeClick}
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{
                background: 'white',
                boxShadow: '0 4px 12px rgba(73, 27, 109, 0.15)'
              }}
            >
              <Home className="w-5 h-5" style={{ color: '#491B6D' }} />
            </motion.button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-6 space-y-6">
        {/* Calendar Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="p-6 backdrop-blur-lg rounded-3xl border"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.85) 100%)',
            borderColor: 'rgba(255, 255, 255, 0.3)',
            boxShadow: '0 8px 32px -8px rgba(73, 27, 109, 0.2)'
          }}
        >
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-6">
            <h3
              style={{
                fontFamily: 'Lexend, sans-serif',
                fontWeight: 700,
                fontSize: '18px',
                color: '#491B6D'
              }}
            >
              {year}년 {monthNames[month]}
            </h3>
            <div className="flex items-center gap-2">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={goToPreviousMonth}
                className="w-9 h-9 flex items-center justify-center rounded-xl"
                style={{
                  background: 'rgba(73, 27, 109, 0.1)'
                }}
              >
                <ChevronLeft className="w-5 h-5" style={{ color: '#491B6D' }} />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={goToNextMonth}
                className="w-9 h-9 flex items-center justify-center rounded-xl"
                style={{
                  background: 'rgba(73, 27, 109, 0.1)'
                }}
              >
                <ChevronRight className="w-5 h-5" style={{ color: '#491B6D' }} />
              </motion.button>
            </div>
          </div>

          {/* Days of Week */}
          <div className="grid grid-cols-7 gap-1 mb-3">
            {daysInWeek.map((day, index) => (
              <div
                key={index}
                className="text-center py-2"
                style={{
                  fontFamily: 'Lexend, sans-serif',
                  fontWeight: 600,
                  fontSize: '11px',
                  color: index === 0 ? '#EF4444' : index === 6 ? '#3B82F6' : '#6B7280'
                }}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {emptyDays.map((_, index) => (
              <div key={`empty-${index}`} className="aspect-square" />
            ))}
            {calendarDays.map((date) => {
              const events = getEventForDate(date);
              const isToday = date === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              const isSelected = selectedDate?.date === date && selectedDate?.month === month && selectedDate?.year === year;
              
              return (
                <motion.button
                  key={date}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: date * 0.005, type: 'spring', stiffness: 400 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleDateClick(date)}
                  className="aspect-square rounded-lg flex flex-col items-center justify-center relative p-1"
                  style={{
                    background: isToday 
                      ? 'linear-gradient(135deg, #A78BFA 0%, #8B5CF6 100%)'
                      : isSelected
                      ? 'rgba(73, 27, 109, 0.15)'
                      : events.length > 0
                      ? 'rgba(73, 27, 109, 0.05)'
                      : 'transparent',
                    border: isSelected ? '2px solid #491B6D' : 'none'
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'Lexend, sans-serif',
                      fontWeight: isToday ? 700 : 500,
                      fontSize: '13px',
                      color: isToday ? '#FFFFFF' : '#491B6D'
                    }}
                  >
                    {date}
                  </span>
                  {events.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                      {events.slice(0, 2).map((event, idx) => (
                        <div
                          key={idx}
                          className="w-1 h-1 rounded-full"
                          style={{ background: event.color }}
                        />
                      ))}
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Selected Date Events - Shows directly below calendar */}
        <AnimatePresence>
          {selectedDate && getSelectedDateEvents().length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="p-6 backdrop-blur-lg rounded-3xl border overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.85) 100%)',
                borderColor: 'rgba(255, 255, 255, 0.3)',
                boxShadow: '0 8px 32px -8px rgba(73, 27, 109, 0.2)'
              }}
            >
              {/* Date Header */}
              <div className="mb-4 pb-3 border-b flex items-center justify-between" style={{ borderColor: 'rgba(73, 27, 109, 0.1)' }}>
                <div>
                  <h3
                    style={{
                      fontFamily: 'Lexend, sans-serif',
                      fontWeight: 700,
                      fontSize: '18px',
                      color: '#491B6D'
                    }}
                  >
                    {year}년 {monthNames[month]} {selectedDate.date}일
                  </h3>
                  <p
                    className="mt-1"
                    style={{
                      fontFamily: 'Lexend, sans-serif',
                      fontWeight: 500,
                      fontSize: '13px',
                      color: '#8B5CF6'
                    }}
                  >
                    {getSelectedDateEvents().length}개의 일정
                  </p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedDate(null)}
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{
                    background: 'rgba(73, 27, 109, 0.1)'
                  }}
                >
                  <X className="w-4 h-4" style={{ color: '#491B6D' }} />
                </motion.button>
              </div>

              {/* Events List */}
              <div className="space-y-3">
                {getSelectedDateEvents().map((event, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 rounded-2xl border flex items-start gap-3"
                    style={{
                      background: 'rgba(255, 255, 255, 0.8)',
                      borderColor: event.color,
                      borderWidth: '2px'
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${event.color}15` }}
                    >
                      <Clock className="w-5 h-5" style={{ color: event.color }} />
                    </div>
                    <div className="flex-1">
                      <h4
                        style={{
                          fontFamily: 'Lexend, sans-serif',
                          fontWeight: 600,
                          fontSize: '15px',
                          color: '#491B6D'
                        }}
                      >
                        {event.title}
                      </h4>
                      <p
                        className="mt-1"
                        style={{
                          fontFamily: 'Lexend, sans-serif',
                          fontWeight: 500,
                          fontSize: '13px',
                          color: '#6B7280'
                        }}
                      >
                        {event.subtitle}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* My Universities List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="p-6 backdrop-blur-lg rounded-3xl border"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.85) 100%)',
            borderColor: 'rgba(255, 255, 255, 0.3)',
            boxShadow: '0 8px 32px -8px rgba(73, 27, 109, 0.2)'
          }}
        >
          <h3
            className="mb-4"
            style={{
              fontFamily: 'Lexend, sans-serif',
              fontWeight: 700,
              fontSize: '18px',
              color: '#491B6D'
            }}
          >
            내 지원 대학 목록
          </h3>

          <div className="space-y-3 mb-4">
            {universities.map((uni, index) => (
              <motion.div
                key={uni.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
                className="p-4 rounded-2xl border"
                style={{
                  background: 'rgba(255, 255, 255, 0.6)',
                  borderColor: 'rgba(73, 27, 109, 0.1)'
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ background: uni.color }}
                      />
                      <h4
                        style={{
                          fontFamily: 'Lexend, sans-serif',
                          fontWeight: 600,
                          fontSize: '15px',
                          color: '#491B6D'
                        }}
                      >
                        {uni.name}
                      </h4>
                    </div>
                    <p
                      style={{
                        fontFamily: 'Lexend, sans-serif',
                        fontWeight: 400,
                        fontSize: '13px',
                        color: '#6B7280'
                      }}
                    >
                      {uni.department}
                    </p>
                    <p
                      className="mt-2"
                      style={{
                        fontFamily: 'Lexend, sans-serif',
                        fontWeight: 500,
                        fontSize: '12px',
                        color: '#F59E0B'
                      }}
                    >
                      마감: {uni.deadline}
                    </p>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setUniversities(universities.filter(u => u.id !== uni.id));
                    }}
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)'
                    }}
                  >
                    <X className="w-4 h-4" style={{ color: '#EF4444' }} />
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-3">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAddModal(true)}
              className="py-3 px-3 rounded-xl flex items-center justify-center gap-1.5"
              style={{
                background: 'linear-gradient(135deg, #A78BFA 0%, #8B5CF6 100%)',
                boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
              }}
            >
              <Plus className="w-4 h-4" style={{ color: '#FFFFFF' }} />
              <span
                style={{
                  fontFamily: 'Lexend, sans-serif',
                  fontWeight: 600,
                  fontSize: '13px',
                  color: '#FFFFFF'
                }}
              >
                추가
              </span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowSearchModal(true)}
              className="py-3 px-3 rounded-xl flex items-center justify-center gap-1.5"
              style={{
                background: 'linear-gradient(135deg, #FCD34D 0%, #F59E0B 100%)',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
              }}
            >
              <Search className="w-4 h-4" style={{ color: '#FFFFFF' }} />
              <span
                style={{
                  fontFamily: 'Lexend, sans-serif',
                  fontWeight: 600,
                  fontSize: '13px',
                  color: '#FFFFFF'
                }}
              >
                검색
              </span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAdmissionModal(true)}
              className="py-3 px-3 rounded-xl flex items-center justify-center gap-1.5"
              style={{
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
              }}
            >
              <FileText className="w-4 h-4" style={{ color: '#FFFFFF' }} />
              <span
                style={{
                  fontFamily: 'Lexend, sans-serif',
                  fontWeight: 600,
                  fontSize: '13px',
                  color: '#FFFFFF'
                }}
              >
                모집요강
              </span>
            </motion.button>
          </div>
        </motion.div>

        {/* D-Day Counter Card */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowDdayModal(true)}
          className="w-full p-6 backdrop-blur-lg rounded-3xl border cursor-pointer"
          style={{
            background: selectedDday 
              ? `linear-gradient(135deg, ${selectedDday.color}15 0%, ${selectedDday.color}05 100%)`
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.85) 100%)',
            borderColor: selectedDday?.color || 'rgba(255, 255, 255, 0.3)',
            boxShadow: `0 8px 32px -8px ${selectedDday?.color || 'rgba(73, 27, 109, 0.2)'}40`
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{
                  background: selectedDday 
                    ? `${selectedDday.color}20`
                    : 'rgba(73, 27, 109, 0.1)'
                }}
              >
                <Target
                  className="w-8 h-8"
                  style={{ color: selectedDday?.color || '#491B6D' }}
                />
              </div>
              <div className="flex-1 text-left">
                {selectedDday ? (
                  <>
                    <p
                      style={{
                        fontFamily: 'Lexend, sans-serif',
                        fontWeight: 500,
                        fontSize: '13px',
                        color: '#6B7280'
                      }}
                    >
                      {selectedDday.name}
                    </p>
                    <h3
                      className="mt-1"
                      style={{
                        fontFamily: 'Lexend, sans-serif',
                        fontWeight: 800,
                        fontSize: '32px',
                        color: selectedDday.color,
                        lineHeight: '1'
                      }}
                    >
                      D-{calculateDday()}
                    </h3>
                  </>
                ) : (
                  <p
                    style={{
                      fontFamily: 'Lexend, sans-serif',
                      fontWeight: 600,
                      fontSize: '15px',
                      color: '#491B6D'
                    }}
                  >
                    D-Day 설정하기
                  </p>
                )}
              </div>
            </div>
            <ChevronRight className="w-6 h-6" style={{ color: '#6B7280' }} />
          </div>
        </motion.button>
      </div>

      {/* Add University Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(0, 0, 0, 0.5)' }}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md p-6 rounded-3xl"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 0.95) 100%)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3
                style={{
                  fontFamily: 'Lexend, sans-serif',
                  fontWeight: 700,
                  fontSize: '18px',
                  color: '#491B6D'
                }}
              >
                대학 추가
              </h3>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowAddModal(false)}
              >
                <X className="w-6 h-6" style={{ color: '#491B6D' }} />
              </motion.button>
            </div>
            <p
              style={{
                fontFamily: 'Lexend, sans-serif',
                fontWeight: 400,
                fontSize: '14px',
                color: '#6B7280'
              }}
            >
              대학 추가 기능이 곧 제공됩니다! 🎓
            </p>
          </motion.div>
        </div>
      )}

      {/* Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(0, 0, 0, 0.5)' }}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md p-6 rounded-3xl"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 0.95) 100%)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3
                style={{
                  fontFamily: 'Lexend, sans-serif',
                  fontWeight: 700,
                  fontSize: '18px',
                  color: '#491B6D'
                }}
              >
                학과별 대학 검색
              </h3>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowSearchModal(false)}
              >
                <X className="w-6 h-6" style={{ color: '#491B6D' }} />
              </motion.button>
            </div>
            <p
              style={{
                fontFamily: 'Lexend, sans-serif',
                fontWeight: 400,
                fontSize: '14px',
                color: '#6B7280'
              }}
            >
              학과별 검색 기능이 곧 제공됩니다! 🔍
            </p>
          </motion.div>
        </div>
      )}

      {/* Admission Guide Modal */}
      {showAdmissionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(0, 0, 0, 0.5)' }}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md rounded-3xl overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 0.95) 100%)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              maxHeight: '80vh'
            }}
          >
            {/* Modal Header */}
            <div className="p-6 border-b" style={{ borderColor: 'rgba(73, 27, 109, 0.1)' }}>
              <div className="flex items-center justify-between">
                <h3
                  style={{
                    fontFamily: 'Lexend, sans-serif',
                    fontWeight: 700,
                    fontSize: '18px',
                    color: '#491B6D'
                  }}
                >
                  모집요강 보기
                </h3>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowAdmissionModal(false)}
                >
                  <X className="w-6 h-6" style={{ color: '#491B6D' }} />
                </motion.button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 100px)' }}>
              <div className="space-y-4">
                {/* University Cards */}
                {universities.map((uni) => (
                  <motion.div
                    key={uni.id}
                    whileTap={{ scale: 0.98 }}
                    className="p-5 rounded-2xl border cursor-pointer"
                    style={{
                      background: 'rgba(255, 255, 255, 0.8)',
                      borderColor: uni.color,
                      borderWidth: '2px'
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: `${uni.color}20` }}
                      >
                        <FileText className="w-6 h-6" style={{ color: uni.color }} />
                      </div>
                      <div className="flex-1">
                        <h4
                          style={{
                            fontFamily: 'Lexend, sans-serif',
                            fontWeight: 600,
                            fontSize: '16px',
                            color: '#491B6D'
                          }}
                        >
                          {uni.name}
                        </h4>
                        <p
                          className="mt-1"
                          style={{
                            fontFamily: 'Lexend, sans-serif',
                            fontWeight: 500,
                            fontSize: '13px',
                            color: '#6B7280'
                          }}
                        >
                          {uni.department}
                        </p>
                        <div className="mt-3 space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              style={{
                                fontFamily: 'Lexend, sans-serif',
                                fontWeight: 600,
                                fontSize: '11px',
                                color: '#8B5CF6'
                              }}
                            >
                              접수마감
                            </span>
                            <span
                              style={{
                                fontFamily: 'Lexend, sans-serif',
                                fontWeight: 500,
                                fontSize: '11px',
                                color: '#6B7280'
                              }}
                            >
                              {uni.deadline}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              style={{
                                fontFamily: 'Lexend, sans-serif',
                                fontWeight: 600,
                                fontSize: '11px',
                                color: '#8B5CF6'
                              }}
                            >
                              시험과목
                            </span>
                            <span
                              style={{
                                fontFamily: 'Lexend, sans-serif',
                                fontWeight: 500,
                                fontSize: '11px',
                                color: '#6B7280'
                              }}
                            >
                              영어, 수학, 논술
                            </span>
                          </div>
                        </div>
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          className="mt-4 w-full py-2 px-4 rounded-lg"
                          style={{
                            background: uni.color,
                            boxShadow: `0 4px 12px ${uni.color}40`
                          }}
                        >
                          <span
                            style={{
                              fontFamily: 'Lexend, sans-serif',
                              fontWeight: 600,
                              fontSize: '13px',
                              color: '#FFFFFF'
                            }}
                          >
                            모집요강 PDF 보기
                          </span>
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* D-Day Selection Modal */}
      {showDdayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(0, 0, 0, 0.5)' }}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md rounded-3xl overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 0.95) 100%)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              maxHeight: '80vh'
            }}
          >
            {/* Modal Header */}
            <div className="p-6 border-b" style={{ borderColor: 'rgba(73, 27, 109, 0.1)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <h3
                    style={{
                      fontFamily: 'Lexend, sans-serif',
                      fontWeight: 700,
                      fontSize: '18px',
                      color: '#491B6D'
                    }}
                  >
                    D-Day 설정
                  </h3>
                  <p
                    className="mt-1"
                    style={{
                      fontFamily: 'Lexend, sans-serif',
                      fontWeight: 400,
                      fontSize: '13px',
                      color: '#6B7280'
                    }}
                  >
                    카운트다운할 일정을 선택하세요
                  </p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowDdayModal(false)}
                >
                  <X className="w-6 h-6" style={{ color: '#491B6D' }} />
                </motion.button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 100px)' }}>
              <div className="space-y-3">
                {/* Quick Select from Universities */}
                {universities.map((uni) => {
                  const uniDate = new Date(uni.deadline);
                  const isSelected = selectedDday?.name === `${uni.name} 원서접수`;
                  
                  return (
                    <motion.button
                      key={uni.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setSelectedDday({
                          name: `${uni.name} 원서접`,
                          date: uniDate,
                          color: uni.color
                        });
                        setShowDdayModal(false);
                      }}
                      className="w-full p-5 rounded-2xl border text-left"
                      style={{
                        background: isSelected ? `${uni.color}15` : 'rgba(255, 255, 255, 0.8)',
                        borderColor: isSelected ? uni.color : 'rgba(73, 27, 109, 0.1)',
                        borderWidth: isSelected ? '2px' : '1px'
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: `${uni.color}20` }}
                        >
                          <Calendar className="w-6 h-6" style={{ color: uni.color }} />
                        </div>
                        <div className="flex-1">
                          <h4
                            style={{
                              fontFamily: 'Lexend, sans-serif',
                              fontWeight: 600,
                              fontSize: '15px',
                              color: '#491B6D'
                            }}
                          >
                            {uni.name}
                          </h4>
                          <p
                            style={{
                              fontFamily: 'Lexend, sans-serif',
                              fontWeight: 500,
                              fontSize: '13px',
                              color: '#6B7280'
                            }}
                          >
                            원서접수 마감일
                          </p>
                          <p
                            className="mt-1"
                            style={{
                              fontFamily: 'Lexend, sans-serif',
                              fontWeight: 600,
                              fontSize: '12px',
                              color: uni.color
                            }}
                          >
                            {uni.deadline}
                          </p>
                        </div>
                        {isSelected && (
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center"
                            style={{ background: uni.color }}
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="white"
                              strokeWidth={3}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                    </motion.button>
                  );
                })}

                {/* Divider */}
                <div className="flex items-center gap-3 py-2">
                  <div className="flex-1 h-px" style={{ background: 'rgba(73, 27, 109, 0.1)' }} />
                  <span
                    style={{
                      fontFamily: 'Lexend, sans-serif',
                      fontWeight: 500,
                      fontSize: '12px',
                      color: '#6B7280'
                    }}
                  >
                    또는
                  </span>
                  <div className="flex-1 h-px" style={{ background: 'rgba(73, 27, 109, 0.1)' }} />
                </div>

                {/* Custom Date Option */}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  className="w-full p-5 rounded-2xl border"
                  style={{
                    background: 'rgba(139, 92, 246, 0.05)',
                    borderColor: 'rgba(139, 92, 246, 0.2)',
                    borderStyle: 'dashed',
                    borderWidth: '2px'
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(139, 92, 246, 0.15)' }}
                    >
                      <Plus className="w-6 h-6" style={{ color: '#8B5CF6' }} />
                    </div>
                    <div className="flex-1 text-left">
                      <h4
                        style={{
                          fontFamily: 'Lexend, sans-serif',
                          fontWeight: 600,
                          fontSize: '15px',
                          color: '#491B6D'
                        }}
                      >
                        직접 날짜 설정
                      </h4>
                      <p
                        style={{
                          fontFamily: 'Lexend, sans-serif',
                          fontWeight: 500,
                          fontSize: '13px',
                          color: '#6B7280'
                        }}
                      >
                        원하는 날짜를 선택하세요
                      </p>
                    </div>
                  </div>
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}