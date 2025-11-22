import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarWidgetProps {
  onClick?: () => void;
}

export function CalendarWidget({ onClick }: CalendarWidgetProps) {
  const today = 3;
  const daysInWeek = [
    { id: 'mon', label: 'M' },
    { id: 'tue', label: 'T' },
    { id: 'wed', label: 'W' },
    { id: 'thu', label: 'T' },
    { id: 'fri', label: 'F' },
    { id: 'sat', label: 'S' },
    { id: 'sun', label: 'S' }
  ];
  const weekDates = [
    { id: 'date-1', date: 1 },
    { id: 'date-2', date: 2 },
    { id: 'date-3', date: 3 },
    { id: 'date-4', date: 4 },
    { id: 'date-5', date: 5 },
    { id: 'date-6', date: 6 },
    { id: 'date-7', date: 7 }
  ];

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
        <span className="text-[12px] text-gray-500 font-medium">September 2025</span>
      </div>

      <div className="grid grid-cols-7 gap-3">
        {daysInWeek.map((day) => (
          <div key={day.id} className="text-center text-[11px] text-gray-400 font-semibold uppercase tracking-wide py-1">
            {day.label}
          </div>
        ))}

        {weekDates.map((dateObj, index) => (
          <motion.button
            key={dateObj.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.6 + index * 0.05, type: "spring", stiffness: 400, damping: 15 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className={`aspect-square flex items-center justify-center rounded-full text-[12px] font-medium transition-all duration-200 ${
              dateObj.date === today
                ? 'bg-[#ADC8FF] text-[#091A7A] shadow-md'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            {dateObj.date}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}