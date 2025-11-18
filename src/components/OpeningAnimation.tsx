import { motion } from 'motion/react';
import { useState, useEffect } from 'react';
import logo from 'figma:asset/aeb1623adfde368b33dc26e61638e23dfc50bf84.png';
import { Sparkles } from 'lucide-react';

interface OpeningAnimationProps {
  onAnimationComplete: () => void;
}

export function OpeningAnimation({ onAnimationComplete }: OpeningAnimationProps) {
  const [currentPhase, setCurrentPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setCurrentPhase(1), 300),
      setTimeout(() => setCurrentPhase(2), 1200),
      setTimeout(() => setCurrentPhase(3), 2000),
      setTimeout(() => onAnimationComplete(), 4000),
    ];

    return () => timers.forEach(clearTimeout);
  }, [onAnimationComplete]);

  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
      {/* Dynamic Wave Background */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ 
          opacity: 1,
          background: [
            'radial-gradient(circle at 20% 20%, #7C3AED 0%, #C8B6FF 40%, #ffffff 100%)',
            'radial-gradient(circle at 80% 30%, #C8B6FF 0%, #7C3AED 50%, #ffffff 100%)',
            'radial-gradient(circle at 40% 80%, #7C3AED 0%, #C8B6FF 60%, #ffffff 100%)',
            'radial-gradient(circle at 70% 10%, #C8B6FF 0%, #7C3AED 40%, #ffffff 100%)',
            'radial-gradient(circle at 20% 70%, #7C3AED 0%, #C8B6FF 50%, #ffffff 100%)'
          ]
        }}
        transition={{ 
          duration: 1,
          background: { repeat: Infinity, duration: 8, ease: "easeInOut" }
        }}
        className="absolute inset-0 opacity-30"
      />

      {/* Additional Wave Layers */}
      <motion.div
        animate={{ 
          background: [
            'linear-gradient(45deg, transparent 0%, #C8B6FF 30%, transparent 60%)',
            'linear-gradient(135deg, transparent 0%, #7C3AED 20%, transparent 40%)',
            'linear-gradient(225deg, transparent 0%, #C8B6FF 40%, transparent 70%)',
            'linear-gradient(315deg, transparent 0%, #7C3AED 25%, transparent 50%)'
          ]
        }}
        transition={{ 
          background: { repeat: Infinity, duration: 6, ease: "easeInOut" }
        }}
        className="absolute inset-0 opacity-20"
      />

      {/* Flowing Wave Overlay */}
      <motion.div
        animate={{ 
          background: [
            'conic-gradient(from 0deg at 50% 50%, transparent 0deg, #C8B6FF 90deg, transparent 180deg, #7C3AED 270deg, transparent 360deg)',
            'conic-gradient(from 90deg at 50% 50%, transparent 0deg, #7C3AED 90deg, transparent 180deg, #C8B6FF 270deg, transparent 360deg)',
            'conic-gradient(from 180deg at 50% 50%, transparent 0deg, #C8B6FF 90deg, transparent 180deg, #7C3AED 270deg, transparent 360deg)',
            'conic-gradient(from 270deg at 50% 50%, transparent 0deg, #7C3AED 90deg, transparent 180deg, #C8B6FF 270deg, transparent 360deg)'
          ]
        }}
        transition={{ 
          background: { repeat: Infinity, duration: 10, ease: "linear" }
        }}
        className="absolute inset-0 opacity-15"
      />

      {/* Floating Orbs */}
      <div className="absolute inset-0">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ 
              x: Math.random() * 400,
              y: Math.random() * 800,
              opacity: 0,
              scale: 0
            }}
            animate={{ 
              opacity: [0, 0.6, 0],
              scale: [0, 1, 0],
              x: [
                Math.random() * 400,
                Math.random() * 400,
                Math.random() * 400
              ],
              y: [
                Math.random() * 800,
                Math.random() * 800,
                Math.random() * 800
              ]
            }}
            transition={{
              duration: 4,
              delay: Math.random() * 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute w-3 h-3 rounded-full"
            style={{
              background: `linear-gradient(45deg, #C8B6FF, #7C3AED)`,
              filter: 'blur(1px)'
            }}
          />
        ))}
      </div>

      {/* Main Content Container */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.8 }}
        className="relative z-10 flex flex-col items-center justify-center text-center px-8"
      >
        {/* Logo Container with Glass Morphism */}
        {currentPhase >= 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ 
              opacity: 1, 
              y: 0,
              scale: 1
            }}
            transition={{ 
              duration: 0.8,
              ease: [0.23, 1, 0.32, 1]
            }}
            className="relative mb-12"
          >
            {/* Glow Effect */}
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.6, 0.3]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute inset-0 w-32 h-32 bg-[#C8B6FF]/30 rounded-[2rem] blur-lg"
            />
            
            {/* Main Logo Container - White Background */}
            <div className="relative w-32 h-32 bg-white/90 border border-white/30 rounded-[2rem] p-6 shadow-elevated backdrop-blur-lg">
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="w-full h-full"
              >
                <img src={logo} alt="JEJEVOCA Logo" className="w-full h-full object-contain" />
              </motion.div>
            </div>

            {/* Sparkle Effects */}
            <Sparkles 
              size={20} 
              className="absolute -top-2 -right-2 text-[#C8B6FF] animate-pulse" 
            />
            <Sparkles 
              size={16} 
              className="absolute -bottom-2 -left-2 text-[#7C3AED] animate-pulse" 
              style={{ animationDelay: '0.5s' }}
            />
          </motion.div>
        )}

        {/* Brand Name */}
        {currentPhase >= 2 && (
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ 
              duration: 0.8,
              ease: [0.23, 1, 0.32, 1]
            }}
            className="text-center mb-6"
          >
            <div className="flex items-center justify-center">
              {"JEJEVOCA".split("").map((letter, i) => (
                <motion.span
                  key={i}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ 
                    delay: i * 0.05,
                    duration: 0.5,
                    ease: "easeOut"
                  }}
                  className="inline-block relative"
                  style={{
                    fontSize: '36px',
                    fontWeight: 700,
                    color: '#ffffff',
                    fontFamily: 'Lexend, sans-serif',
                    textShadow: '0 2px 15px rgba(124, 58, 237, 0.4), 0 4px 25px rgba(200, 182, 255, 0.3)',
                    filter: 'drop-shadow(0 1px 3px rgba(0, 0, 0, 0.2))'
                  }}
                >
                  {letter}
                </motion.span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Tagline */}
        {currentPhase >= 3 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ 
              duration: 0.6,
              ease: "easeOut"
            }}
            className="text-center"
          >
            <motion.p 
              animate={{
                opacity: [0.8, 1, 0.8]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="text-body max-w-sm mx-auto"
              style={{
                fontSize: '16px',
                fontWeight: 500,
                color: '#ffffff',
                fontFamily: 'Lexend, sans-serif',
                textShadow: '0 2px 10px rgba(124, 58, 237, 0.6), 0 1px 3px rgba(0, 0, 0, 0.3)'
              }}
            >
              Own your words. Rule the exam. Start with JEJEVOCA.
            </motion.p>
          </motion.div>
        )}
      </motion.div>

      {/* Bottom Pulse Indicator */}
      {currentPhase >= 3 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="absolute bottom-20 left-1/2 transform -translate-x-1/2"
        >
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="w-16 h-1 bg-gradient-to-r from-transparent via-[#C8B6FF] to-transparent rounded-full"
          />
        </motion.div>
      )}
    </div>
  );
}
