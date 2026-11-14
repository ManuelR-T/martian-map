import type { ComponentProps } from 'react';
import { Moon, Sun } from 'lucide-react';

import { useTheme } from '../lib/theme';
import { Button } from './ui/button';

export type ThemeToggleProps = Omit<ComponentProps<typeof Button>, 'onClick' | 'children' | 'aria-label'>;

/** Bascule entre thème clair et sombre ; le libellé annonce le thème qui sera appliqué. */
export function ThemeToggle({ variant = 'ghost', ...props }: ThemeToggleProps) {
  const [theme, setTheme] = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';
  const label = next === 'dark' ? 'Thème sombre' : 'Thème clair';
  const Icon = next === 'dark' ? Moon : Sun;

  return (
    <Button
      type="button"
      variant={variant}
      aria-label={`Passer au ${label.toLowerCase()}`}
      onClick={() => setTheme(next)}
      {...props}
    >
      <Icon aria-hidden="true" />
      <span className="max-sm:sr-only">{label}</span>
    </Button>
  );
}
