import { CircleDashed } from 'lucide-react';
import { BudgetBreakdown, Panel, type BudgetBreakdownProps } from '@marps/ui';
import { usePlannerState } from '../state/PlannerProvider';
import { selectCurrentMission } from '../state/planner';
import { PlanningGate } from './PlanningGate';

export type BudgetView = Pick<
  BudgetBreakdownProps,
  'availableLabel' | 'availableValue' | 'lines' | 'marginLabel' | 'margin'
>;

export interface BudgetPanelProps {
  className?: string;
  collapsible?: boolean;
  /**
   * Budget calculé par le moteur de mission (#14) et mis en forme pour
   * l'affichage. `null` tant qu'une entrée manque : le panneau ne calcule rien.
   */
  budget: BudgetView | null;
}

export function BudgetPanel({ className, budget, collapsible = true }: BudgetPanelProps) {
  const state = usePlannerState();
  const mission = selectCurrentMission(state);
  return (
    <Panel
      title="Budget de temps"
      description="Marche, observations, retour et réserve"
      collapsible={collapsible}
      floating
      className={className}
      contentClassName="overflow-y-auto"
    >
      <PlanningGate loadingTitle="Chargement du budget" coverageTitle="Pas de budget hors du secteur détaillé">
        {(state.workspace === 'base' || state.runningMission) && <details className="mb-3 border-b text-sm"><summary className="min-h-11 cursor-pointer py-3 font-semibold">Paramètres de la sortie</summary><dl className="mb-3 grid gap-1 text-sm">
          <div><dt className="inline">Durée disponible : </dt><dd className="inline">{mission.parameters.availableSeconds / 60} min</dd></div>
          <div><dt className="inline">Vitesse prévue : </dt><dd className="inline">{mission.parameters.speedMetresPerSecond} m/s</dd></div>
          <div><dt className="inline">Réserve : </dt><dd className="inline">{mission.parameters.reserveSeconds / 60} min</dd></div>
        </dl></details>}
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
