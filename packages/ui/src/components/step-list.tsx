import type { ComponentProps, ReactNode } from 'react';
import { CornerDownLeft, Tent } from 'lucide-react';

import { cn } from '../lib/utils';

export type StepKind = 'camp' | 'stop' | 'return';

const kindLabels: Record<StepKind, string> = {
  camp: 'Camp',
  stop: 'Étape',
  return: 'Retour au camp',
};

export interface StepListProps extends ComponentProps<'ol'> {
  /** Nom accessible de la liste, par exemple « Étapes de la mission ». */
  label: string;
}

/** Liste ordonnée des étapes ; l'ordre de visite est celui du DOM. */
export function StepList({ label, className, ...props }: StepListProps) {
  return <ol data-slot="step-list" aria-label={label} className={cn('m-0 list-none p-0', className)} {...props} />;
}

export interface StepListItemProps extends Omit<ComponentProps<'li'>, 'title'> {
  kind?: StepKind;
  /** Rang de visite, affiché pour les étapes de type `stop`. */
  position?: number;
  title: string;
  description?: ReactNode;
  selected?: boolean;
  /** Rend le titre activable, par exemple pour ouvrir la fiche du site. */
  onSelect?: () => void;
  /** Contrôles de l'étape : réordonner, supprimer… */
  actions?: ReactNode;
}

export function StepListItem({
  kind = 'stop',
  position,
  title,
  description,
  selected = false,
  onSelect,
  actions,
  className,
  ...props
}: StepListItemProps) {
  const marker =
    kind === 'camp' ? (
      <Tent aria-hidden="true" className="size-4" />
    ) : kind === 'return' ? (
      <CornerDownLeft aria-hidden="true" className="size-4" />
    ) : (
      <span aria-hidden="true">{position}</span>
    );

  const heading = (
    <>
      <span className="sr-only">
        {kindLabels[kind]}
        {kind === 'stop' && position !== undefined ? ` ${position}` : ''} :{' '}
      </span>
      {title}
    </>
  );

  return (
    <li
      data-slot="step-list-item"
      data-kind={kind}
      className={cn(
        // Le trait vertical relie les repères : il matérialise l'ordre du parcours.
        "relative flex gap-3 pb-4 last:pb-0 after:absolute after:top-9 after:bottom-0 after:left-[1.0625rem] after:w-0.5 after:bg-border after:content-[''] last:after:hidden",
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          'relative z-10 flex size-9 shrink-0 items-center justify-center border-2 text-sm font-bold tabular-nums',
          kind === 'stop'
            ? 'border-mars bg-mars text-mars-foreground'
            : 'border-mars bg-card text-foreground',
          kind === 'return' && 'border-dashed',
        )}
      >
        {marker}
      </span>
      <div
        className={cn(
          'flex min-w-0 flex-1 items-start justify-between gap-2 border-2 border-transparent px-2 py-1',
          selected && 'border-primary bg-accent text-accent-foreground',
        )}
      >
        <div className="min-w-0">
          {onSelect ? (
            <button
              type="button"
              aria-pressed={selected}
              onClick={onSelect}
              className="text-left font-semibold underline-offset-4 hover:underline"
            >
              {heading}
            </button>
          ) : (
            <p className="font-semibold">{heading}</p>
          )}
          {description ? <div className="text-sm text-muted-foreground">{description}</div> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
      </div>
    </li>
  );
}
