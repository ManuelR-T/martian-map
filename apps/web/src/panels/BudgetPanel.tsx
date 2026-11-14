import { BudgetBreakdown, DataState, Panel, type BudgetBreakdownProps } from '@marps/ui';
import { usePlannerState } from '../state/PlannerProvider';
import { selectCurrentMission } from '../state/planner';
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
  const state = usePlannerState();
  const mission = selectCurrentMission(state);
  return (
    <Panel
      title="Budget de temps"
      description="Marche, observations, retour et réserve"
      collapsible
      className={className}
      contentClassName="overflow-y-auto"
    >
      <PlanningGate loadingTitle="Chargement du budget" coverageTitle="Pas de budget hors du secteur détaillé">
        {(state.workspace === 'base' || state.runningMission) && <dl className="mb-3 grid gap-1 text-sm">
          <div><dt className="inline">Durée disponible : </dt><dd className="inline">{mission.parameters.availableSeconds / 60} min</dd></div>
          <div><dt className="inline">Vitesse prévue : </dt><dd className="inline">{mission.parameters.speedMetresPerSecond} m/s</dd></div>
          <div><dt className="inline">Réserve : </dt><dd className="inline">{mission.parameters.reserveSeconds / 60} min</dd></div>
        </dl>}
        {budget ? (
          <BudgetBreakdown {...budget} />
        ) : (
          <DataState
            kind="empty"
            title="Budget non calculé"
            description="Le budget s'affichera quand la mission aura un camp, au moins une étape et ses paramètres de durée."
          />
        )}
      </PlanningGate>
    </Panel>
  );
}
