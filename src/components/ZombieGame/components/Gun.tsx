import { motion } from 'motion/react';

export function Gun() {
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="relative"
    >
      {/* 총 이미지 - Placeholder */}
      <div
        className="w-20 h-32 relative"
        style={{
          background: 'linear-gradient(180deg, #374151 0%, #1f2937 100%)',
          borderRadius: '8px 8px 4px 4px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* 총구 */}
        <div
          className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-4 h-8"
          style={{
            background: 'linear-gradient(180deg, #4b5563 0%, #374151 100%)',
            borderRadius: '4px 4px 0 0',
          }}
        />
        {/* 손잡이 */}
        <div
          className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-12 h-16"
          style={{
            background: 'linear-gradient(180deg, #1f2937 0%, #111827 100%)',
            borderRadius: '0 0 8px 8px',
          }}
        />
      </div>
    </motion.div>
  );
}
