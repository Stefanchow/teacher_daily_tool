import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { translations, TranslationKey, Language } from '../constants/translations';

export const useTranslation = () => {
  const uiLanguage = useSelector((state: RootState) => state.userSettings.uiLanguage) as Language;
  
  // Fallback to 'zh' if language not found
  const currentTranslations = translations[uiLanguage] || translations['zh'];

  const t = (key: TranslationKey, params?: Record<string, string | number>) => {
    // Cast to allow access even if key is missing in specific language file
    const val = (currentTranslations as Record<string, string>)[key];
    let text = val || translations['zh'][key] || key;
    
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    
    return text;
  };

  return { t, language: uiLanguage };
};
