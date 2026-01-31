import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { setAvatar, setNickname } from '../../store/slices/userSettingsSlice';
import { useTranslation } from '../../hooks/useTranslation';
import { ThemeType } from '../../theme/themes';
import { APP_LOGO_BASE64 } from '../../constants/assets';
import { AvatarEditor } from '../common/AvatarEditor';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  currentView: 'lesson-center' | 'membership' | 'settings' | 'favorites';
  onViewChange: (view: 'lesson-center' | 'membership' | 'settings' | 'favorites') => void;
  isMobile: boolean;
  currentTheme: ThemeType;
  onToggleTheme: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  onToggle, 
  currentView, 
  onViewChange,
  isMobile,
  currentTheme,
  onToggleTheme
}) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { avatar, nickname: reduxNickname, enableMotion } = useSelector((state: RootState) => state.userSettings);

  const [showMenu, setShowMenu] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [editorMode, setEditorMode] = useState<'camera' | 'album'>('album');
  const [showSparkle, setShowSparkle] = useState(false);
  const [isEditingNickname, setIsEditingNickname] = useState(false);

  const currentAvatar = avatar || APP_LOGO_BASE64;
  const currentNickname = reduxNickname || t('APP_TITLE');

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowMenu(false);
    if (showMenu) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showMenu]);

  const handleAvatarInteraction = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent document click from closing immediately
    
    // If sidebar is closed, open it first
    if (!isOpen) {
      onToggle();
      return;
    }
    
    // If open, this acts as the "Second Click" trigger (or we rely on double click)
    // User requested: "First click triggers sidebar... Second click pops up menu"
    // To support this flow:
    // 1. Click on collapsed -> Expand (Done above)
    // 2. Click on expanded -> Show Menu
    setShowMenu(!showMenu);
  };

  const openEditor = (mode: 'camera' | 'album') => {
    setEditorMode(mode);
    setShowEditor(true);
    setShowMenu(false);
  };

  const handleSaveAvatar = (base64: string) => {
    dispatch(setAvatar(base64));
    if (enableMotion) {
      setShowSparkle(true);
      setTimeout(() => setShowSparkle(false), 2000); // 2s sparkle effect
    }
  };

  const menuItems = [
    { 
      id: 'lesson-center', 
      label: t('menu_lesson_center'), 
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      )
    },
    {
      id: 'favorites',
      label: t('menu_favorites'),
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
      )
    }
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          onClick={onToggle}
        />
      )}

      {/* Sidebar Container */}
      <div 
        className={`
          ${isMobile ? 'fixed' : 'fixed md:sticky'} top-0 left-0 h-screen z-50
          transition-all duration-300 ease-in-out
          flex flex-col border-none
          ${isOpen ? 'w-64' : 'w-20'}
          ${isMobile && !isOpen ? '-translate-x-full' : 'translate-x-0'}
        `}
        style={{
          backgroundColor: 'var(--sidebar-bg, rgba(255, 255, 255, 0.8))',
          backdropFilter: 'blur(10px)',
          boxShadow: 'var(--card-shadow, 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06))',
        }}
      >

        {/* Logo/Avatar Area */}
        <div className={`relative p-6 flex items-center ${isOpen ? 'justify-start' : 'justify-center'} overflow-visible z-50`}>
          
          {/* Sparkle Effect Container */}
          {showSparkle && (
            <div className="absolute left-6 top-6 w-10 h-10 pointer-events-none z-50">
              <span className="absolute inset-0 animate-ping inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
              <div className="absolute -inset-4 bg-gradient-to-tr from-yellow-300 via-pink-400 to-purple-500 rounded-full blur-xl opacity-50 animate-pulse"></div>
              {/* Star Particles */}
              {[...Array(6)].map((_, i) => (
                <div 
                   key={i}
                   className="absolute w-1 h-1 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                   style={{
                     top: '50%',
                     left: '50%',
                     ['--r' as any]: `${i * 60}deg`, // Custom property for rotation
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

          <div 
            className="relative w-10 h-10 flex-shrink-0 rounded-full cursor-pointer group select-none transition-transform active:scale-95"
            onClick={handleAvatarInteraction}
            onContextMenu={(e) => { e.preventDefault(); setShowMenu(true); }}
            title={isOpen ? t('avatar_click_hint') : t('avatar_expand_hint')}
          >
             {/* Background Gradient */}
             <div className="absolute inset-0 rounded-full animate-pulse-slow bg-gradient-to-tr from-indigo-400 to-purple-400 dark:from-indigo-600 dark:to-purple-600"></div>
             
             {/* Avatar Image */}
             <img 
               src={currentAvatar} 
               alt="Avatar" 
               className="relative w-full h-full object-cover rounded-full transition-transform duration-300 group-hover:scale-105 z-10 border-2 border-white dark:border-gray-800"
             />

             {/* Edit Hint Badge (Only on hover when expanded) */}
             {isOpen && (
               <div className="absolute -bottom-1 -right-1 bg-white dark:bg-gray-700 rounded-full p-0.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-20">
                 <svg className="w-3 h-3 text-gray-500 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                 </svg>
               </div>
             )}

             {/* Menu Popup */}
             {showMenu && (
               <div 
                 className="absolute top-12 left-0 w-44 rounded-xl shadow-xl border p-2 z-[60] animate-in fade-in zoom-in-95 duration-200 origin-top-left bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                 onClick={(e) => e.stopPropagation()}
               >
                 <div className="text-xs font-semibold px-2 py-1 mb-1 text-gray-500 dark:text-gray-400">{t('avatar_change')}</div>
                 <button 
                   onClick={() => openEditor('camera')}
                   className="w-full text-left px-3 py-2 text-sm rounded-lg flex items-center gap-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                 >
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                   {t('avatar_camera')}
                 </button>
                 <button 
                   onClick={() => openEditor('album')}
                   className="w-full text-left px-3 py-2 text-sm rounded-lg flex items-center gap-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                 >
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                   {t('avatar_album')}
                 </button>
               </div>
             )}
          </div>
          
          {isEditingNickname && isOpen ? (
            <input
              type="text"
              value={currentNickname}
              onChange={(e) => dispatch(setNickname(e.target.value))}
              onBlur={() => setIsEditingNickname(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setIsEditingNickname(false);
              }}
              autoFocus
              className="ml-3 font-bold text-xl bg-transparent border-b-2 border-indigo-500 focus:outline-none text-gray-800 dark:text-gray-100 w-32"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span 
              className={`ml-3 font-bold text-xl whitespace-nowrap transition-opacity duration-300 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 ${isOpen ? 'opacity-100' : 'opacity-0 hidden'}`}
              style={{ color: 'var(--text-primary)' }}
              onClick={(e) => {
                e.stopPropagation();
                setIsEditingNickname(true);
              }}
              title={t('nickname_edit_hint')}
            >
              {currentNickname || t('APP_TITLE')}
            </span>
          )}
        </div>

        {/* Avatar Editor Modal */}
        <AvatarEditor 
          isOpen={showEditor} 
          onClose={() => setShowEditor(false)} 
          onSave={handleSaveAvatar}
          initialMode={editorMode}
        />

        {/* Menu Items */}
        <nav className="flex-1 px-3 space-y-2 overflow-y-auto overflow-x-hidden">
          {menuItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onViewChange(item.id as any);
                  if (isMobile) onToggle();
                }}
                className={`
                  w-full flex items-center p-3 rounded-xl transition-all duration-200 group
                  ${isActive 
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-medium shadow-sm' 
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}
                  ${!isOpen ? 'justify-center' : ''}
                `}
              >
                <div className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                  {item.icon}
                </div>
                {isOpen && (
                  <span className="ml-3 whitespace-nowrap overflow-hidden text-ellipsis">
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-3 mt-auto space-y-2">
           <button
            onClick={onToggleTheme}
            className={`
              w-full flex items-center p-3 rounded-xl transition-all duration-200 group
              text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800
              ${!isOpen ? 'justify-center' : ''}
            `}
            title={isOpen ? '' : t('smart_theme')}
          >
            <svg className="w-6 h-6 transition-transform duration-200 group-hover:scale-110" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.47a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.47a2 2 0 00-1.34-2.23z" />
            </svg>
            {isOpen && <span className="ml-3 whitespace-nowrap overflow-hidden text-ellipsis">{t('smart_theme')}</span>}
          </button>

           <button
            onClick={() => {
              onViewChange('settings');
              if (isMobile) onToggle();
            }}
            className={`
              w-full flex items-center p-3 rounded-xl transition-all duration-200 group
              ${currentView === 'settings' 
                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-medium' 
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}
              ${!isOpen ? 'justify-center' : ''}
            `}
          >
            <svg className="w-6 h-6 transition-transform duration-200 group-hover:rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {isOpen && <span className="ml-3">{t('menu_settings')}</span>}
          </button>
        </div>
      </div>
    </>
  );
};
