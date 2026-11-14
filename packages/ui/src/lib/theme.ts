import { useCallback, useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';

/** Clé partagée avec le script d'amorçage de apps/web/index.html. */
export const THEME_STORAGE_KEY = 'marps-theme';

const listeners = new Set<() => void>();

function readTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Stockage indisponible (navigation privée, quota) : le choix vaut pour la session.
  }
  listeners.forEach((listener) => listener());
}

/** Thème actif, porté par la classe `dark` de l'élément racine. */
export function useTheme(): readonly [Theme, (theme: Theme) => void] {
  const theme = useSyncExternalStore(subscribe, readTheme, (): Theme => 'light');
  const setTheme = useCallback((next: Theme) => applyTheme(next), []);
  return [theme, setTheme] as const;
}
