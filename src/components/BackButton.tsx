import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  onClick: () => void;
}

export function BackButton({ onClick }: BackButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="w-11 h-11 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg border border-white/40"
      style={{ minWidth: '44px', minHeight: '44px' }}
    >
      <ArrowLeft className="w-5 h-5 text-[#491B6D]" />
    </motion.button>
  );
}
