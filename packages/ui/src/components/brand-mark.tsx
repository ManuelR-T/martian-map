import type { ComponentProps } from 'react';

import { cn } from '../lib/utils';

/**
 * Repère de Marps : le disque de Mars traversé par un parcours. Décoratif.
 * Le liseré blanc détache la rouille du bandeau marine, où elle manquerait de contraste.
 */
export function BrandMark({ className, ...props }: ComponentProps<'svg'>) {
  return (
    <svg
      data-slot="brand-mark"
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
      className={cn('size-8 shrink-0', className)}
      {...props}
    >
      <circle cx="16" cy="16" r="16" fill="#fff" />
      <circle cx="16" cy="16" r="13.5" fill="var(--mars)" />
      <path
        d="M8.5 20.5c3.5-1 4.5-5.5 7.5-5.5s4 3.5 7.5-3.5"
        fill="none"
        stroke="#fff"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeDasharray="0.1 4.4"
      />
      <circle cx="8.5" cy="20.5" r="2.2" fill="#fff" />
      <circle cx="23.5" cy="11.5" r="2.2" fill="none" stroke="#fff" strokeWidth="1.75" />
    </svg>
  );
}
