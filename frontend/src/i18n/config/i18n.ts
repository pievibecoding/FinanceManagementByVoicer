import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import type { InitOptions } from 'i18next';
import enCommon from '../locales/en/common.json';
import viCommon from '../locales/vi/common.json';

const resources = {
  en: {
    common: enCommon,
  },
  vi: {
    common: viCommon,
  },
} as const;

export const i18nConfig: InitOptions = {
  supportedLngs: ['en', 'vi'],
  fallbackLng: 'vi',
  resources,
  debug: import.meta.env.DEV,
  defaultNS: 'common',
  ns: ['common'],
  interpolation: {
    escapeValue: false,
  },
  detection: {
    order: ['localStorage', 'navigator', 'htmlTag'],
    caches: ['localStorage'],
    lookupLocalStorage: 'finance_language',
  },
  react: {
    useSuspense: false,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init(i18nConfig);

export default i18n;
