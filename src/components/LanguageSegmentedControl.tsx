import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setUiLanguage } from '../store/slices/userSettingsSlice';
import { setLanguage } from '../store/slices/previewSlice';
import { RootState } from '../store';

export const LanguageSegmentedControl: React.FC = () => {
  const dispatch = useDispatch();
  // Subscribe to userSettings uiLanguage as the primary source of truth
  const uiLanguage = useSelector((state: RootState) => state.userSettings.uiLanguage);

  const languages = [
    { id: 'zh', label: '中文' },
    { id: 'en', label: 'English' }
  ];

  const handleLanguageChange = (langId: 'zh' | 'en') => {
    // Sync both states as requested
    dispatch(setUiLanguage(langId));
    dispatch(setLanguage(langId));
  };

  // Calculate slider position
  // We use percentages for the slider position
  const activeIndex = languages.findIndex(l => l.id === uiLanguage);
  // Default to 0 if not found (fallback)
  const safeIndex = activeIndex === -1 ? 0 : activeIndex;
  
  const sliderWidth = 100 / languages.length;
  
  // Custom Styles for Glassmorphism
  // Container: Light gray with blur
  // Slider: Theme color
  
  return (
    <div 
      className="relative flex items-center p-1 rounded-full border shadow-sm transition-all"
      style={{
        height: '36px',
        width: 'fit-content',
        minWidth: '240px',
        backgroundColor: 'rgba(241, 242, 246, 0.6)', // Light gray with opacity
        borderColor: 'rgba(255, 255, 255, 0.3)',
        backdropFilter: 'blur(8px)',
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)'
      }}
    >
      {/* Sliding Background Block */}
      <div
        className="absolute top-1 bottom-1 rounded-full shadow-md transition-all duration-300 ease-in-out"
        style={{
          width: `calc(${sliderWidth}% - 4px)`, // Subtract padding (2px each side approx)
          left: `calc(${safeIndex * sliderWidth}% + 2px)`,
          backgroundColor: 'var(--primary-color)',
          backdropFilter: 'blur(4px)', // Subtle blur effect on the slider itself
          opacity: 0.95, // Slight transparency for glass feel
        }}
      />

      {/* Buttons */}
      {languages.map((lang) => {
        const isActive = uiLanguage === lang.id;
        return (
          <button
            key={lang.id}
            onClick={() => handleLanguageChange(lang.id as any)}
            className="flex-1 relative z-10 text-xs font-bold text-center transition-colors duration-300 flex items-center justify-center h-full select-none"
            style={{
              color: isActive ? '#ffffff' : 'var(--text-secondary)',
              textShadow: isActive ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
              cursor: 'pointer'
            }}
          >
            {lang.label}
          </button>
        );
      })}
    </div>
  );
};
