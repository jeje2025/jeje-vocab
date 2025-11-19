import { motion } from 'motion/react';
import { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Mail, User, Lock, Sparkles } from 'lucide-react';
import logo from 'figma:asset/aeb1623adfde368b33dc26e61638e23dfc50bf84.png';
import { getSupabaseClient } from '../utils/supabase/client';

interface SignupScreenProps {
  onBack: () => void;
  onSignupComplete: (user: any, token: string) => void;
}

export function SignupScreen({ onBack, onSignupComplete }: SignupScreenProps) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError('');
  };

  const handleSignup = async () => {
    if (!formData.fullName || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('모든 필드를 입력해주세요.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (formData.password.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      console.log('📝 Creating account with Supabase Auth...');
      
      // ✅ Use singleton Supabase client
      const supabase = getSupabaseClient();
      
      // Sign up with Supabase (이메일 인증 비활성화)
      const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: undefined,
          data: {
            full_name: formData.fullName,
          }
        }
      });

      if (signupError) {
        console.error('❌ Supabase signup error:', signupError);
        
        let errorMessage = '회원가입에 실패했습니다.';
        
        if (signupError.message.includes('already registered') || signupError.message.includes('already exists')) {
          errorMessage = '이미 가입된 이메일입니다.\n로그인을 시도해주세요.';
        } else if (signupError.message.includes('invalid email')) {
          errorMessage = '올바른 이메일 형식이 아닙니다.';
        } else if (signupError.message.includes('password')) {
          errorMessage = '비밀번호는 최소 6자 이상이어야 합니다.';
        } else {
          errorMessage = signupError.message;
        }
        
        throw new Error(errorMessage);
      }

      console.log('✅ Signup successful:', signupData.user?.id);
      
      // ✅ Sign in immediately after signup to get session
      const { data: signinData, error: signinError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (signinError) {
        console.error('❌ Auto signin failed:', signinError);
        throw new Error('계정이 생성되었지만 자동 로그인에 실패했습니다. 다시 로그인해주세요.');
      }

      if (!signinData.session || !signinData.session.access_token) {
        throw new Error('세션 생성에 실패했습니다.');
      }

      const accessToken = signinData.session.access_token;
      const user = signinData.user;

      // Save to localStorage
      localStorage.setItem('supabase_access_token', accessToken);
      localStorage.setItem('supabase_user', JSON.stringify(user));

      console.log('✅ Auto-login successful');
      console.log('🔑 Access token:', accessToken.substring(0, 20) + '...');

      // ✅ Create profile in profiles table
      try {
        console.log('📝 Creating user profile...');
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            student_name: formData.fullName,
            email: formData.email,
          });

        if (profileError) {
          console.error('⚠️ Profile creation failed:', profileError);
          // Don't throw - allow signup to continue even if profile creation fails
        } else {
          console.log('✅ Profile created successfully');
        }
      } catch (profileErr) {
        console.error('⚠️ Profile creation error:', profileErr);
        // Continue with signup even if profile creation fails
      }

      onSignupComplete(user, accessToken);
    } catch (err: any) {
      console.error('❌ Signup error:', err);
      setError(err.message || '회원가입에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKakaoSignup = async () => {
    setIsLoading(true);
    setError('');

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
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
      console.error('❌ Kakao signup error:', err);
      setError('카카오 회원가입에 실패했습니다.');
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setIsLoading(true);
    setError('');

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
      });

      if (error) {
        throw error;
      }
    } catch (err: any) {
      console.error('❌ Google signup error:', err);
      setError('Google 회원가입에 실패했습니다.');
      setIsLoading(false);
    }
  };

  const isFormValid = formData.fullName && formData.email && formData.password &&
                     formData.confirmPassword && formData.password === formData.confirmPassword;

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 min-h-screen">
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8 text-center"
      >
        <img src={logo} alt="JEJEVOCA" className="w-24 h-24 mx-auto mb-3" />
        <h2 className="text-[#491B6D]">회원가입</h2>
        <p className="text-gray-600 text-sm">JEJEVOCA와 함께 시작하세요</p>
      </motion.div>

      {/* Signup Form */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="w-full max-w-sm"
      >
        <div className="bg-white/80 backdrop-blur-lg border border-white/30 rounded-3xl p-8 shadow-xl space-y-5">
          {/* Full Name Input */}
          <div>
            <label className="block text-sm text-gray-700 mb-2">이름</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => handleInputChange('fullName', e.target.value)}
                placeholder="홍길동"
                className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#491B6D]/30 transition-all"
                autoComplete="name"
              />
            </div>
          </div>

          {/* Email Input */}
          <div>
            <label className="block text-sm text-gray-700 mb-2">이메일</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="example@email.com"
                className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#491B6D]/30 transition-all"
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-sm text-gray-700 mb-2">비밀번호</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder="최소 6자 이상"
                className="w-full pl-12 pr-12 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#491B6D]/30 transition-all"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Confirm Password Input */}
          <div>
            <label className="block text-sm text-gray-700 mb-2">비밀번호 확인</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                placeholder="비밀번호 재입력"
                className="w-full pl-12 pr-12 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#491B6D]/30 transition-all"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
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

          {/* Signup Button */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleSignup}
            disabled={isLoading || !isFormValid}
            className={`w-full py-4 rounded-2xl font-medium transition-all min-h-[56px] ${
              isLoading || !isFormValid
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-[#491B6D] text-white shadow-lg shadow-[#491B6D]/30'
            }`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>회원가입 중...</span>
              </div>
            ) : (
              '이메일로 회원가입'
            )}
          </motion.button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">간편 회원가입</span>
            </div>
          </div>

          {/* Social Signup Buttons */}
          <div className="space-y-3">
            {/* Kakao Signup */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleKakaoSignup}
              disabled={isLoading}
              className="w-full py-4 rounded-2xl font-medium transition-all min-h-[56px] text-center flex items-center justify-center gap-2"
              style={{ backgroundColor: '#FEE500', color: '#000000' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3C6.5 3 2 6.6 2 11c0 2.8 1.9 5.3 4.7 6.7l-1.1 4.1c-.1.3.2.6.5.4l5.3-3.5c.5.1 1 .1 1.6.1 5.5 0 10-3.6 10-8S17.5 3 12 3z"/>
              </svg>
              카카오로 시작하기
            </motion.button>

            {/* Google Signup */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleGoogleSignup}
              disabled={isLoading}
              className="w-full py-4 rounded-2xl font-medium bg-white border-2 border-gray-300 text-gray-700 transition-all min-h-[56px] text-center flex items-center justify-center gap-2 hover:bg-gray-50"
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google로 시작하기
            </motion.button>
          </div>

          {/* Back to Login */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={onBack}
            className="w-full py-3 rounded-2xl font-medium bg-white border border-gray-200 text-gray-700 transition-all"
          >
            로그인으로 돌아가기
          </motion.button>
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