import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

// Initialize i18next
i18n
  // Load translations from the /public/locales folder
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
    debug: process.env.NODE_ENV === 'development',
    // Namespace for translations
    ns: ['common', 'auth', 'dashboard', 'projects', 'videos', 'specifications', 'tasks', 'integrations'],
    defaultNS: 'common',
    // Interpolation configuration
    interpolation: {
      // React already escapes values
      escapeValue: false,
    },
    // Backend configuration
    backend: {
      // Path to load translations from
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    // Language detector options
    detection: {
      // Order of detection
      order: ['localStorage', 'navigator'],
      // Cache user language in localStorage
      caches: ['localStorage'],
      // localStorage key
      lookupLocalStorage: 'i18nextLng',
    },
    // React configuration
    react: {
      // Wait for translations to be loaded
      wait: true,
      // Use Suspense for loading
      useSuspense: true,
    },
  });

export default i18n;
