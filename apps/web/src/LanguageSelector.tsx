import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { setLanguage, type Language } from './i18n';

const languages: readonly { code: Language; label: string; shortLabel: string }[] = [
  { code: 'fr', label: 'Français', shortLabel: 'FR' },
  { code: 'en', label: 'English', shortLabel: 'EN' },
];

export function LanguageSelector() {
  const { i18n } = useTranslation();
  return (
    <div
      role="group"
      aria-label={i18n.language === 'en' ? 'Language' : 'Langue'}
      className="flex shrink-0 items-center gap-1 rounded-lg border border-header-foreground/15 bg-header-foreground/5 p-0.5"
    >
      <Languages aria-hidden="true" className="mx-1.5 size-4 text-header-foreground/55 max-sm:hidden" />
      {languages.map(({ code, label, shortLabel }) => (
        <button
          key={code}
          type="button"
          lang={code}
          aria-label={label}
          aria-pressed={i18n.language === code}
          title={label}
          onClick={() => setLanguage(code)}
          className="inline-flex size-11 cursor-pointer items-center justify-center rounded-md text-xs font-semibold tracking-wider text-header-foreground/65 transition-colors hover:bg-header-foreground/10 hover:text-header-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-pressed:bg-mars aria-pressed:text-header aria-pressed:shadow-sm motion-reduce:transition-none"
        >
          {shortLabel}
        </button>
      ))}
    </div>
  );
}
