import { useTranslation } from 'react-i18next';
import { setLanguage, type Language } from './i18n';

export function LanguageSelector() {
  const { i18n } = useTranslation();
  return <label className="flex items-center gap-1 text-sm">
    <span className="sr-only">{i18n.language === 'en' ? 'Language' : 'Langue'}</span>
    <select className="h-11 border border-header-foreground/40 bg-header px-2 text-header-foreground" value={i18n.language} onChange={event => setLanguage(event.target.value as Language)}>
      <option value="fr" lang="fr">Français</option>
      <option value="en" lang="en">English</option>
    </select>
  </label>;
}
