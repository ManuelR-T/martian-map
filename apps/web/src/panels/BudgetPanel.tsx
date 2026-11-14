import { CircleDashed } from 'lucide-react';
import { BudgetBreakdown, Panel, type BudgetBreakdownProps } from '@marps/ui';
import { PlanningGate } from './PlanningGate';

export type BudgetView = Pick<
  BudgetBreakdownProps,
  'availableLabel' | 'availableValue' | 'lines' | 'marginLabel' | 'margin'
>;

export interface BudgetPanelProps {
  className?: string;
  /**
   * Budget calculé par le moteur de mission (#14) et mis en forme pour
   * l'affichage. `null` tant qu'une entrée manque : le panneau ne calcule rien.
   */
  budget: BudgetView | null;
}

export function BudgetPanel({ className, budget }: BudgetPanelProps) {
  return (
    <Panel
      title="Budget de temps"
      description="Marche, observations, retour et réserve"
      collapsible
      className={className}
      contentClassName="overflow-y-auto"
    >
      <PlanningGate loadingTitle="Chargement du budget" coverageTitle="Pas de budget hors du secteur détaillé">
        {budget ? (
          <BudgetBreakdown {...budget} />
        ) : (
          // One line only: the empty budget must not push the site sheet below the fold on a 1280 × 800 screen.
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CircleDashed aria-hidden="true" className="size-4 shrink-0" />
            Budget non calculé : ajoutez un camp et une étape.
          </p>
        )}
      </PlanningGate>
    </Panel>
  );
}
