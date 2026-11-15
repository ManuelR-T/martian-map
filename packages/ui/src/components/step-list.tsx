import { localize } from '../localize';
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
  return <ol data-slot="step-list" aria-label={localize(label)} className={cn('m-0 list-none p-0', className)} {...props} />;
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
      <span aria-hidden="true">{localize(position)}</span>
    );

  const heading = (
    <>
      <span className="sr-only">
        {localize(kindLabels[kind])}
        {localize(kind === 'stop' && position !== undefined ? ` ${position}` : '')} {localize(":")}{localize(' ')}
      </span>
      {localize(title)}
    </>
  );

  return (
    <li
      data-slot="step-list-item"
      data-kind={kind}
      className={cn(
        // Le trait vertical relie les repères : il matérialise l'ordre du parcours.
        "relative flex gap-3 pb-4 last:pb-0 after:absolute after:top-11 after:bottom-1 after:left-[1.1875rem] after:border-l-2 after:border-dashed after:border-mars/60 after:content-[''] last:after:hidden",
        className,
      )}
      {...props}
    >
      {/* La forme dit la nature du repère sans la couleur : losange plein pour une étape, carré pour le camp, carré pointillé pour le retour. */}
      <span className="relative z-10 flex size-10 shrink-0 items-center justify-center text-sm font-bold tabular-nums">
        <span
          aria-hidden="true"
          className={cn(
            'absolute border-2 border-mars',
            kind === 'stop' ? 'inset-[5px] rotate-45 bg-mars shadow-ember' : 'inset-0.5 bg-card',
            kind === 'return' && 'border-dashed',
          )}
        />
        <span className={cn('relative', kind === 'stop' ? 'text-mars-foreground' : 'text-foreground')}>{localize(marker)}</span>
      </span>
      <div
        className={cn(
          'relative flex min-w-0 flex-1 items-start justify-between gap-2 border-2 border-transparent px-2.5 py-1.5 transition-[background-color,border-color,box-shadow] duration-200',
          onSelect && !selected && 'hover:bg-accent/50',
          selected && 'border-primary bg-accent text-accent-foreground shadow-glow',
        )}
      >
        <div className="min-w-0">
          {onSelect ? (
            <button
              type="button"
              aria-pressed={selected}
              onClick={onSelect}
              // La zone activable couvre toute la ligne de l'étape, pas seulement son nom.
              className="text-left font-semibold after:absolute after:inset-0 after:content-['']"
            >
              {localize(heading)}
            </button>
          ) : (
            <p className="font-semibold">{localize(heading)}</p>
          )}
          {description ? <div className="text-sm text-muted-foreground">{localize(description)}</div> : null}
        </div>
        {actions ? <div className="relative z-10 flex shrink-0 items-center gap-1">{localize(actions)}</div> : null}
      </div>
    </li>
  );
}
