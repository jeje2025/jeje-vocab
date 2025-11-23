import { motion } from 'motion/react';
import { LogOut } from 'lucide-react';
import { useState, useRef } from 'react';

interface HeaderProps {
  profileImage?: string;
  userXP?: number;
  recentXPGain?: number;
  showXPAnimation?: boolean;
  onXPAnimationComplete?: () => void;
  levelProgress?: {
    currentLevel: number;
    xpForNextLevel: number;
    xpInCurrentLevel: number;
  };
  onAdminAccess?: () => void;
  ddayInfo?: {
    name: string;
    date: Date;
    color: string;
  } | null;
  onDdayClick?: () => void;
  onLogout?: () => void;
  userName?: string;
}

export function Header(props: HeaderProps) {
  const [clickCount, setClickCount] = useState(0);
  const clickTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleLogoClick = () => {
    // Clear previous timeout
    if (clickTimeout.current) {
      clearTimeout(clickTimeout.current);
    }

    const newCount = clickCount + 1;
    setClickCount(newCount);

    // Check if 5 clicks reached
    if (newCount >= 5) {
      setClickCount(0);
      if (props.onAdminAccess) {
        props.onAdminAccess();
      }
    } else {
      // Reset count after 2 seconds of inactivity
      clickTimeout.current = setTimeout(() => {
        setClickCount(0);
      }, 2000);
    }
  };

  // Calculate D-Day
  const calculateDday = () => {
    if (!props.ddayInfo) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const target = new Date(props.ddayInfo.date);
    target.setHours(0, 0, 0, 0);
    const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.abs(diff);
  };

  return (
    <div 
      className="relative px-7 pt-6 pb-5 overflow-hidden"
      style={{
        background: 'transparent'
      }}
    >
      {/* Subtle ambient glow */}
      <div 
        className="absolute top-0 left-0 w-40 h-40 rounded-full opacity-20 blur-3xl"
        style={{
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%)',
          transform: 'translate(-20%, -20%)'
        }}
      />
      <div 
        className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-15 blur-3xl"
        style={{
          background: 'radial-gradient(circle, rgba(167, 139, 250, 0.3) 0%, transparent 70%)',
          transform: 'translate(20%, -20%)'
        }}
      />

      {/* Content */}
      <div className="relative flex items-center justify-between">
        {/* Left - Logo & Badge */}
        <motion.div
          initial={{ opacity: 0, x: -15 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col gap-0"
        >
          {/* Logo */}
          <div
            style={{
              fontFamily: 'Inter, -apple-system, sans-serif',
              fontSize: '36px',
              letterSpacing: '-1.6px',
              filter: 'drop-shadow(0 1px 1px rgba(9, 26, 122, 0.08))'
            }}
            onClick={handleLogoClick}
          >
            <span
              style={{
                fontWeight: 800,
                color: '#091A7A'
              }}
            >
              JEJE
            </span>
            <span
              style={{
                fontWeight: 500,
                color: '#091A7A'
              }}
            >
              VOCA
            </span>
          </div>
        </motion.div>

        {/* Right - User & Logout */}
        <motion.div
          initial={{ opacity: 0, x: 15 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-3"
        >
          {/* User Greeting - Text Only */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="flex flex-col items-end gap-1"
          >
            {/* Name with fire emoji */}
            <div className="flex items-center gap-1.5">
              <span
                style={{
                  fontFamily: 'Lexend, sans-serif',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#491B6D'
                }}
              >
                {props.userName || '사용자'}님
              </span>
              <span style={{ fontSize: '13px' }}>
                🔥
              </span>
            </div>
            
            {/* D-Day Display */}
            {props.ddayInfo && (
              <motion.button
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                whileTap={{ scale: 0.95 }}
                onClick={props.onDdayClick}
              >
                <div
                  className="px-3 py-1 rounded-xl"
                  style={{
                    background: '#491B6D',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.08)',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'Lexend, sans-serif',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: 'white',
                      letterSpacing: '0.3px',
                    }}
                  >
                    D-{calculateDday()}
                  </span>
                </div>
              </motion.button>
            )}
          </motion.div>

          {/* Logout Button */}
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            whileTap={{ scale: 0.9 }}
            className="w-12 h-12 rounded-full flex items-center justify-center border-none"
            style={{
              background: 'white',
              boxShadow: '0 1px 2px rgba(9, 26, 122, 0.08)',
              cursor: 'pointer'
            }}
            onClick={props.onLogout}
          >
            <LogOut
              className="w-5 h-5"
              style={{ color: '#091A7A' }}
            />
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}