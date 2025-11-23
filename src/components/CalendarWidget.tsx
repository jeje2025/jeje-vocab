import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarWidgetProps {
  onClick?: () => void;
}

export function CalendarWidget({ onClick }: CalendarWidgetProps) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const today = now.getDate();

  // Get the current week (7 days starting from Monday)
  const getWeekDates = (): Array<{
    id: string;
    date: number;
    month: number;
    year: number;
    fullDate: Date;
  }> => {
    const curr = new Date(now);
    const dayOfWeek = curr.getDay(); // 0 (Sunday) to 6 (Saturday)
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Offset to get to Monday

    const monday = new Date(curr);
    monday.setDate(curr.getDate() + mondayOffset);

    const weekDates: Array<{
      id: string;
      date: number;
      month: number;
      year: number;
      fullDate: Date;
    }> = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      weekDates.push({
        id: `date-${i + 1}`,
        date: date.getDate(),
        month: date.getMonth(),
        year: date.getFullYear(),
        fullDate: date
      });
    }
    return weekDates;
  };

  const daysInWeek = [
    { id: 'mon', label: 'M' },
    { id: 'tue', label: 'T' },
    { id: 'wed', label: 'W' },
    { id: 'thu', label: 'T' },
    { id: 'fri', label: 'F' },
    { id: 'sat', label: 'S' },
    { id: 'sun', label: 'S' }
  ];

  const weekDates = getWeekDates();

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.5 }}
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      className="p-6 bg-white rounded-[24px] shadow-lg border border-gray-100 cursor-pointer"
    >
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[18px] font-bold text-[#091A7A]">시험 일정 관리</h3>
        <span className="text-[12px] text-gray-500 font-medium">{monthNames[currentMonth]} {currentYear}</span>
      </div>

      <div className="grid grid-cols-7 gap-3">
        {daysInWeek.map((day) => (
          <div key={day.id} className="text-center text-[11px] text-gray-400 font-semibold uppercase tracking-wide py-1">
            {day.label}
          </div>
        ))}

        {weekDates.map((dateObj, index) => {
          const isToday = dateObj.date === today &&
                         dateObj.month === currentMonth &&
                         dateObj.year === currentYear;
          const isDifferentMonth = dateObj.month !== currentMonth;

          return (
            <motion.button
              key={dateObj.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.6 + index * 0.05, type: "spring", stiffness: 400, damping: 15 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className={`aspect-square flex items-center justify-center rounded-full text-[12px] font-medium transition-all duration-200 ${
                isToday
                  ? 'bg-[#ADC8FF] text-[#091A7A] shadow-md'
                  : isDifferentMonth
                  ? 'text-gray-300 hover:bg-gray-50'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {dateObj.date}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}