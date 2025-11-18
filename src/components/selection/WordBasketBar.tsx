import { AnimatePresence, motion } from 'motion/react';
import { ShoppingCart, XCircle } from 'lucide-react';

interface WordBasketBarProps {
  count: number;
  onReview: () => void;
  onClear: () => void;
  label?: string;
}

export function WordBasketBar({ count, onReview, onClear, label = '선택한 단어' }: WordBasketBarProps) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: 'spring', stiffness: 260, damping: 30 }}
          className="fixed bottom-4 left-0 right-0 z-[100] px-4 pointer-events-none"
        >
          <div className="mx-auto max-w-md pointer-events-auto">
            <div className="bg-gradient-to-r from-[#5B21B6] to-[#7C3AED] text-white rounded-3xl shadow-xl border border-white/10 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm uppercase tracking-wide text-white/70">{label}</p>
                  <p className="text-lg font-bold">{count}개 단어가 준비됐어요</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:flex-shrink-0">
                <button
                  onClick={onClear}
                  className="px-3 py-2 rounded-2xl bg-white/10 hover:bg-white/20 transition-colors text-sm font-semibold flex items-center gap-1"
                >
                  <XCircle className="w-4 h-4" />
                  비우기
                </button>
                <button
                  onClick={onReview}
                  className="px-4 py-2 rounded-2xl bg-white text-[#5B21B6] font-bold text-sm shadow-md hover:shadow-lg transition-all"
                >
                  단어장 만들기
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
