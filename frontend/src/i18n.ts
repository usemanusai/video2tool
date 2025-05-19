import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

// Initialize i18next
i18n
  // Load translations using http backend
  .use(Backend)
  // Detect user language
  .use(LanguageDetector)
  // Pass the i18n instance to react-i18next
  .use(initReactI18next)
  // Initialize i18next
  .init({
    // Default language
    fallbackLng: 'en',
    // Debug mode in development
    debug: import.meta.env.DEV,
    // Default namespace
    defaultNS: 'common',
    // Namespaces
    ns: ['common', 'auth', 'video', 'spec', 'task', 'export', 'integration'],
    // Backend configuration
    backend: {
      // Path to load translations from
      loadPath: './locales/{{lng}}/{{ns}}.json',
    },
    // Interpolation configuration
    interpolation: {
      // React already escapes values
      escapeValue: false,
    },
    // React configuration
    react: {
      // Use Suspense for loading
      useSuspense: true,
    },
  });

export default i18n;