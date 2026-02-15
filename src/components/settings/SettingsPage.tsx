import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import {
  setMembershipStatus,
  bindWechat,
  setTeachingStage,
  setUiLanguage,
  setEnableMotion,
  setAvatar,
  setNickname,
  clearCache,
  setCustomBackground,
  setBackgroundBlur,
  setSocialAccountBound
} from '../../store/slices/userSettingsSlice';
import { setSession } from '../../store/slices/userSlice';
import { supabase } from '../../utils/supabase';
import { APP_LOGO_BASE64 } from '../../constants/assets';
import { useTranslation } from '../../hooks/useTranslation';
import { AvatarEditor } from '../common/AvatarEditor';

interface SettingsPageProps {
  onNavigate?: (view: string) => void;
  onClearResources?: () => Promise<number>; // Returns freed size in MB
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onNavigate, onClearResources }) => {
  const dispatch = useDispatch();
  const { t, language } = useTranslation();
  const settings = useSelector((state: RootState) => state.userSettings);
  
  const [showAvatarEditor, setShowAvatarEditor] = useState(false);
  const [editorMode, setEditorMode] = useState<'camera' | 'album'>('album');
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [showSparkle, setShowSparkle] = useState(false);
  const [showCleanSparkle, setShowCleanSparkle] = useState(false);
  const [toast, setToast] = useState<{ show: boolean, message: string } | null>(null);
  
  // New States for Expansion
  const [bindingPlatform, setBindingPlatform] = useState<null | 'phone' | 'email' | 'xiaohongshu' | 'douyin'>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [cacheSize, setCacheSize] = useState<string>('0.0');
  const [programSize, setProgramSize] = useState<string>('34.2');

  // New states for Account Settings
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [isSavingUsername, setIsSavingUsername] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ new: '', confirm: '' });

  // Calculate cache size on mount
  React.useEffect(() => {
    // Sync avatar to localStorage for Login Page
    if (settings.avatar) {
      localStorage.setItem('last_login_avatar', settings.avatar);
    }

    try {
      const plans = localStorage.getItem('recentPlans_v1');
      if (plans) {
        const bytes = new TextEncoder().encode(plans).length;
        setCacheSize((bytes / (1024 * 1024)).toFixed(1));
      }
      
      // Calculate "Program Size" (mock + actual other keys)
      let total = 34.2 * 1024 * 1024; // Base size
      for(let key in localStorage) {
        if(key !== 'recentPlans_v1' && localStorage.hasOwnProperty(key)) {
             const val = localStorage.getItem(key);
             if(val) total += val.length;
        }
      }
      setProgramSize((total / (1024 * 1024)).toFixed(1));
    } catch (e) {
      // ignore
    }
  }, []);

  const handleUpdateUsername = async () => {
    if (!editingName.trim()) {
      setIsEditingUsername(false);
      return;
    }
    if (isSavingUsername) return;
    if (editingName.trim() === currentNickname.trim()) {
      setIsEditingUsername(false);
      return;
    }
    setIsSavingUsername(true);
    
    // 1. Update Supabase Auth Metadata
    const { error: authError } = await supabase.auth.updateUser({
      data: { username: editingName }
    });
    
    if (authError) {
      setToast({ show: true, message: '更新用户名失败: ' + authError.message });
      setIsSavingUsername(false);
      return;
    }

    // 2. Update Profiles Table
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ username: editingName })
        .eq('id', userData.user.id);
        
      if (profileError) {
        console.warn('Profile update warning:', profileError);
      }
    }

    dispatch(setNickname(editingName));
    setIsEditingUsername(false);
    setIsSavingUsername(false);
    setToast({ show: true, message: '用户名已更新' });
    setTimeout(() => setToast(null), 3000);
  };

  const handleChangePassword = async () => {
    if (passwordForm.new !== passwordForm.confirm) {
      setToast({ show: true, message: '两次输入的密码不一致' });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    if (passwordForm.new.length < 6) {
      setToast({ show: true, message: '密码长度至少6位' });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    
    const { error } = await supabase.auth.updateUser({
      password: passwordForm.new
    });
    
    if (error) {
      setToast({ show: true, message: '修改密码失败: ' + error.message });
      setTimeout(() => setToast(null), 3000);
    } else {
      setIsChangingPassword(false);
      setPasswordForm({ new: '', confirm: '' });
      setToast({ show: true, message: '密码修改成功' });
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    dispatch(setSession(null));
    // Clear user-specific settings to prevent pollution for next user
    localStorage.removeItem('userSettings');
    window.location.reload();
  };

  const handleBind = (platform: 'phone' | 'email' | 'xiaohongshu' | 'douyin') => {
    setBindingPlatform(platform);
    setIsVerifying(true);
    // Simulate API call
    setTimeout(() => {
      dispatch(setSocialAccountBound({ platform, bound: true }));
      setIsVerifying(false);
      setBindingPlatform(null);
      setToast({ show: true, message: `${t('settings_btn_bound')} ${t(`settings_bind_${platform === 'xiaohongshu' ? 'xhs' : platform}`)}` });
      setTimeout(() => setToast(null), 3000);
    }, 1500);
  };

  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        dispatch(setCustomBackground({ type: 'image', value: base64 }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Use settings avatar/nickname or defaults
  const currentAvatar = settings.avatar || APP_LOGO_BASE64;
  const currentNickname = settings.nickname || t('APP_TITLE');

  const handleAvatarSave = async (base64: string) => {
    // Optimistic update: 1. Update Redux
    dispatch(setAvatar(base64));
    setShowAvatarEditor(false);
    if (settings.enableMotion) {
      triggerSparkle();
    }

    // Optimistic update: 2. Update Local Map immediately (so it persists even if upload fails)
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        const userId = userData.user.id;
        const userEmail = userData.user.email;
        const userPhone = userData.user.phone;
        
        // Update local storage for login page persistence
            localStorage.setItem('last_login_avatar', base64);
            
            // Update avatar map
            const mapStr = localStorage.getItem('user_avatar_map');
        const map = mapStr ? JSON.parse(mapStr) : {};
        
        if (userEmail) map[userEmail] = base64;
        if (userPhone) map[userPhone] = base64;
        
        // Also try to find the login ID used to login
        const lastLoginId = localStorage.getItem('last_login_id');
        if (lastLoginId) map[lastLoginId] = base64;
        
        localStorage.setItem('user_avatar_map', JSON.stringify(map));
      }
    } catch (e) {
      console.error('Error optimistic updating avatar map:', e);
    }

    // Upload to Supabase Storage
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;

      // Convert base64 to Blob
      const base64Response = await fetch(base64);
      const blob = await base64Response.blob();
      
      // Static filename logic: always use user ID to prevent storage waste
      // Use folder structure to comply with RLS policies: user_id/user_id.png
      const fileName = `${userData.user.id}/${userData.user.id}.png`;
      
      // Upload
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, {
          contentType: 'image/png',
          upsert: true,
          cacheControl: '0'
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get Public URL
      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);
        
      // Cache Busting: Append timestamp to ensure browser fetches the new image
      const timestamp = new Date().getTime();
      const publicUrl = `${publicUrlData.publicUrl}?t=${timestamp}`;

      // Update Profile
      await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userData.user.id);

      // Update Auth Metadata
      await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });
      
      // Update local storage for login page persistence
            localStorage.setItem('last_login_avatar', publicUrl);
            
            // Update avatar map in localStorage for multi-account support
      try {
        const mapStr = localStorage.getItem('user_avatar_map');
        const map = mapStr ? JSON.parse(mapStr) : {};
        
        // Update for email
        if (userData.user.email) map[userData.user.email] = publicUrl;
        // Update for phone
        if (userData.user.phone) map[userData.user.phone] = publicUrl;
        // Update for last login ID (most important for login screen)
        const lastLoginId = localStorage.getItem('last_login_id');
        if (lastLoginId) map[lastLoginId] = publicUrl;
        
        localStorage.setItem('user_avatar_map', JSON.stringify(map));
      } catch (e) {
        console.error('Error updating avatar map:', e);
      }

      // Update Redux with URL (optional, but good for consistency)
      dispatch(setAvatar(publicUrl));

      setToast({ show: true, message: '头像已上传并保存' });
      setTimeout(() => setToast(null), 3000);

    } catch (error: any) {
      console.error('Avatar upload failed:', error);
      
      // If bucket not found but we have local fallback, show a softer warning
      if (error.message && error.message.includes('Bucket not found')) {
         setToast({ show: true, message: '头像已本地保存 (云端存储未配置)' });
      } else {
         setToast({ show: true, message: '头像上传失败: ' + (error.message || 'Unknown error') });
      }
      setTimeout(() => setToast(null), 3000);
    }
  };

  const triggerSparkle = () => {
    setShowSparkle(true);
    setTimeout(() => setShowSparkle(false), 2000);
  };

  const handleClearResourcesClick = async () => {
    if (onClearResources) {
      setCleaning(true);
      
      // Simulate progress
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const freedSize = await onClearResources();
      dispatch(clearCache()); // Clear other redux/local cache if needed
      
      setCleaning(false);
      setCacheSize('0.0');
      
      // Trigger effects
      if (settings.enableMotion) {
        triggerSparkle(); // Global avatar sparkle
        setShowCleanSparkle(true);
        setTimeout(() => setShowCleanSparkle(false), 2000);
      }
      
      // Show Toast
      setToast({ show: true, message: t('toast_cleaned', { size: freedSize.toFixed(1) }) });
      setTimeout(() => setToast(null), 3000);
    } else {
      // Fallback if prop not provided
      dispatch(clearCache());
      alert(t('settings_cache_cleared'));
    }
  };

  return (
    <>
      <div className="max-w-4xl mx-auto px-3 py-6 md:px-8 md:py-10 space-y-10 animate-in fade-in duration-300 relative">
        
        {/* Toast Notification */}
        {toast && toast.show && (
          <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-5 fade-in duration-300">
            <div className="bg-gray-900/90 backdrop-blur-md text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3">
              <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="font-medium">{toast.message}</span>
            </div>
          </div>
        )}

        {/* Header: Account Info */}
        <div className="flex items-center gap-6 pb-8 border-b border-gray-200 dark:border-gray-700">
          <div 
            className="relative w-32 h-32 flex-shrink-0 rounded-full cursor-pointer group select-none"
            onClick={() => setShowAvatarMenu(!showAvatarMenu)}
          >
            {/* Sparkle Effect */}
            {showSparkle && (
              <div className="absolute inset-0 pointer-events-none z-50">
                <span className="absolute inset-0 animate-ping inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                <div className="absolute -inset-4 bg-gradient-to-tr from-yellow-300 via-pink-400 to-purple-500 rounded-full blur-xl opacity-50 animate-pulse"></div>
                {[...Array(6)].map((_, i) => (
                  <div 
                     key={i}
                     className="absolute w-1 h-1 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                     style={{
                       top: '50%',
                       left: '50%',
                       ['--r' as any]: `${i * 60}deg`,
                       animation: `sparkle-fly 1s ease-out forwards ${i * 0.1}s`
                     }}
                  />
                ))}
                <style>{`
                  @keyframes sparkle-fly {
                    0% { opacity: 1; transform: rotate(var(--r)) translate(0px) scale(0); }
                    100% { opacity: 0; transform: rotate(var(--r)) translate(40px) scale(1); }
                  }
                `}</style>
              </div>
            )}

            <img 
              src={currentAvatar} 
              alt="Avatar" 
              className="w-full h-full object-cover rounded-full shadow-2xl hover:opacity-90 transition-opacity relative z-10"
              // Removed border-4 and borderColor to address "white line" request
            />
            <div 
              className="absolute bottom-1 right-1 rounded-full p-2.5 shadow-md z-20 group-hover:scale-110 transition-transform bg-white dark:bg-gray-800"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              </svg>
            </div>

            {/* Avatar Menu */}
            {showAvatarMenu && (
              <div 
                className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-56 rounded-2xl shadow-xl border z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700"
              >
                <button 
                  onClick={(e) => { e.stopPropagation(); setEditorMode('camera'); setShowAvatarEditor(true); setShowAvatarMenu(false); }}
                  className="w-full text-left px-5 py-3.5 text-sm flex items-center gap-3 hover:opacity-80 transition-opacity text-gray-700 dark:text-gray-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  {t('avatar_camera')}
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setEditorMode('album'); setShowAvatarEditor(true); setShowAvatarMenu(false); }}
                  className="w-full text-left px-5 py-3.5 text-sm flex items-center gap-3 border-t hover:opacity-80 transition-opacity text-gray-700 dark:text-gray-200 border-gray-100 dark:border-gray-700"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  {t('avatar_album')}
                </button>
              </div>
            )}
          </div>
          
            <div className="flex-1">
            <div className="flex items-center gap-2">
              {isEditingUsername ? (
                <div className="flex items-center">
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    placeholder="新用户名"
                    className="text-2xl font-bold bg-transparent border-b-2 border-indigo-500 focus:outline-none w-48 py-1"
                    style={{ color: 'var(--text-primary)' }}
                    autoFocus
                    onBlur={handleUpdateUsername}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleUpdateUsername();
                      }
                      if (e.key === 'Escape') {
                        e.preventDefault();
                        setIsEditingUsername(false);
                        setEditingName(currentNickname);
                      }
                    }}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setEditingName(currentNickname);
                    setIsEditingUsername(true);
                  }}
                  className="text-3xl font-bold flex items-center gap-1 group bg-transparent border-none p-0 cursor-text"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <span>{currentNickname}</span>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-indigo-500">
                    <svg className="w-5 h-5 inline-block align-middle" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </span>
                </button>
              )}
              
              <span className={`px-3 py-1 text-sm font-bold rounded-full border uppercase tracking-wide ${
                settings.membershipStatus === 'pro' 
                  ? 'bg-amber-100 text-amber-700 border-amber-200' 
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'
              }`}
              >
                {settings.membershipStatus === 'pro' ? 'Pro' : 'Free'}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-3">
              {settings.wechatBound ? (
                <span className="inline-flex items-center gap-1.5 text-base text-green-600 bg-green-50 px-3 py-1.5 rounded-2xl">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8.69 13.93c.69 0 1.26-.57 1.26-1.26s-.57-1.26-1.26-1.26-1.26.57-1.26 1.26.57 1.26 1.26 1.26z"/><path d="M12 2C6.48 2 2 5.92 2 10.76c0 2.75 1.45 5.21 3.73 6.81-.16.92-.61 2.37-1.4 3.32 1.55.08 3.53-.41 5.04-1.48.96.26 1.98.4 3.03.4 5.52 0 10-3.92 10-8.76S17.52 2 12 2z"/></svg>
                  {t('settings_wechat_bound')}: {settings.wechatId || 'Teacher'}
                </span>
              ) : (
                <button onClick={() => dispatch(bindWechat('Teacher_WX'))} className="text-base text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 font-medium hover:underline">
                  {t('settings_bind_wechat')}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Section 1: Membership */}
        <section>
          <h3 className="text-xl font-bold mb-6 flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
            <span className="w-1.5 h-6 bg-indigo-500 rounded-full"></span>
            {t('settings_account_membership')}
          </h3>
          <div 
            className="rounded-2xl p-8 border relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-gray-200 dark:border-gray-700"
            style={{ 
              backgroundColor: 'var(--card-bg)'
            }}
          >
            <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h4 className="font-bold text-xl text-indigo-600 dark:text-indigo-400">{t('settings_current_plan')}</h4>
                <p className="text-base mt-2 text-gray-500 dark:text-gray-400">
                  {settings.membershipStatus === 'pro' ? t('settings_plan_pro_desc') : t('settings_plan_free_desc')}
                </p>
              </div>
              <button 
                onClick={() => {
                    if (onNavigate) {
                      onNavigate('membership');
                    }
                }}
                className="px-6 py-3 font-bold rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-95 bg-gray-50 dark:bg-gray-700 text-indigo-600 dark:text-indigo-300"
              >
                {t('menu_plan_upgrade')}
              </button>
            </div>
            {/* Decorative bg shapes */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-purple-200/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-200/20 rounded-full blur-2xl translate-y-1/3 -translate-x-1/3"></div>
          </div>


        </section>

        {/* Section: Account Security */}
        <section>
          <h3 className="text-xl font-bold mb-6 flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
            <span className="w-1.5 h-6 bg-red-500 rounded-full"></span>
            账号安全
          </h3>
          <div className="rounded-2xl p-8 border shadow-sm space-y-8 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            {/* Change Password */}
            <div>
              <div className="flex items-center justify-between mb-4">
                 <h4 className="font-bold text-lg text-gray-900 dark:text-gray-100">修改密码</h4>
                 <button 
                   onClick={() => setIsChangingPassword(!isChangingPassword)}
                   className="text-indigo-600 dark:text-indigo-400 font-medium text-sm hover:underline"
                 >
                   {isChangingPassword ? '取消修改' : '修改'}
                 </button>
              </div>
              
              {isChangingPassword && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div>
                    <input 
                      type="password"
                      value={passwordForm.new}
                      onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
                      placeholder="新密码 (至少6位)"
                      className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                      style={{ color: 'var(--input-field-text-color)' }}
                    />
                  </div>
                  <div>
                    <input 
                      type="password"
                      value={passwordForm.confirm}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                      placeholder="确认新密码"
                      className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                      style={{ color: 'var(--input-field-text-color)' }}
                    />
                  </div>
                  <button 
                    onClick={handleChangePassword}
                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-md transition-colors"
                  >
                    确认修改
                  </button>
                </div>
              )}
            </div>

            {/* Logout */}
            <div className="pt-6 border-t border-gray-100 dark:border-gray-700">
               <button 
                 onClick={handleLogout}
                 className="w-full py-4 rounded-2xl border-2 border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 font-bold hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 transition-all active:scale-98 flex items-center justify-center gap-2"
               >
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                 </svg>
                 退出登录
               </button>
            </div>
          </div>
        </section>

        {/* Section 2: Teaching Preferences */}
        <section>
          <h3 className="text-xl font-bold mb-6 flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
            <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
            {t('settings_teaching_preferences')}
          </h3>
          <div className="rounded-2xl p-8 border shadow-sm space-y-8 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            {/* Teaching Stage */}
            <div>
              <label className="block text-base font-medium mb-4 text-gray-500 dark:text-gray-400">{t('settings_default_stage')}</label>
              <div className="grid grid-cols-3 gap-4">
                {(['primary', 'middle', 'high'] as const).map((stage) => {
                  const labels = { primary: t('stage_primary'), middle: t('stage_middle'), high: t('stage_high') };
                  const isActive = settings.teachingStage === stage;
                  return (
                    <button
                      key={stage}
                      onClick={() => dispatch(setTeachingStage(stage))}
                      className={`
                        py-4 rounded-2xl font-bold transition-all duration-200 text-lg
                        ${isActive 
                          ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-gray-800' 
                          : 'bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600'}
                      `}
                    >
                      {labels[stage]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Language Settings (i18n) */}
            <div>
              <label className="block text-base font-medium mb-4 text-gray-500 dark:text-gray-400">{t('settings_default_language')}</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { id: 'zh', label: '简体中文' },
                  { id: 'en', label: 'English' }
                ].map((lang) => (
                  <button
                    key={lang.id}
                    onClick={() => dispatch(setUiLanguage(lang.id as any))}
                    className={`
                      py-4 rounded-2xl font-bold transition-all duration-200 text-lg border
                      ${settings.uiLanguage === lang.id
                        ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-gray-800'
                        : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'}
                    `}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>



        {/* Section 4: Data Management (Visualized) */}
        <section>
          <h3 className="text-xl font-bold mb-6 flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
            <span className="w-1.5 h-6 bg-gray-500 rounded-full"></span>
            {t('settings_space_mgmt')}
          </h3>
          <div className="rounded-2xl p-8 border shadow-sm space-y-8 relative overflow-hidden bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
          >
            {/* Local Sparkle Effect */}
            {showCleanSparkle && (
              <div className="absolute inset-0 pointer-events-none z-10">
                 <div className="absolute inset-0 bg-green-400/10 animate-pulse"></div>
                 {[...Array(10)].map((_, i) => (
                    <div 
                       key={i}
                       className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                       style={{
                         top: `${Math.random() * 100}%`,
                         left: `${Math.random() * 100}%`,
                         animation: `sparkle-fade 1s ease-out forwards ${Math.random() * 0.5}s`
                       }}
                    />
                 ))}
                 <style>{`
                  @keyframes sparkle-fade {
                    0% { opacity: 1; transform: scale(0); }
                    50% { transform: scale(1.5); }
                    100% { opacity: 0; transform: scale(0); }
                  }
                 `}</style>
              </div>
            )}
            {/* Download Path */}
            <div>
              <label className="block text-base font-medium mb-4 text-gray-500 dark:text-gray-400">{t('settings_download_path')}</label>
              <div className="flex gap-4">
                <input 
                  type="text" 
                  value={t('settings_download_path_placeholder')}
                  readOnly
                  className="flex-1 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-sm rounded-2xl px-4 py-3 focus:outline-none cursor-text select-all"
                  style={{ color: 'var(--text-primary)' }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {t('settings_download_path_tip')}
              </p>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-6 border-t border-gray-50 dark:border-gray-700">
              <div className="flex-1 w-full space-y-6">
                 {/* Visual Bars */}
                 <div className="space-y-4">
                   {/* Program Space */}
                   <div>
                     <div className="flex justify-between text-sm mb-1">
                       <span className="text-gray-600 dark:text-gray-400 font-medium">{t('settings_space_used')}</span>
                       <span className="text-indigo-600 dark:text-indigo-400 font-bold">{programSize} MB</span>
                     </div>
                     <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                       <div className="h-full bg-indigo-500 rounded-full" style={{ width: '35%' }}></div>
                     </div>
                   </div>

                   {/* Cache Space */}
                   <div>
                     <div className="flex justify-between text-sm mb-1">
                       <span className="text-gray-600 dark:text-gray-400 font-medium">{t('settings_space_cache')}</span>
                       <span className="text-amber-500 font-bold">{cacheSize} MB</span>
                     </div>
                     <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                       <div className="h-full bg-amber-400 rounded-full transition-all duration-1000" style={{ width: cleaning ? '0%' : `${Math.min(parseFloat(cacheSize) * 2, 100)}%` }}></div>
                     </div>
                   </div>
                 </div>
              </div>

              <div className="flex-shrink-0">
                <button 
                  onClick={handleClearResourcesClick}
                  disabled={cleaning || parseFloat(cacheSize) === 0}
                  className={`
                    px-8 py-4 rounded-2xl text-base font-bold transition-all flex items-center gap-2 shadow-sm
                    ${cleaning 
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed' 
                      : 'bg-white dark:bg-gray-800 border-2 border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 active:scale-95'}
                  `}
                >
                  {cleaning ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      {t('settings_cleaning')}
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      {t('settings_btn_clean')}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Section 5: About & Links */}
        <section>
          <h3 className="text-xl font-bold mb-6 flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
            <span className="w-1.5 h-6 bg-indigo-500 rounded-full"></span>
            {t('settings_about')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {/* Privacy Policy */}
             <a href="#" className="group flex items-center justify-between p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-500 shadow-sm transition-all hover:-translate-y-1">
                <div className="flex items-center gap-4">
                   <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                   </div>
                   <span className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{t('settings_privacy')}</span>
                </div>
                <svg className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 transform group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
             </a>

             {/* Terms of Service */}
             <a href="#" className="group flex items-center justify-between p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-500 shadow-sm transition-all hover:-translate-y-1">
                <div className="flex items-center gap-4">
                   <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                   </div>
                   <span className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{t('settings_terms')}</span>
                </div>
                <svg className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 transform group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
             </a>
          </div>
        </section>

        <div className="pt-8 text-center text-sm text-gray-400">
          {t('settings_version')} 2.5.0 (2026) • {t('DESIGNED_FOR_TEACHERS')}
        </div>
      </div>

      <AvatarEditor 
        isOpen={showAvatarEditor} 
        onClose={() => setShowAvatarEditor(false)} 
        onSave={handleAvatarSave}
        initialMode={editorMode}
      />
    </>
  );
};
