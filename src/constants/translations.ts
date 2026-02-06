import { TEXT_ZH, TEXT_EN } from './locales';

export const translations = {
  zh: TEXT_ZH,
  en: TEXT_EN,
};

export type Language = keyof typeof translations;
export type TranslationKey = keyof typeof TEXT_ZH;
