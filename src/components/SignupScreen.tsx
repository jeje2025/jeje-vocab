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
              '회원가입'
            )}
          </motion.button>

          {/* Back to Login */}
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