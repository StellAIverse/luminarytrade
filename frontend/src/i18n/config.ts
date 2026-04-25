import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslation from '../locales/en/translation.json';
import frTranslation from '../locales/fr/translation.json';
import arTranslation from '../locales/ar/translation.json';
import esTranslation from '../locales/es/translation.json';
import ptTranslation from '../locales/pt/translation.json';
import zhTranslation from '../locales/zh/translation.json';

export const SUPPORTED_LANGUAGES = [
    { code: 'en', label: 'English', nativeLabel: 'English', dir: 'ltr', flag: '🇬🇧' },
    { code: 'fr', label: 'French', nativeLabel: 'Français', dir: 'ltr', flag: '🇫🇷' },
    { code: 'ar', label: 'Arabic', nativeLabel: 'العربية', dir: 'rtl', flag: '🇸🇦' },
    { code: 'es', label: 'Spanish', nativeLabel: 'Español', dir: 'ltr', flag: '🇪🇸' },
    { code: 'pt', label: 'Portuguese', nativeLabel: 'Português', dir: 'ltr', flag: '🇧🇷' },
    { code: 'zh', label: 'Chinese', nativeLabel: '中文', dir: 'ltr', flag: '🇨🇳' },
] as const;

export type SupportedLanguageCode = typeof SUPPORTED_LANGUAGES[number]['code'];

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            en: { translation: enTranslation },
            fr: { translation: frTranslation },
            ar: { translation: arTranslation },
            es: { translation: esTranslation },
            pt: { translation: ptTranslation },
            zh: { translation: zhTranslation },
        },
        fallbackLng: 'en',
        load: 'languageOnly',
        supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
        interpolation: { escapeValue: false },
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage'],
            lookupLocalStorage: 'i18nextLng',
        },
        react: { useSuspense: false },
    });

export function applyDocumentDirection(langCode: string): void {
    const lang = SUPPORTED_LANGUAGES.find((l) => l.code === langCode);
    document.documentElement.dir = lang?.dir ?? 'ltr';
    document.documentElement.lang = langCode;
}

applyDocumentDirection(i18n.language);
i18n.on('languageChanged', applyDocumentDirection);

export default i18n;