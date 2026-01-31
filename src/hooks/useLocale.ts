import { TEXT_ZH, TEXT_EN, TEXT_FR } from '../constants/locales';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

/**
 * Hook to access localization constants.
 * Returns the full localization object based on current UI language.
 * 
 * @returns The localization object (TEXT_ZH, TEXT_EN, or TEXT_FR)
 */
export const useLocale = () => {
  const lang = useSelector((state: RootState) => state.userSettings.uiLanguage);
  
  if (lang === 'fr') return TEXT_FR;
  if (lang === 'en') return TEXT_EN;
  return TEXT_ZH;
};
