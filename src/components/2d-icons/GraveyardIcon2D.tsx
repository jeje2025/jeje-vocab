import { motion } from 'motion/react';
import skullImage from 'figma:asset/2826bb0f82e8ee44cdcabe4b9b093d546b513206.png';

export function GraveyardIcon2D() {
  return (
    <motion.img
      src={skullImage}
      alt="Skull"
      width={64}
      height={64}
      className="w-16 h-16 object-contain"
      whileTap={{ scale: 0.95 }}
    />
  );
}
