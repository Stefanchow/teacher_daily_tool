import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { setAvatar, setUiLanguage } from '../../store/slices/userSettingsSlice';
import { setLanguage } from '../../store/slices/previewSlice';
import { useTranslation } from '../../hooks/useTranslation';
import { ThemeType } from '../../theme/themes';
import { APP_LOGO_BASE64 } from '../../constants/assets';
import { AvatarEditor } from '../common/AvatarEditor';
import { supabase } from '../../utils/supabase';
import { Logo } from '../common/Logo';
import { Shirt, Settings as SettingsIcon, Stars, Layers, FileText, Star, Crown } from 'lucide-react';

// Align with App.tsx unions to avoid function type mismatches
type Subject = '英语' | '数学' | '语文';
type FunctionItem = '教案生成' | '阅读课' | '课堂活动' | '活动课' | '文学鉴赏' | '教材中心' | 'AI 组卷';

interface TopNavigationProps {
  currentView: 'lesson-center' | 'membership' | 'settings' | 'favorites';
  onViewChange: (view: 'lesson-center' | 'membership' | 'settings' | 'favorites') => void;
  currentTheme: ThemeType;
  onToggleTheme: () => void;
  // Subject/Function props
  currentSubject: Subject;
  onSubjectChange: (subject: Subject) => void;
  currentFunction: FunctionItem;
  onFunctionChange: (func: FunctionItem) => void;
  subjectFunctions: Record<Subject, FunctionItem[]>;
}

