import { localize } from '../localize';
import type { ComponentProps } from 'react';
import { CircleCheck, TriangleAlert } from 'lucide-react';

import { cn } from '../lib/utils';

export type BudgetPattern = 'solid' | 'hatched' | 'dotted' | 'crossed' | 'striped';

const patternClasses: Record<BudgetPattern, string> = {
  solid: 'pattern-solid',
  hatched: 'pattern-hatched',
  dotted: 'pattern-dotted',
  crossed: 'pattern-crossed',
  striped: 'pattern-striped',
};

export interface BudgetLine {
  readonly id: string;
  readonly label: string;
  /** Valeur déjà calculée et formatée avec son unité, par exemple « 42 min ». */
  readonly value: string;
  /** Part de la durée disponible, positive ou nulle ; peut dépasser 1 en dépassement. */
  readonly share: number;
  readonly pattern: BudgetPattern;
}

export interface BudgetMargin {
  readonly value: string;
  readonly status: 'within' | 'over';
  /** Phrase affichée à côté de la marge : « Budget respecté », « Dépassement de 12 min »… */
  readonly message: string;
}

export interface BudgetBreakdownProps extends ComponentProps<'div'> {
  availableLabel: string;
  availableValue: string;
  lines: readonly BudgetLine[];
  marginLabel: string;
  margin: BudgetMargin;
}

/**
 * Restitue un budget de temps déjà calculé par le moteur de mission. Le
 * composant ne fait aucun calcul métier : il ne fait que répartir la largeur
 * de la barre selon les parts reçues, et y situer la durée disponible quand
 * leur somme la dépasse.
 */
export function BudgetBreakdown({
  availableLabel,
  availableValue,
  lines,
  marginLabel,
  margin,
  className,
  ...props
}: BudgetBreakdownProps) {
  const shares = lines.map((line) => (Number.isFinite(line.share) ? Math.max(0, line.share) : 0));
  const scale = Math.max(1, shares.reduce((sum, share) => sum + share, 0));
  const over = margin.status === 'over';
  const MarginIcon = over ? TriangleAlert : CircleCheck;

  return (
    <div data-slot="budget-breakdown" className={cn('grid gap-4', className)} {...props}>
      {/* Le relevé : la marge est la valeur qui décide, elle porte les plus grands chiffres de l'interface. */}
      <div
        role={over ? 'alert' : 'status'}
        className={cn(
          'border border-l-4 px-4 py-3.5',
          over
            ? 'border-danger-border bg-danger-surface text-danger shadow-[0_0_28px_-10px_var(--danger-border)]'
            : 'border-success-border bg-success-surface text-success shadow-[0_0_28px_-10px_var(--success-border)]',
        )}
      >
        <p className="label-caps flex items-center gap-2">
          <MarginIcon aria-hidden="true" className="size-5 shrink-0" />
          {localize(margin.message)}
        </p>
        <p className="numeral-display mt-2 text-4xl">
          <span className="sr-only">{localize(marginLabel)} {localize(":")} </span>
          {localize(margin.value)}
        </p>
      </div>

      {/* La barre double la liste ci-dessous ; elle est donc masquée aux lecteurs d'écran. */}
      <div aria-hidden="true" className="relative py-1">
        <div
          className={cn(
            'flex h-6 overflow-hidden border bg-muted text-primary',
            over ? 'border-danger-border' : 'border-input',
          )}
        >
          {lines.map((line, index) => (
            <span
              key={line.id}
              className={cn('h-full border-r border-card last:border-r-0', patternClasses[line.pattern])}
              style={{ width: `${((shares[index] ?? 0) / scale) * 100}%` }}
            />
          ))}
        </div>
        {/* En dépassement, un trait situe la fin de la durée disponible dans la barre. */}
        {scale > 1 ? (
          <span
            className="absolute inset-y-0 w-1 -translate-x-1/2 border-x border-card bg-danger"
            style={{ left: `${(1 / scale) * 100}%` }}
          />
        ) : null}
      </div>

      <dl className="m-0 grid gap-2.5 text-sm">
        {lines.map((line) => (
          <div key={line.id} className="flex items-center justify-between gap-3">
            <dt className="flex min-w-0 items-center gap-2.5">
              <span
                aria-hidden="true"
                className={cn('size-4 shrink-0 border border-primary text-primary', patternClasses[line.pattern])}
              />
              {localize(line.label)}
            </dt>
            <dd className="m-0 font-semibold tabular-nums">{localize(line.value)}</dd>
          </div>
        ))}
        <div className="flex items-center justify-between gap-3 border-t pt-2.5">
          <dt>{localize(marginLabel)}</dt>
          <dd className={cn('m-0 font-semibold tabular-nums', over && 'text-destructive')}>{localize(margin.value)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">{localize(availableLabel)}</dt>
          <dd className="m-0 font-semibold tabular-nums">{localize(availableValue)}</dd>
        </div>
      </dl>
    </div>
  );
}
