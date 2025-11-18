import { motion } from 'motion/react';
import { WordDisplayProps } from '../types';

export function WordDisplay({ word }: WordDisplayProps) {
  return (
    <motion.div
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="text-center"
    >
      <div
        className="inline-block px-8 py-4 rounded-lg"
        style={{
          background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5), 0 0 40px rgba(59, 130, 246, 0.2)',
          border: '2px solid rgba(59, 130, 246, 0.3)',
        }}
      >
        <h1
          className="text-white font-black tracking-wider"
          style={{
            fontSize: '36px',
            textShadow: '0 0 20px rgba(59, 130, 246, 0.5), 0 4px 8px rgba(0, 0, 0, 0.8)',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {word}
        </h1>
      </div>
    </motion.div>
  );
}
