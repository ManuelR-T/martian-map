import { useId, type ComponentProps } from 'react';

import { cn } from '../lib/utils';

/**
 * Repère de Marps : le disque de Mars éclairé, cerné du bleu de son couchant et
 * traversé par un parcours. Décoratif ; ses couleurs sont fixes car il vit sur
 * le bandeau nuit, identique dans les deux thèmes (et dans favicon.svg).
 */
export function BrandMark({ className, ...props }: ComponentProps<'svg'>) {
  const gradientId = useId();

  return (
    <svg
      data-slot="brand-mark"
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
      className={cn('size-8 shrink-0', className)}
      {...props}
    >
      <defs>
        <radialGradient id={gradientId} cx="34%" cy="28%" r="85%">
          <stop offset="0" stopColor="#ffc199" />
          <stop offset="0.5" stopColor="#ff8a4c" />
          <stop offset="1" stopColor="#a63c0c" />
        </radialGradient>
      </defs>
      <circle cx="16" cy="16" r="15.25" fill="none" stroke="#8fbaff" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="12.5" fill={`url(#${gradientId})`} />
      <path
        d="M9 20.5c3.2-1 4.2-5.5 7-5.5s3.8 3.5 7-3.5"
        fill="none"
        stroke="#fff"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeDasharray="0.1 4.2"
      />
      <circle cx="9" cy="20.5" r="2.1" fill="#fff" />
      <circle cx="23" cy="11.5" r="2.1" fill="#060912" stroke="#fff" strokeWidth="1.6" />
    </svg>
  );
}
