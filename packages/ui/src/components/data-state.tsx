import type { ComponentProps, ReactNode } from 'react';
import { CircleDashed, LoaderCircle, MapPinOff, OctagonAlert, type LucideIcon } from 'lucide-react';

import { cn } from '../lib/utils';

export type DataStateKind = 'loading' | 'error' | 'empty' | 'insufficient-coverage';

interface KindDefinition {
  readonly icon: LucideIcon;
  /** Nature de l'état, affichée en capitales au-dessus du titre comme un voyant de console. */
  readonly label: string;
  readonly role?: 'status' | 'alert';
  /** Bordure du bloc : pleine ou pointillée selon l'état. */
  readonly className: string;
  /** Carré de l'icône, seule zone teintée du bloc. */
  readonly badgeClassName: string;
  readonly labelClassName: string;
  readonly iconClassName?: string;
}

const kinds: Record<DataStateKind, KindDefinition> = {
  loading: {
    icon: LoaderCircle,
    label: 'Chargement',
    role: 'status',
    className: 'border-border',
    badgeClassName: 'bg-muted text-muted-foreground',
    labelClassName: 'text-muted-foreground',
    iconClassName: 'animate-spin',
  },
  error: {
    icon: OctagonAlert,
    label: 'Erreur',
    role: 'alert',
    className: 'border-danger-border border-l-[3px]',
    badgeClassName: 'bg-danger-surface text-danger',
    labelClassName: 'text-danger',
  },
  empty: {
    icon: CircleDashed,
    label: 'Aucune donnée',
    className: 'border-dashed border-input',
    badgeClassName: 'bg-muted text-muted-foreground',
    labelClassName: 'text-muted-foreground',
  },
  'insufficient-coverage': {
    icon: MapPinOff,
    label: 'Hors couverture',
    className: 'border-dashed border-warning-border border-l-[3px]',
    badgeClassName: 'bg-warning-surface text-warning',
    labelClassName: 'text-warning',
  },
};

export interface DataStateProps extends Omit<ComponentProps<'div'>, 'title'> {
  kind: DataStateKind;
  title: string;
  description?: ReactNode;
  /** Action qui permet de sortir de l'état : réessayer, ouvrir Jezero… */
  action?: ReactNode;
  /** `center` pour une grande zone comme la carte, `start` dans un panneau. */
  align?: 'start' | 'center';
  /**
   * Annonce le chargement ou l'erreur aux lecteurs d'écran. À désactiver quand
   * plusieurs zones affichent le même état : une seule doit l'annoncer.
   */
  announce?: boolean;
}

/**
 * États d'une zone de données : chargement, erreur, absence de données et
 * couverture insuffisante. Chaque état se lit sans la couleur : libellé en
 * capitales, icône et style de bordure lui sont propres.
 */
export function DataState({
  kind,
  title,
  description,
  action,
  align = 'start',
  announce = true,
  className,
  children,
  ...props
}: DataStateProps) {
  const definition = kinds[kind];
  const Icon = definition.icon;
  const centered = align === 'center';

  return (
    <div
      data-slot="data-state"
      data-kind={kind}
      role={announce ? definition.role : undefined}
      aria-busy={kind === 'loading' ? true : undefined}
      className={cn(
        'flex gap-3 border bg-card p-4 text-sm text-card-foreground',
        centered && 'flex-col items-center px-6 py-6 text-center',
        definition.className,
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn('flex size-9 shrink-0 items-center justify-center', definition.badgeClassName)}
      >
        <Icon className={cn('size-[1.125rem]', definition.iconClassName)} />
      </span>
      <div className={cn('grid min-w-0 content-start gap-1', centered && 'justify-items-center')}>
        <p>
          <span className={cn('label-caps block', definition.labelClassName)}>{definition.label}</span>
          <span className="block font-semibold">{title}</span>
        </p>
        {description ? <div className="max-w-prose leading-relaxed text-muted-foreground">{description}</div> : null}
        {children}
        {action ? <div className="mt-2.5">{action}</div> : null}
      </div>
    </div>
  );
}
