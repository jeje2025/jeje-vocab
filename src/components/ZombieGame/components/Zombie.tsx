import { motion } from 'motion/react';
import { ZombieProps } from '../types';

// Import ghost images
import ghost1 from '../../../assets/ghosts/KakaoTalk_Photo_2025-11-17-19-39-42.png';
import ghost2 from '../../../assets/ghosts/KakaoTalk_Photo_2025-11-17-19-39-46.png';
import ghost3 from '../../../assets/ghosts/KakaoTalk_Photo_2025-11-17-19-39-49.png';
import ghost4 from '../../../assets/ghosts/KakaoTalk_Photo_2025-11-17-19-39-52.png';

const ghostImages = [ghost1, ghost2, ghost3, ghost4];

export function Zombie({ zombie, onClick }: ZombieProps) {
  // Select ghost image based on zombie id (consistent per zombie)
  const ghostIndex = Math.abs(zombie.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % ghostImages.length;
  const ghostImage = ghostImages[ghostIndex];

  // Generate random animation parameters based on zombie id
  const seed = zombie.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const floatDuration = 3 + (seed % 3); // 3-5 seconds
  const driftDuration = 10 + (seed % 8); // 10-17 seconds
  const driftX = 50 + (seed % 50); // 50-99px drift (좌우 좁힘)
  const driftY = 50 + (seed % 60); // 50-109px drift

  // 각 유령마다 다른 방향 패턴을 위한 랜덤 요소
  const directionSeed = seed * 31; // 다른 시드로 방향 결정
  const pattern = directionSeed % 4; // 4가지 다른 패턴

  return (
    <motion.div
      data-zombie-id={zombie.id}
      initial={{ scale: 0, opacity: 0 }}
      animate={{
        scale: 1,
        opacity: 1,
      }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{
        scale: { duration: 0.3 },
      }}
      onClick={() => onClick(zombie.id)}
      className="absolute cursor-pointer select-none z-30"
      style={{
        left: `${zombie.x}%`,
        top: `${zombie.y}%`,
        transform: `translate(-50%, -50%)`,
      }}
      whileTap={{ scale: 0.9 }}
    >
      {/* 유령 본체 - 떠다니는 애니메이션 */}
      <div
        className="relative flex flex-col items-center"
        style={{
          animation: `ghostFloat-${zombie.id} ${floatDuration}s ease-in-out infinite, ghostDrift-${zombie.id} ${driftDuration}s ease-in-out infinite`,
          animationDelay: `${(seed % 10) * 0.1}s`,
        }}
      >
        {/* 유령 이미지 */}
        <div className="relative">
          <img
            src={ghostImage}
            alt="ghost"
            className="w-20 h-20 object-contain"
            style={{
              filter: 'drop-shadow(0 0 10px rgba(100, 100, 100, 0.5))',
              animation: `ghostWobble-${zombie.id} ${2 + (seed % 2)}s ease-in-out infinite`,
            }}
          />
        </div>

        {/* 뜻 텍스트 - 유령 아래에 표시 */}
        <div
          className="mt-1 px-3 py-1.5 bg-white/95 rounded-lg shadow-lg border border-gray-200"
          style={{
            maxWidth: '120px',
          }}
        >
          <span
            className="text-gray-800 font-semibold leading-tight block text-center"
            style={{
              fontSize: zombie.meaning.length > 10 ? '10px' : zombie.meaning.length > 6 ? '11px' : '12px',
            }}
          >
            {zombie.meaning}
          </span>
        </div>
      </div>

      {/* CSS Keyframes for ghost animations */}
      <style>{`
        @keyframes ghostFloat-${zombie.id} {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
        @keyframes ghostDrift-${zombie.id} {
          ${pattern === 0 ? `
            0%, 100% { transform: translate(0, 0); }
            25% { transform: translate(${driftX}px, -${driftY}px); }
            50% { transform: translate(-${driftX * 0.5}px, ${driftY}px); }
            75% { transform: translate(${driftX * 0.7}px, ${driftY * 0.5}px); }
          ` : pattern === 1 ? `
            0%, 100% { transform: translate(0, 0); }
            25% { transform: translate(-${driftX}px, ${driftY}px); }
            50% { transform: translate(${driftX * 0.8}px, -${driftY * 0.6}px); }
            75% { transform: translate(-${driftX * 0.3}px, -${driftY * 0.8}px); }
          ` : pattern === 2 ? `
            0%, 100% { transform: translate(0, 0); }
            33% { transform: translate(${driftX * 0.9}px, ${driftY * 0.7}px); }
            66% { transform: translate(-${driftX * 0.6}px, -${driftY}px); }
          ` : `
            0%, 100% { transform: translate(0, 0); }
            20% { transform: translate(-${driftX * 0.8}px, -${driftY * 0.5}px); }
            40% { transform: translate(${driftX * 0.4}px, ${driftY}px); }
            60% { transform: translate(${driftX}px, -${driftY * 0.3}px); }
            80% { transform: translate(-${driftX * 0.5}px, ${driftY * 0.6}px); }
          `}
        }
        @keyframes ghostWobble-${zombie.id} {
          0%, 100% { transform: rotate(-3deg); }
          50% { transform: rotate(3deg); }
        }
      `}</style>
    </motion.div>
  );
}