export const TopNavigation: React.FC<TopNavigationProps> = ({ 
  currentView, 
  onViewChange,
  currentTheme,
  onToggleTheme,
  currentSubject,
  onSubjectChange,
  currentFunction,
  onFunctionChange,
  subjectFunctions
}) => {
  const { t, language } = useTranslation();
  const dispatch = useDispatch();
  const { avatar, enableMotion } = useSelector((state: RootState) => state.userSettings);
  const { points } = useSelector((state: RootState) => state.user);
  const [showEditor, setShowEditor] = useState(false);
  const [editorMode, setEditorMode] = useState<'camera' | 'album'>('album');
  const [showSparkle, setShowSparkle] = useState(false);
  const [toast, setToast] = useState<{ show: boolean, message: string } | null>(null);
  
  // No dropdown submenu in current design

  const currentAvatar = avatar || APP_LOGO_BASE64;

  const triggerSparkle = () => {
    setShowSparkle(true);
    setTimeout(() => setShowSparkle(false), 2000);
  };

  // Detect current theme brightness for icon selection
  const isDarkBg = React.useMemo(() => {
    try {
      const val = getComputedStyle(document.documentElement).getPropertyValue('--bg-color').trim();
      const hex = val.startsWith('#') ? val.replace('#', '') : 'ffffff';
      const r = parseInt(hex.length === 3 ? hex[0] + hex[0] : hex.substring(0, 2), 16);
      const g = parseInt(hex.length === 3 ? hex[1] + hex[1] : hex.substring(2, 4), 16);
      const b = parseInt(hex.length === 3 ? hex[2] + hex[2] : hex.substring(4, 6), 16);
      const yiq = (r * 299 + g * 587 + b * 114) / 1000;
      return yiq < 140;
    } catch {
      return false;
    }
  }, [currentTheme]);

  const handleSaveAvatar = async (base64: string) => {
    // Optimistic update
    dispatch(setAvatar(base64));
    setShowEditor(false);
    if (enableMotion) {
      triggerSparkle();
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
      
      // Update Redux with URL
      dispatch(setAvatar(publicUrl));

      setToast({ show: true, message: '头像已上传并保存' });
      setTimeout(() => setToast(null), 3000);

    } catch (error: any) {
      console.error('Avatar upload failed:', error);
      setToast({ show: true, message: '头像上传失败: ' + (error.message || 'Unknown error') });
      setTimeout(() => setToast(null), 3000);
    }
  };

  const openEditor = (mode: 'camera' | 'album') => {
    setEditorMode(mode);
    setShowEditor(true);
  };

  // Helper to map English keys to Display Labels (if needed)
  // Assuming the subjectFunctions keys are already the display labels ('英语', '数学', '语文')
  
  // Construct Menu Items with refined subject submenus
  interface MenuItem {
    id: string;
    label: string;
    hasSubmenu: boolean;
    subItems?: { id: string; label: string }[];
  }
  // Build a single "课咖中心" with merged sub functions
  const functionDefaultSubject: Record<string, Subject> = React.useMemo(() => {
    const map: Record<string, Subject> = {};
    Object.entries(subjectFunctions).forEach(([subject, funcs]) => {
      funcs.forEach((f) => {
        if (!map[f]) map[f] = subject as Subject;
      });
    });
    return map;
  }, [subjectFunctions]);
  const menuItems: MenuItem[] = [
    { id: 'lesson-center', label: language === 'en' ? 'Lesson Center' : '课咖中心', hasSubmenu: false, subItems: [] },
    { id: 'ai-paper', label: language === 'en' ? 'AI Paper' : 'AI 组卷', hasSubmenu: false, subItems: [] },
    { id: 'favorites', label: t('menu_favorites'), hasSubmenu: false, subItems: [] },
    { id: 'membership', label: t('menu_membership'), hasSubmenu: false, subItems: [] }
  ];
  const extraItems: MenuItem[] = [
    { id: 'points', label: 'Points', hasSubmenu: false, subItems: [] }
  ];

  const handleMenuClick = (item: MenuItem) => {
    if (item.id === 'lesson-center') {
      onViewChange('lesson-center');
      const defSub = functionDefaultSubject['教案生成'] || currentSubject;
      onSubjectChange(defSub);
      onFunctionChange('教案生成');
    } else if (item.id === 'ai-paper') {
      onViewChange('lesson-center');
      const defSub = functionDefaultSubject['AI 组卷'] || currentSubject;
      onSubjectChange(defSub);
      onFunctionChange('AI 组卷');
    } else {
      onViewChange(item.id as any);
    }
  };

  // No dropdown click handler needed

  return (
    <div>
      {/* Toast Notification */}
      {toast && toast.show && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-5 fade-in duration-300">
          <div className="bg-gray-900/90 backdrop-blur-md text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3">
            <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">{toast.message}</span>
          </div>
        </div>
      )}
      
      {/* Full-width Fixed Header background */}
      <div className="fixed inset-x-0 top-0 z-[60] pointer-events-none">
        <div
          className="pointer-events-auto h-[64px] w-full backdrop-blur-xl"
          style={{
            backgroundImage: isDarkBg
              ? 'linear-gradient(180deg, color-mix(in oklab, var(--header-bg) 48%, #0A1328 52%), color-mix(in oklab, var(--header-bg) 90%, #ffffff 10%))'
              : 'linear-gradient(180deg, color-mix(in oklab, var(--header-bg) 48%, #0A1328 52%), color-mix(in oklab, var(--header-bg) 90%, #ffffff 10%))',
            boxShadow: '0 8px 32px rgba(31,38,135,0.12)'
          }}
        >
          <div className="mx-auto w-full h-full flex items-center justify-between px-3 sm:px-4 md:px-6 xl:px-8">
          
          {/* Left: Logo (restore previous style, left aligned, no duplicated text) */}
          <div className="flex items-center gap-1 mr-auto pl-0 whitespace-nowrap">
            <Logo className="h-10" showText={true} text={t('APP_TITLE')} imgSrc={APP_LOGO_BASE64} />
          </div>

          {/* Center: Integrated Menu Bar (hidden on mobile, show on md+) */}
          <div className="hidden md:flex items-center justify-center flex-1 px-0 relative">
            <div className="flex items-center gap-2 flex-nowrap overflow-x-auto snap-x snap-mandatory md:flex-wrap md:overflow-visible"
              style={{ backgroundColor: 'transparent', scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
              {[...menuItems, ...extraItems].map((item) => {
                // Determine if active
                let isActive = false;
                if (item.id === 'lesson-center') {
                  isActive = currentView === 'lesson-center' && currentFunction !== 'AI 组卷';
                } else if (item.id === 'ai-paper') {
                  isActive = currentView === 'lesson-center' && currentFunction === 'AI 组卷';
                } else if (item.id === 'points') {
                  isActive = false;
                } else {
                  isActive = currentView === item.id;
                }

                const icon = (() => {
                  switch (item.id) {
                    case 'lesson-center':
                      return (<Layers className="w-6 h-6" />);
                    case 'ai-paper':
                      return (<FileText className="w-6 h-6" />);
                    case 'favorites':
                      return (<Star className="w-6 h-6" />);
                    case 'membership':
                      return (<Crown className="w-6 h-6" />);
                    case 'points':
                      return (<Stars className="w-6 h-6" />);
                    default:
                      return null;
                  }
                })();

                return (
                  <div 
                    key={item.id}
                    className={`relative group flex-shrink-0 snap-start md:snap-none ${item.id === 'points' ? 'md:hidden' : ''}`}
                  >
                    <div className={`absolute -inset-0 rounded-full bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 ${isActive ? 'opacity-70' : 'opacity-0 group-hover:opacity-70'} transition-opacity duration-500 blur-sm pointer-events-none`} />
                    <button
                      onClick={() => handleMenuClick(item)}
                      className={`
                        relative w-10 h-10 md:w-auto md:h-auto md:px-4 md:py-2 rounded-full md:rounded-[12px] text-sm font-semibold transition-transform duration-300 group-hover:scale-105 active:scale-95 flex items-center justify-center md:justify-start md:gap-2
                      `}
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <span className="w-5 h-5">{icon}</span>
                      {item.id === 'points' && (
                        <span className="ml-1 text-xs font-bold md:text-base" style={{ color: 'var(--text-primary)' }}>{points}</span>
                      )}
                      <span className="hidden md:inline">{item.label}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Integrated Tools Bar */}
          <div className="flex items-center gap-1 justify-end ml-auto pr-3 md:pr-4 xl:pr-6">
            
            {/* Language Switch */}
            <div className="hidden lg:flex items-center rounded-[12px] p-1"
              style={{ backgroundColor: 'transparent' }}>
              {['zh', 'en'].map((langCode) => {
                const isActive = language === langCode;
                return (
                  <button
                    key={langCode}
                    onClick={() => {
                      dispatch(setUiLanguage(langCode as any));
                      dispatch(setLanguage(langCode as any));
                    }}
                    className={`
                      px-2.5 py-1 rounded-[10px] text-sm font-semibold transition-all duration-300
                      ${isActive ? 'shadow-sm scale-[1.02]' : ''}
                    `}
                    style={isActive ? { 
                      background: 'linear-gradient(90deg, rgba(var(--primary-rgb), 0.18) 0%, rgba(var(--primary-rgb), 0.1) 100%)',
                      color: 'var(--primary-color)',
                      boxShadow: '0 2px 6px rgba(var(--primary-rgb), 0.15)'
                    } : { 
                      color: 'var(--text-primary)'
                    }}
                  >
                    {langCode === 'zh' ? '中' : 'EN'}
                  </button>
                );
              })}
            </div>

            {/* Theme Toggle + Settings (icons only) */}
            <button
              onClick={onToggleTheme}
              className="p-2 rounded-[12px] transition-colors hover:bg-[#A084FF33]"
              title="Switch Theme"
              style={{ color: 'var(--text-primary)' }}
            >
              <Shirt className="w-6 h-6" />
            </button>
            <button
              onClick={() => onViewChange('settings')}
              className="p-2 rounded-[12px] transition-colors hover:bg-[#A084FF33]"
              title="Settings"
              style={{ color: 'var(--text-primary)' }}
            >
              <SettingsIcon className="w-6 h-6" />
            </button>

            {/* Avatar */}
            <div className="relative group flex-shrink-0">
              {/* Stardust Effect Container */}
              <div className={`absolute -inset-1 rounded-full bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 opacity-0 group-hover:opacity-70 transition-opacity duration-500 blur-sm ${showSparkle ? 'animate-pulse opacity-100' : ''}`} />
              
              <button 
                onClick={() => openEditor('album')}
                className="relative w-10 h-10 rounded-full border border-white/70 shadow-md overflow-hidden transition-transform duration-300 group-hover:scale-105 active:scale-95"
              >
                <img 
                  src={currentAvatar} 
                  alt="Avatar" 
                  className="w-full h-full object-cover"
                />
              </button>
            </div>

            {/* Inspiration Points - desktop/iPad wide screens on the right of avatar */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 backdrop-blur-md rounded-[12px] border shadow-sm transition-transform hover:scale-105 cursor-default"
              style={{ backgroundColor: 'rgba(255,255,255,0.4)', borderColor: 'var(--header-border, rgba(255,255,255,0.3))', padding: '4px 8px' }}>
              <Stars className="w-6 h-6" />
              <span className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>{points}</span>
            </div>
          </div>
        </div>
      </div>
      </div>
      {/* Bottom Navigation - Mobile only */}
      <div className="md:hidden fixed bottom-[-2px] inset-x-0 z-[60] pointer-events-none">
        <div
          className="pointer-events-auto h-[58px] w-full backdrop-blur-xl"
          style={{
            backgroundImage: isDarkBg
              ? 'linear-gradient(180deg, color-mix(in oklab, var(--header-bg) 40%, #091022 60%), color-mix(in oklab, var(--header-bg) 90%, #ffffff 10%))'
              : 'linear-gradient(180deg, color-mix(in oklab, var(--header-bg) 40%, #091022 60%), color-mix(in oklab, var(--header-bg) 90%, #ffffff 10%))',
            boxShadow: '0 -8px 24px rgba(31,38,135,0.12)'
          }}
        >
          <div className="mx-auto w-full h-full flex items-stretch justify-between px-2">
            {menuItems.map((item) => {
              const isActive = (() => {
                if (item.id === 'lesson-center') return currentView === 'lesson-center' && currentFunction !== 'AI 组卷';
                if (item.id === 'ai-paper') return currentView === 'lesson-center' && currentFunction === 'AI 组卷';
                return currentView === item.id;
              })();
              const icon = (() => {
                switch (item.id) {
                  case 'lesson-center': return (<Layers className="w-5 h-5" />);
                  case 'ai-paper': return (<FileText className="w-5 h-5" />);
                  case 'favorites': return (<Star className="w-5 h-5" />);
                  case 'membership': return (<Crown className="w-5 h-5" />);
                  default: return null;
                }
              })();
              return (
                <button
                  key={`bottom-${item.id}`}
                  onClick={() => handleMenuClick(item)}
                  className="flex-1 flex flex-col items-center justify-center gap-0.5 text-xs font-semibold relative"
                  style={{ color: isActive ? 'var(--primary-color)' : 'var(--text-primary)' }}
                >
                  <span className="w-5 h-5">{icon}</span>
                  <span className="leading-none">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      {/* Avatar Editor Modal */}
      <AvatarEditor 
        isOpen={showEditor}
        onClose={() => setShowEditor(false)}
        onSave={handleSaveAvatar}
        initialMode={editorMode}
      />
    </div>
  );
};
