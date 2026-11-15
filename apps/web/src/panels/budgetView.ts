import type { CalculatedMissionBudget } from '@marps/mission-core';
import type { BudgetBreakdownProps } from '@marps/ui';
import { localize } from '@marps/ui';
import { locale } from '../i18n';

export type BudgetView = Pick<BudgetBreakdownProps, 'availableLabel' | 'availableValue' | 'lines' | 'marginLabel' | 'margin'>;
export function formatBudgetMinutes(value: number): string {
  const format = new Intl.NumberFormat(locale(), value !== 0 && Math.abs(value) < 0.1
    ? { maximumSignificantDigits: 2 } : { maximumFractionDigits: 1 });
  return `${format.format(value || 0).replace('-', '−')} min`;
}

export function formatBudgetKilometres(value: number): string {
  return `${new Intl.NumberFormat(locale(), { maximumFractionDigits: 3 }).format(value)} km`;
}

/** Display shares split exploration and return; total walking is a separate summary. */
export function toBudgetView(budget: CalculatedMissionBudget): BudgetView {
  const share = (value: number) => budget.availableMinutes > 0 ? value / budget.availableMinutes : 0;
  return {
    availableLabel: 'Durée disponible', availableValue: formatBudgetMinutes(budget.availableMinutes),
    lines: [
      { id: 'walking', label: 'Marche d’exploration', value: formatBudgetMinutes(budget.explorationMinutes), share: share(budget.explorationMinutes), pattern: 'solid' },
      { id: 'activities', label: 'Observations et activités', value: formatBudgetMinutes(budget.activityMinutes), share: share(budget.activityMinutes), pattern: 'hatched' },
      { id: 'return', label: 'Retour au camp', value: formatBudgetMinutes(budget.returnMinutes), share: share(budget.returnMinutes), pattern: 'dotted' },
      { id: 'reserve', label: 'Réserve', value: formatBudgetMinutes(budget.reserveMinutes), share: share(budget.reserveMinutes), pattern: 'striped' },
    ],
    marginLabel: 'Marge après réserve',
    margin: {
      value: `${budget.marginMinutes > 0 ? '+' : ''}${formatBudgetMinutes(budget.marginMinutes)}`,
      status: budget.overBudget ? 'over' : 'within',
      message: budget.overBudget ? localize('Dépassement de {{v0}}', { v0: formatBudgetMinutes(-budget.marginMinutes) }) : localize('Budget respecté'),
    },
  };
}
