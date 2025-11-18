import { motion } from 'motion/react';
import starImage from 'figma:asset/58e118d790296ac36e08d84dc8b8f99cdbd1d5bf.png';

export function StarredIcon2D() {
  return (
    <motion.img
      src={starImage}
      alt="Star"
      width={64}
      height={64}
      className="w-16 h-16 object-contain"
      whileTap={{ scale: 0.95 }}
    />
  );
}
