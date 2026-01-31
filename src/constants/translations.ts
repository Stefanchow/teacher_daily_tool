import { TEXT_ZH, TEXT_EN, TEXT_FR } from './locales';

export const translations = {
  zh: TEXT_ZH,
  en: TEXT_EN,
  fr: TEXT_FR,
};

export type Language = keyof typeof translations;
export type TranslationKey = keyof typeof TEXT_ZH;
