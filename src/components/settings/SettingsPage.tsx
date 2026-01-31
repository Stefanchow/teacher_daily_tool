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
  clearCache,
  setCustomBackground,
  setBackgroundBlur,
  setSocialAccountBound
} from '../../store/slices/userSettingsSlice';
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

  // Calculate cache size on mount
  React.useEffect(() => {
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

  const handleAvatarSave = (base64: string) => {
    dispatch(setAvatar(base64));
    setShowAvatarEditor(false);
    if (settings.enableMotion) {
      triggerSparkle();
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
      <div className="max-w-4xl mx-auto p-6 md:p-10 space-y-10 animate-in fade-in duration-300 relative">
        
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
        <div className="flex items-center gap-8 pb-8 border-b border-gray-200 dark:border-gray-700">
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
            <h2 className="text-3xl font-bold flex items-center gap-4" style={{ color: 'var(--text-primary)' }}>
              {currentNickname}
              <span className={`px-3 py-1 text-sm font-bold rounded-full border uppercase tracking-wide ${
                settings.membershipStatus === 'pro' 
                  ? 'bg-amber-100 text-amber-700 border-amber-200' 
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'
              }`}
              >
                {settings.membershipStatus === 'pro' ? 'Pro' : 'Free'}
              </span>
            </h2>
            <div className="mt-3 flex items-center gap-3">
              {settings.wechatBound ? (
                <span className="inline-flex items-center gap-1.5 text-base text-green-600 bg-green-50 px-3 py-1.5 rounded-lg">
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
            className="rounded-3xl p-8 border relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-gray-200 dark:border-gray-700"
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
                className="px-6 py-3 font-bold rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95 bg-gray-50 dark:bg-gray-700 text-indigo-600 dark:text-indigo-300"
              >
                {t('menu_plan_upgrade')}
              </button>
            </div>
            {/* Decorative bg shapes */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-purple-200/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-200/20 rounded-full blur-2xl translate-y-1/3 -translate-x-1/3"></div>
          </div>

          {/* Social Account Binding */}
          <div className="mt-8">
            <h4 className="font-bold text-lg mb-4" style={{ color: 'var(--text-primary)' }}>{t('settings_social_accounts')}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(['phone', 'email', 'xiaohongshu', 'douyin'] as const).map(platform => {
                const isBound = settings.socialAccounts?.[platform] || false;
                const icons = {
                  phone: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
                  email: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
                  xiaohongshu: <span className="font-bold text-xs">{t('social_xhs')}</span>,
                  douyin: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
                };
                
                return (
                  <div key={platform} className="flex items-center justify-between p-4 rounded-2xl border bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${isBound ? 'bg-green-100 text-green-600' : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-300'}`}
                      >
                        {icons[platform]}
                      </div>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{t(`settings_bind_${platform === 'xiaohongshu' ? 'xhs' : platform}`)}</span>
                    </div>
                    <button
                      onClick={() => !isBound && handleBind(platform)}
                      disabled={isBound || isVerifying}
                      className={`
                        px-4 py-2 rounded-xl text-sm font-bold transition-all
                        ${isBound 
                          ? 'bg-transparent text-green-600 cursor-default' 
                          : 'bg-white dark:bg-gray-700 border shadow-sm text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600'}
                      `}
                    >
                      {bindingPlatform === platform ? (
                        <span className="animate-pulse">...</span>
                      ) : isBound ? (
                        t('settings_bound')
                      ) : (
                        t('settings_bind_btn')
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Section 2: Teaching Preferences */}
        <section>
          <h3 className="text-xl font-bold mb-6 flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
            <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
            {t('settings_teaching_preferences')}
          </h3>
          <div className="rounded-3xl p-8 border shadow-sm space-y-8 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
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
                        py-4 rounded-xl font-bold transition-all duration-200 text-lg
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { id: 'zh', label: '简体中文' },
                  { id: 'en', label: 'English' },
                  { id: 'fr', label: 'Français' }
                ].map((lang) => (
                  <button
                    key={lang.id}
                    onClick={() => dispatch(setUiLanguage(lang.id as any))}
                    className={`
                      py-4 rounded-xl font-bold transition-all duration-200 text-lg border
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

        {/* Section 3: Visual & Interaction */}
        <section>
          <h3 className="text-xl font-bold mb-6 flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
            <span className="w-1.5 h-6 bg-pink-500 rounded-full"></span>
            {t('settings_visual_interaction')}
          </h3>
          <div className="rounded-3xl p-8 border shadow-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            {/* Motion Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-lg flex items-center gap-2 text-gray-900 dark:text-gray-100">
                  {t('settings_enable_starlight')}
                  <span className="text-xs bg-pink-100 text-pink-600 px-2 py-0.5 rounded-full">Beta</span>
                </div>
                <div className="text-sm mt-1 text-gray-500 dark:text-gray-400">{t('settings_motion_desc')}</div>
              </div>
              <button 
                onClick={() => dispatch(setEnableMotion(!settings.enableMotion))}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${settings.enableMotion ? 'bg-pink-500' : 'bg-gray-300 dark:bg-gray-600'}`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${settings.enableMotion ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            {/* Background Settings */}
            <div className="mt-8 pt-8 border-t border-gray-50 dark:border-gray-700">
              <h4 className="text-gray-900 dark:text-gray-100 font-bold text-lg mb-4">{t('settings_custom_bg')}</h4>
              
              <div className="space-y-6">
                {/* Upload & Presets */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Upload Card */}
                  <label className="cursor-pointer group relative overflow-hidden rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-indigo-400 bg-gray-50 dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-gray-700 transition-all p-6 flex flex-col items-center justify-center gap-3 h-32">
                    <input type="file" accept="image/*" className="hidden" onChange={handleBackgroundUpload} />
                    <div className="p-3 bg-white dark:bg-gray-700 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                      <svg className="w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </div>
                    <span className="text-sm font-bold text-gray-500 dark:text-gray-400 group-hover:text-indigo-600">{t('settings_upload_bg')}</span>
                  </label>

                  {/* Gradient Preset */}
                  <button 
                    onClick={() => dispatch(setCustomBackground({ type: 'gradient', value: 'linear-gradient(to top right, #a18cd1 0%, #fbc2eb 100%)' }))}
                    className="relative overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all h-32 group"
                  >
                    <div className="absolute inset-0 bg-gradient-to-tr from-[#a18cd1] to-[#fbc2eb]"></div>
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition-colors">
                      <span className="bg-white/90 dark:bg-black/60 backdrop-blur px-4 py-2 rounded-xl text-sm font-bold text-gray-800 dark:text-gray-200 shadow-sm">
                        {t('settings_preset_star')}
                      </span>
                    </div>
                  </button>
                </div>

                {/* Reset Button */}
                {(settings.customBackground?.type !== 'default') && (
                  <div className="flex justify-end">
                    <button 
                      onClick={() => dispatch(setCustomBackground({ type: 'default', value: null }))}
                      className="text-sm text-red-500 font-bold hover:underline"
                    >
                      {t('settings_reset_bg')}
                    </button>
                  </div>
                )}
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
          <div className="rounded-3xl p-8 border shadow-sm space-y-8 relative overflow-hidden bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
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
                  className="flex-1 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-sm rounded-xl px-4 py-3 focus:outline-none cursor-text select-all"
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
                    px-8 py-4 rounded-xl text-base font-bold transition-all flex items-center gap-2 shadow-sm
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
             <a href="#" className="group flex items-center justify-between p-6 bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-500 shadow-sm transition-all hover:-translate-y-1">
                <div className="flex items-center gap-4">
                   <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                   </div>
                   <span className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{t('settings_privacy')}</span>
                </div>
                <svg className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 transform group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
             </a>

             {/* Terms of Service */}
             <a href="#" className="group flex items-center justify-between p-6 bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-500 shadow-sm transition-all hover:-translate-y-1">
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
