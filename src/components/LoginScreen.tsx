import { motion } from 'motion/react';
import { useState } from 'react';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import logo from 'figma:asset/aeb1623adfde368b33dc26e61638e23dfc50bf84.png';
import { getSupabaseClient } from '../utils/supabase/client';

interface LoginScreenProps {
  onLoginComplete: (user: any, token: string) => void;
  onGoToSignup: () => void;
}

export function LoginScreen({ onLoginComplete, onGoToSignup }: LoginScreenProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError('');
  };

  const handleLogin = async () => {
    if (!formData.email || !formData.password) {
      setError('이메일과 비밀번호를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      console.log('🔐 Signing in with Supabase Auth...');
      
      // ✅ Use singleton Supabase client
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        console.error('❌ Supabase signin error:', error);
        
        // 더 친절한 에러 메시지
        let errorMessage = '로그인에 실패했습니다.';
        
        if (error.message.includes('Invalid login credentials') || error.message.includes('invalid_credentials')) {
          errorMessage = '이메일 또는 비밀번호가 올바르지 않습니다.\n계정이 없으시면 회원가입을 해주세요.';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = '이메일 인증이 필요합니다.';
        } else {
          errorMessage = error.message;
        }
        
        throw new Error(errorMessage);
      }

      // ✅ Validate response structure
      console.log('📦 Login response:', data);
      
      if (!data.session || !data.session.access_token) {
        console.error('❌ Invalid response structure:', data);
        throw new Error('서버 응답이 올바르지 않습니다. 잠시 후 다시 시도해주세요.');
      }

      const accessToken = data.session.access_token;
      const user = data.user;

      // Save token to localStorage
      localStorage.setItem('supabase_access_token', accessToken);
      localStorage.setItem('supabase_user', JSON.stringify(user));

      console.log('✅ Login successful, token saved');
      console.log('🔑 Access token:', accessToken.substring(0, 20) + '...');
      
      onLoginComplete(user, accessToken);
    } catch (err: any) {
      console.error('❌ Login error:', err);
      setError(err.message || '로그인에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && formData.email && formData.password) {
      handleLogin();
    }
  };

  const handleKakaoLogin = async () => {
    setIsLoading(true);
    setError('');

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            // Only request profile info, no email
            scope: 'profile_nickname profile_image',
          },
        },
      });

      if (error) {
        throw error;
      }
    } catch (err: any) {
      console.error('❌ Kakao login error:', err);
      setError('카카오 로그인에 실패했습니다.');
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError('');

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        throw error;
      }
    } catch (err: any) {
      console.error('❌ Google login error:', err);
      setError('Google 로그인에 실패했습니다.');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 min-h-screen">
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-12 text-center"
      >
        <img src={logo} alt="JEJEVOCA" className="w-32 h-32 mx-auto mb-6" />
        <h1 className="text-5xl font-extrabold mb-3" style={{ color: '#1e3a8a' }}>
          JEJEVOCA
        </h1>
        <p className="text-gray-600 text-lg">단어 학습의 새로운 기준</p>
      </motion.div>

      {/* Login Form */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="w-full max-w-sm"
      >
        <div className="bg-white/80 backdrop-blur-lg border border-white/30 rounded-3xl p-8 shadow-xl space-y-6">
          {/* Email Input */}
          <div>
            <label className="block text-sm text-gray-700 mb-2">이메일</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="example@email.com"
                className="w-full pl-10 pr-3 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#491B6D]/30 transition-all"
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-sm text-gray-700 mb-2">비밀번호</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#491B6D]/30 transition-all"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-200 rounded-xl p-3 text-center"
            >
              <p className="text-red-600 text-sm">{error}</p>
            </motion.div>
          )}

          {/* Login Button */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleLogin}
            disabled={isLoading || !formData.email || !formData.password}
            className={`w-full py-3 rounded-2xl font-medium transition-all text-center ${
              isLoading || !formData.email || !formData.password
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-[#491B6D] text-white shadow-lg shadow-[#491B6D]/30'
            }`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>로그인 중...</span>
              </div>
            ) : (
              '로그인'
            )}
          </motion.button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">간편 로그인</span>
            </div>
          </div>

          {/* Social Login Buttons */}
          <div className="space-y-3">
            {/* Kakao Login */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleKakaoLogin}
              disabled={isLoading}
              className="w-full py-3 rounded-2xl font-medium transition-all text-center flex items-center justify-center gap-2"
              style={{ backgroundColor: '#FEE500', color: '#000000' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3C6.5 3 2 6.6 2 11c0 2.8 1.9 5.3 4.7 6.7l-1.1 4.1c-.1.3.2.6.5.4l5.3-3.5c.5.1 1 .1 1.6.1 5.5 0 10-3.6 10-8S17.5 3 12 3z"/>
              </svg>
              카카오로 시작하기
            </motion.button>

            {/* Google Login */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full py-3 rounded-2xl font-medium bg-white border border-gray-300 text-gray-700 transition-all text-center flex items-center justify-center gap-2 hover:bg-gray-50"
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google로 시작하기
            </motion.button>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">또는</span>
            </div>
          </div>

          {/* Signup Button */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={onGoToSignup}
            className="w-full py-3 rounded-2xl font-medium bg-white border border-[#491B6D] text-[#491B6D] transition-all text-center"
          >
            이메일로 회원가입
          </motion.button>
          
          {/* Test Account Info */}
          <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-xl">
            <p className="text-xs text-purple-700 text-center">
              💡 계정이 없으신가요? 위의 <strong>회원가입</strong> 버튼을 눌러주세요!
            </p>
          </div>
        </div>
      </motion.div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mt-8 text-center text-gray-600 text-sm"
      >
        © JEJETRANSFER. All rights reserved. · Made by 제제샘
      </motion.div>
    </div>
  );
}