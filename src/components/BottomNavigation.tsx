import { motion } from 'motion/react';
import { imgHome01 } from '../imports/svg-5stpn';
import { imgFrame, imgFrame1, imgFrame2, imgFrame3 } from '../imports/svg-vnq26';
import { Sparkles, Gift, FileEdit, MessageSquare, Bot } from 'lucide-react';

interface BottomNavigationProps {
  currentScreen: string;
  onScreenChange: (screen: 'home' | 'gift' | 'quiz' | 'ai' | 'vocabulary-creator' | 'profile' | 'text-extractor') => void;
}

function NavigationIcon({ src, active, IconComponent, isEmoji, emojiText }: { src?: string; active: boolean; IconComponent?: any; isEmoji?: boolean; emojiText?: string }) {
  if (isEmoji && emojiText) {
    return (
      <div className="relative w-6 h-6 flex items-center justify-center">
        <span className="text-2xl">{emojiText}</span>
      </div>
    );
  }
  
  if (IconComponent) {
    return (
      <div className="relative w-6 h-6 flex items-center justify-center">
        <IconComponent 
          className={`w-5 h-5 transition-all duration-300 ${
            active ? 'text-purple-600' : 'text-white'
          }`}
          strokeWidth={2}
        />
      </div>
    );
  }
  
  return (
    <div className="relative w-6 h-6 flex items-center justify-center">
      <img 
        className={`w-full h-full object-contain transition-all duration-300 ${
          active ? 'brightness-0' : 'brightness-0 invert'
        }`} 
        src={src} 
        alt=""
      />
    </div>
  );
}

export function BottomNavigation({ currentScreen, onScreenChange }: BottomNavigationProps) {
  const navItems = [
    { icon: imgHome01, screen: 'home' as const, active: currentScreen === 'home' },
    { IconComponent: Gift, screen: 'gift' as const, active: currentScreen === 'gift' },
    { IconComponent: Sparkles, screen: 'vocabulary-creator' as const, active: currentScreen === 'vocabulary-creator' },
    { IconComponent: Bot, screen: 'ai' as const, active: currentScreen === 'ai' },
    { IconComponent: MessageSquare, screen: 'text-extractor' as const, active: currentScreen === 'text-extractor' },
  ];

  // Perfect mathematical positioning system for 5 items
  // Container: 320px wide, 10px padding each side = 300px usable
  // 5 sections of 60px each = perfect distribution
  const iconPositions = [10, 70, 130, 190, 250]; // Left edge of each 60px section
  const indicatorPositions = [10, 70, 130, 190, 250]; // Same positions for perfect alignment

  const getActiveIndex = () => {
    switch (currentScreen) {
      case 'home': return 0;
      case 'gift': return 1;
      case 'vocabulary-creator': return 2;
      case 'ai': return 3;
      case 'text-extractor': return 4;
      default: return 0;
    }
  };

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 1, duration: 0.6, ease: "easeOut" }}
      className="fixed bottom-6 left-4 right-4 z-50"
    >
      <div className="bg-[#091A7A]/95 backdrop-blur-lg relative rounded-[50px] mx-auto shadow-elevated border border-white/20" style={{ width: '320px', height: '80px' }}>
        {/* Active indicator with design system colors */}
        <motion.div
          className="absolute bg-white rounded-full shadow-interactive"
          style={{ width: '60px', height: '60px', top: '10px' }}
          animate={{
            left: `${indicatorPositions[getActiveIndex()]}px`
          }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        />

        {/* Navigation Icons with perfect alignment */}
        <div className="absolute inset-0">
          {navItems.map((item, index) => (
            <motion.button
              key={index}
              whileTap={{ scale: 0.95 }}
              onClick={() => onScreenChange(item.screen)}
              className="absolute z-10 flex items-center justify-center rounded-full transition-all duration-200"
              style={{
                left: `${iconPositions[index]}px`,
                width: '60px',
                height: '60px',
                top: '10px'
              }}
            >
                <NavigationIcon
                  src={item.icon}
                  IconComponent={item.IconComponent}
                  active={item.active}
                  isEmoji={item.isEmoji}
                  emojiText={item.emojiText}
                />
              </motion.button>
            ))}
        </div>
      </div>
    </motion.div>
  );
}