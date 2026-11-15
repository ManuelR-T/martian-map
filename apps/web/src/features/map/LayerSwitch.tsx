import type { ReactNode } from 'react';
import { cn } from '@marps/ui';

/** Interrupteur d'un calque : le même contrôle pour chaque couche que l'on affiche ou masque. */
export function LayerSwitch({ label, icon, checked, onChange, className }: {
  label: string;
  icon?: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn('flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 text-left text-sm font-semibold', className)}
    >
      <span className="flex items-center gap-2 [&_svg]:size-5 [&_svg]:shrink-0">{icon}{label}</span>
      <span aria-hidden="true" className={cn('flex h-7 w-12 shrink-0 items-center rounded-full border-2 p-0.5 transition-colors',
        checked ? 'justify-end border-primary bg-primary' : 'justify-start border-input bg-muted')}>
        <span className="size-5 rounded-full bg-background shadow" />
      </span>
    </button>
  );
}
