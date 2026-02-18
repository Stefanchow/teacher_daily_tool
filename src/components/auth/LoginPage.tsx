import React, { useState, useEffect, useCallback } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { useDispatch } from 'react-redux';
import { supabase } from '../../utils/supabase';
import { Toast } from '../common/Toast';
import { Logo } from '../common/Logo';
import { BackgroundBubbles } from './BackgroundBubbles';
import { setNickname, setAvatar } from '../../store/slices/userSettingsSlice';
import { Captcha } from './Captcha';
import { APP_LOGO_BASE64 } from '../../constants/assets';

export interface LoginPageProps {
  setIsRegistering?: (isRegistering: boolean) => void;
  setIsLoggingIn?: (isLoggingIn: boolean) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ setIsRegistering, setIsLoggingIn }) => {
  const dispatch = useDispatch();
  
  // Login State
  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoginSuccess, setIsLoginSuccess] = useState(false);
  
  // Register State
  const [registerForm, setRegisterForm] = useState({
    phone: '',
    password: '',
    nickname: '',
    email: '',
    captcha: ''
  });
  
  // Common State
  const [generatedCaptcha, setGeneratedCaptcha] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [cachedAvatar, setCachedAvatar] = useState<string | null>(null);
  
  // mode: 'login' | 'register' | 'forgot_password'
  const [mode, setMode] = useState<'login' | 'register' | 'forgot_password'>('login');
  
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isSweeping, setIsSweeping] = useState(false);
  const shakeControls = useAnimation();

  useEffect(() => {
    // 1. Load simple last login avatar (Fastest)
    const legacyAvatar = localStorage.getItem('last_login_avatar');
    if (legacyAvatar) {
      setCachedAvatar(legacyAvatar);
    }

    // 2. Load last login ID
    const lastId = localStorage.getItem('last_login_id');
    if (lastId) {
      setLoginId(lastId);
    }
  }, []);

  const triggerShake = useCallback(() => {
    shakeControls.start({
      x: [-5, 5, -5, 5, 0],
      transition: { duration: 0.4 }
    });
  }, [shakeControls]);

  const handleLogin = async () => {
    const trimmedLoginId = loginId.trim();
    
    if (!trimmedLoginId || !loginPassword) {
      setToast({ message: '请输入账号和密码', type: 'error' });
      triggerShake();
      return;
    }
    setLoading(true);
    
    let emailToUse = trimmedLoginId;

    // If input is not an email, assume it's a phone number
    if (!trimmedLoginId.includes('@')) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .eq('phone', trimmedLoginId)
        .maybeSingle();

      if (profileError || !profile) {
        setLoading(false);
        setToast({ message: '手机号不存在', type: 'error' });
        triggerShake();
        return;
      }
      emailToUse = profile.email;
    }

    // Login with email (either direct input or resolved from phone)
    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailToUse,
      password: loginPassword,
    });

    if (error) {
      setLoading(false);
      setToast({ message: '账号或密码错误', type: 'error' });
      triggerShake();
    } else {
      // Login success
      // Fetch nickname from profiles to display in welcome message
      setIsLoginSuccess(true);
      if (setIsLoggingIn) setIsLoggingIn(true);
      
      // Fetch user profile data immediately
      if (data.user) {
        // Run in parallel with navigation to not block UI
        const fetchProfilePromise = async () => {
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('nickname, avatar_url')
              .eq('id', data.user.id)
              .maybeSingle();
              
            if (profile?.nickname) {
              dispatch(setNickname(profile.nickname));
            } else if (data.user.user_metadata?.nickname) {
              dispatch(setNickname(data.user.user_metadata.nickname));
            }
            
            // Prefer profile avatar (most up-to-date), fallback to metadata
            let finalAvatar = profile?.avatar_url || data.user.user_metadata?.avatar_url;
            
            if (finalAvatar) {
              // Update Redux immediately so Sidebar shows it
              dispatch(setAvatar(finalAvatar));
              
              // Sync for next login
              localStorage.setItem('last_login_avatar', finalAvatar);
            } else {
               localStorage.removeItem('last_login_avatar');
            }
            localStorage.setItem('last_login_id', trimmedLoginId);
          } catch (e) {
            console.error('Error fetching profile on login:', e);
          }
        };
        fetchProfilePromise();
      }

      setToast({ message: '登录成功', type: 'success' });
      
      // Navigate immediately
      if (setIsLoggingIn) setIsLoggingIn(false);
    }
  };

  const handleRegister = async () => {
    const { phone, password, nickname, email, captcha } = registerForm;

    if (!phone || !password || !captcha) {
      setToast({ message: '请填写必填项（手机号、密码、验证码）', type: 'error' });
      triggerShake();
      return;
    }
    
    if (captcha.toUpperCase() !== generatedCaptcha.toUpperCase()) {
      setToast({ message: '图形验证码错误', type: 'error' });
      triggerShake();
      return;
    }

    if (password.length < 6) {
      setToast({ message: '密码长度需至少6位', type: 'error' });
      triggerShake();
      return;
    }

    setLoading(true);
    
    // 1. Check if phone already exists in profiles
    const { data: existingUser, error: checkError } = await supabase
      .from('profiles')
      .select('phone')
      .eq('phone', phone)
      .maybeSingle();

    if (existingUser) {
      setLoading(false);
      setToast({ message: '该手机号已被注册', type: 'error' });
      triggerShake();
      return;
    }

    // 2. Determine email to use
    const emailToRegister = email.trim() ? email.trim() : `${phone}@classcard.internal`;

    // Notify parent component that registration is starting (to prevent auto-redirect)
    if (setIsRegistering) setIsRegistering(true);

    // 3. SignUp
    const { data, error } = await supabase.auth.signUp({
      email: emailToRegister,
      password: password,
      options: {
        data: {
          phone: phone,
          nickname: nickname || null,
        },
      },
    });

    if (error) {
      if (setIsRegistering) setIsRegistering(false);
      setLoading(false);
      setToast({ message: error.message || '注册失败', type: 'error' });
      triggerShake();
      return;
    }

    if (data.user) {
      // 4. Insert into profiles manually to ensure sync
      try {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({ 
            id: data.user.id, 
            email: emailToRegister, 
            username: phone, // Use phone as username to satisfy unique constraint if exists
            phone: phone,
            nickname: nickname || null,
            points: 0 
          });
        
        if (profileError) {
          console.warn('Profile creation warning:', profileError);
          // Handle duplicate key error specifically
          if (profileError.code === '23505') {
             if (setIsRegistering) setIsRegistering(false);
             setLoading(false);
             setToast({ message: '该手机号或用户名已被占用', type: 'error' });
             triggerShake();
             return; 
          }
        }
      } catch (err) {
        console.error('Profile creation error:', err);
      }

      // 5. Sign out immediately to prevent auto-login
      await supabase.auth.signOut();
      
      setToast({ message: '注册成功，2秒后跳转到登录页', type: 'success' });
      
      setTimeout(() => {
        if (setIsRegistering) setIsRegistering(false);
        setLoading(false);
        // Clear form
        setRegisterForm({ phone: '', password: '', nickname: '', email: '', captcha: '' });
        setMode('login');
        // Prefill loginId with phone for convenience
        setLoginId(phone); 
        setLoginPassword('');
      }, 2000);
    } else {
       if (setIsRegistering) setIsRegistering(false);
       setLoading(false);
       setToast({ message: '注册异常，请重试', type: 'error' });
    }
  };

  const handleResetPassword = async () => {
    if (!loginId) {
      setToast({ message: '请输入邮箱地址', type: 'error' });
      triggerShake();
      return;
    }
    
    if (!loginId.includes('@')) {
       setToast({ message: '重置密码需要使用注册邮箱', type: 'error' });
       triggerShake();
       return;
    }

    setLoading(true);
    
    const { error } = await supabase.auth.resetPasswordForEmail(loginId);
      
    setLoading(false);
    
    if (error) {
      setToast({ message: '发送重置邮件失败，请检查邮箱', type: 'error' });
      triggerShake();
    } else {
      setToast({ message: '重置链接已发送至邮箱，请查收', type: 'success' });
      setMode('login');
      setLoginPassword('');
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'login': return 'Classcard';
      case 'register': return '创建账号';
      case 'forgot_password': return '重置密码';
    }
  };

  const getSubtitle = () => {
    switch (mode) {
      case 'login': return '使用手机号或邮箱登录';
      case 'register': return '注册开启智能备课之旅';
      case 'forgot_password': return '输入邮箱以重置密码';
    }
  };

  const getSubmitText = () => {
    if (loading && !isLoginSuccess) return null;
    if (isLoginSuccess) return '登录成功...';
    switch (mode) {
      case 'login': return '立即登录';
      case 'register': return '立即注册';
      case 'forgot_password': return '发送重置链接';
    }
  };

  const handleSubmit = () => {
    switch (mode) {
      case 'login': handleLogin(); break;
      case 'register': handleRegister(); break;
      case 'forgot_password': handleResetPassword(); break;
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center font-sans">
      {/* Dynamic Gradient Background */}
      <motion.div 
        className="absolute inset-0 bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-50 animate-gradient-xy"
        animate={{ opacity: isLoginSuccess ? 0 : 1 }}
        transition={{ duration: 0.5 }}
      />
      
      {/* Background Bubbles */}
      <BackgroundBubbles isFocused={isFocused} />

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={isLoginSuccess ? { opacity: 0, scale: 1.05 } : { opacity: 1, scale: 1 }}
        transition={{ duration: isLoginSuccess ? 0.3 : 0.5 }}
        className="relative z-10 w-full max-w-[400px] mx-4"
      >
        <motion.div 
          animate={shakeControls}
          className="rounded-2xl p-8 shadow-2xl backdrop-blur-xl border border-white/40 overflow-hidden"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.25)',
            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
          }}
        >
          {/* Logo/Avatar Area */}
          <div className="flex justify-center mb-6 relative">
            {/* Stardust Glow Layer (Background) */}
            <div 
              className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full z-0
                ${mode === 'login' ? 'avatar-stardust-breathe' : ''}`}
              style={{ pointerEvents: 'none' }}
            />

            {/* Avatar Image Container */}
            <div className="relative w-24 h-24 rounded-full z-10 overflow-hidden border-[1.5px] border-white/80 bg-white">
               <img 
                src={mode === 'login' && cachedAvatar ? cachedAvatar : APP_LOGO_BASE64} 
                alt="Avatar" 
                className="w-full h-full object-cover"
              />
              
              {/* Diamond Sweep Layer (Login Success) */}
              {isLoginSuccess && (
                <div className="absolute inset-0 z-20 pointer-events-none">
                   <div 
                     className="absolute w-[200%] h-[60px] bg-white/60 blur-md"
                     style={{ 
                       top: '100%', 
                       left: '-100%', 
                       transform: 'rotate(45deg)',
                       animation: 'diamondSweep 0.6s cubic-bezier(0.19, 1, 0.22, 1) forwards' 
                     }}
                   />
                </div>
              )}
            </div>
          </div>

          <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">
            {getTitle()}
          </h2>
          <p className="text-center text-gray-500 mb-6 text-sm">
            {getSubtitle()}
          </p>

          <div className="space-y-4">
            {/* LOGIN FORM */}
            {mode === 'login' && (
              <>
                {/* Login ID */}
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-500 group-focus-within:text-[#5A67D8] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder="请输入手机号或邮箱"
                    className="block w-full pl-12 pr-4 py-3.5 bg-white border-0 rounded-2xl text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-[#5A67D8] sm:text-sm sm:leading-6 transition-all"
                  />
                </div>

                {/* Password */}
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-500 group-focus-within:text-[#5A67D8] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder="请输入密码"
                    className="block w-full pl-12 pr-12 py-3.5 bg-white border-0 rounded-2xl text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-[#5A67D8] sm:text-sm sm:leading-6 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>

                <div className="flex justify-end">
                  <button 
                    onClick={() => {
                      setMode('forgot_password');
                      setToast(null);
                      setLoginPassword('');
                    }}
                    className="text-sm font-semibold text-[#5A67D8] hover:text-indigo-500"
                  >
                    忘记密码?
                  </button>
                </div>
              </>
            )}

            {/* REGISTER FORM */}
            {mode === 'register' && (
              <>
                {/* Phone */}
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-500 group-focus-within:text-[#5A67D8] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={registerForm.phone}
                    onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder="手机号 (必填)"
                    className="block w-full pl-12 pr-4 py-3 bg-white border-0 rounded-2xl text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-[#5A67D8] sm:text-sm sm:leading-6 transition-all"
                  />
                </div>

                {/* Password */}
                <div className="relative group">
                   <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-500 group-focus-within:text-[#5A67D8] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    type="password"
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder="密码 (必填, ≥6位)"
                    className="block w-full pl-12 pr-4 py-3 bg-white border-0 rounded-2xl text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-[#5A67D8] sm:text-sm sm:leading-6 transition-all"
                  />
                </div>

                {/* Nickname */}
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-500 group-focus-within:text-[#5A67D8] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={registerForm.nickname}
                    onChange={(e) => setRegisterForm({ ...registerForm, nickname: e.target.value })}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder="昵称 (选填)"
                    className="block w-full pl-12 pr-4 py-3 bg-white border-0 rounded-2xl text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-[#5A67D8] sm:text-sm sm:leading-6 transition-all"
                  />
                </div>

                {/* Email */}
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-500 group-focus-within:text-[#5A67D8] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    type="email"
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder="邮箱地址 (选填)"
                    className="block w-full pl-12 pr-4 py-3 bg-white border-0 rounded-2xl text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-[#5A67D8] sm:text-sm sm:leading-6 transition-all"
                  />
                </div>

                {/* Captcha */}
                <div className="flex gap-3">
                   <div className="relative group flex-1">
                     <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-500 group-focus-within:text-[#5A67D8] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={registerForm.captcha}
                      onChange={(e) => setRegisterForm({ ...registerForm, captcha: e.target.value })}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setIsFocused(false)}
                      placeholder="验证码"
                      className="block w-full pl-12 pr-4 py-3 bg-white border-0 rounded-2xl text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-[#5A67D8] sm:text-sm sm:leading-6 transition-all"
                    />
                  </div>
                  <div className="flex-shrink-0">
                    <Captcha 
                      onRefresh={setGeneratedCaptcha} 
                      height={46} // Match input height approx
                      width={100}
                    />
                  </div>
                </div>
              </>
            )}

            {/* FORGOT PASSWORD FORM */}
            {mode === 'forgot_password' && (
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-500 group-focus-within:text-[#5A67D8] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder="请输入邮箱"
                  className="block w-full pl-12 pr-4 py-3.5 bg-white border-0 rounded-2xl text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-[#5A67D8] sm:text-sm sm:leading-6 transition-all"
                />
              </div>
            )}

            <button
              onClick={() => {
                setIsSweeping(true);
                setTimeout(() => setIsSweeping(false), 600);
                handleSubmit();
              }}
              disabled={loading || isLoginSuccess}
              className="relative w-full flex justify-center py-3.5 px-4 border border-transparent rounded-2xl shadow-sm text-sm font-bold text-white bg-gradient-to-r from-[#818cf8] to-[#6366f1] hover:from-[#757de8] hover:to-[#5a5dd8] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] active:translate-y-[2px] mt-6 overflow-hidden"
            >
              {loading && !isLoginSuccess ? (
                 <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white z-10" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : null}
              
              {/* Ripple Effect */}
              <div className={`btn-ripple ${isSweeping ? 'active' : ''}`} />
              
              <span className="relative z-10">{getSubmitText()}</span>
            </button>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              {mode === 'login' ? '没有账号? ' : (mode === 'register' ? '已有账号? ' : '想起密码? ')}
              <button
                onClick={() => {
                  if (mode === 'forgot_password') {
                    setMode('login');
                  } else {
                    setMode(mode === 'login' ? 'register' : 'login');
                  }
                  setToast(null);
                  setLoginPassword('');
                  setRegisterForm({ phone: '', password: '', nickname: '', email: '', captcha: '' });
                }}
                className="font-bold text-[#5A67D8] hover:text-indigo-500 transition-colors"
              >
                {mode === 'login' ? '立即注册' : '去登录'}
              </button>
            </p>
          </div>
        </motion.div>
      </motion.div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};
