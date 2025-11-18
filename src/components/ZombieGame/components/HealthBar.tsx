import { motion } from 'motion/react';
import { Heart } from 'lucide-react';
import { HealthBarProps } from '../types';
import { COLORS } from '../constants';

export function HealthBar({ lives, maxLives }: HealthBarProps) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: maxLives }).map((_, index) => (
        <motion.div
          key={index}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: index * 0.1 }}
        >
          <Heart
            className="w-8 h-8"
            fill={index < lives ? COLORS.HEART_FULL : 'transparent'}
            color={index < lives ? COLORS.HEART_FULL : COLORS.HEART_EMPTY}
            strokeWidth={2}
          />
        </motion.div>
      ))}
    </div>
  );
}
