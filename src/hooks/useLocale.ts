import { TEXT_ZH, TEXT_EN } from '../constants/locales';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

/**
 * Hook to access localization constants.
 * Returns the full localization object based on current UI language.
 * 
 * @returns The localization object (TEXT_ZH or TEXT_EN)
 */
export const useLocale = () => {
  const lang = useSelector((state: RootState) => state.userSettings.uiLanguage);
  
  if (lang === 'en') return TEXT_EN;
  return TEXT_ZH;
};
