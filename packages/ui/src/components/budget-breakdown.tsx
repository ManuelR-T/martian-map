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
  /** Part de la durée disponible, entre 0 et 1, fournie par le moteur. */
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
 * de la barre selon les parts reçues.
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
      <div
        role={over ? 'alert' : 'status'}
        className={cn(
          'flex items-start gap-3 border border-l-[3px] px-4 py-3',
          over
            ? 'border-danger-border bg-danger-surface text-danger'
            : 'border-success-border bg-success-surface text-success',
        )}
      >
        <MarginIcon aria-hidden="true" className="mt-1 size-5 shrink-0" />
        <div className="min-w-0">
          <p className="label-caps">{margin.message}</p>
          <p className="heading-display mt-0.5 text-2xl tabular-nums">
            <span className="sr-only">{marginLabel} : </span>
            {margin.value}
          </p>
        </div>
      </div>

      {/* La barre double la liste ci-dessous ; elle est donc masquée aux lecteurs d'écran. */}
      <div
        aria-hidden="true"
        className={cn(
          'flex h-5 overflow-hidden border bg-muted text-primary',
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

      <dl className="m-0 grid gap-2 text-sm">
        {lines.map((line) => (
          <div key={line.id} className="flex items-center justify-between gap-3">
            <dt className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden="true"
                className={cn('size-3.5 shrink-0 border border-primary text-primary', patternClasses[line.pattern])}
              />
              {line.label}
            </dt>
            <dd className="m-0 font-semibold tabular-nums">{line.value}</dd>
          </div>
        ))}
        <div className="flex items-center justify-between gap-3 border-t pt-2">
          <dt>{marginLabel}</dt>
          <dd className={cn('m-0 font-semibold tabular-nums', over && 'text-destructive')}>{margin.value}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">{availableLabel}</dt>
          <dd className="m-0 font-semibold tabular-nums">{availableValue}</dd>
        </div>
      </dl>
    </div>
  );
}
