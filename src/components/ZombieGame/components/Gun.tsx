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
        className="w-10 h-16 relative"
        style={{
          background: 'linear-gradient(180deg, #374151 0%, #1f2937 100%)',
          borderRadius: '4px 4px 2px 2px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* 총구 */}
        <div
          className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-2 h-4"
          style={{
            background: 'linear-gradient(180deg, #4b5563 0%, #374151 100%)',
            borderRadius: '2px 2px 0 0',
          }}
        />
        {/* 손잡이 */}
        <div
          className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-6 h-8"
          style={{
            background: 'linear-gradient(180deg, #1f2937 0%, #111827 100%)',
            borderRadius: '0 0 4px 4px',
          }}
        />
      </div>
    </motion.div>
  );
}
