import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import fr from './locales/fr.json';
import en from './locales/en.json';

export type Language = 'fr' | 'en';
export const LANGUAGE_KEY = 'marps.language';
export function detectLanguage(storage: Pick<Storage, 'getItem'> | undefined, languages: readonly string[]): Language {
  try {
    const saved = storage?.getItem(LANGUAGE_KEY);
    if (saved === 'fr' || saved === 'en') return saved;
  } catch { /* Browser storage can be disabled. */ }
  for (const language of languages) {
    const base = language.toLowerCase().split('-')[0];
    if (base === 'en' || base === 'fr') return base;
  }
  return 'fr';
}
let storage: Storage | undefined;
try { storage = globalThis.localStorage; } catch { /* No persistent storage. */ }
void i18next.use(initReactI18next).init({
  resources: { fr: { translation: fr }, en: { translation: en } },
  lng: detectLanguage(storage, globalThis.navigator?.languages ?? []),
  fallbackLng: 'fr',
  initAsync: false,
  keySeparator: false,
  nsSeparator: false,
  interpolation: { escapeValue: false },
});
export function locale(): string { return i18next.language === 'en' ? 'en-US' : 'fr-FR'; }
export function setLanguage(language: Language): void {
  try { storage?.setItem(LANGUAGE_KEY, language); } catch { /* The in-memory choice still works. */ }
  void i18next.changeLanguage(language);
}
function updateDocumentLanguage() {
  if (typeof document !== 'undefined') document.documentElement.lang = i18next.language;
}
i18next.on('languageChanged', updateDocumentLanguage);
updateDocumentLanguage();
export default i18next;
