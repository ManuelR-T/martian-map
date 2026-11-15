import { BudgetBreakdown, DataState, Panel, ProvenanceBadge, type BudgetBreakdownProps } from '@marps/ui';
import { usePlannerState } from '../state/PlannerProvider';
import { selectMissionAssumptions } from '../state/planner';
import { MissionAssumptions } from './MissionAssumptions';
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
  return (
    <Panel
      title="Budget de temps"
      description="Marche, observations, retour et réserve"
      collapsible
      floating
      className={className}
      contentClassName="overflow-y-auto"
    >
      <p className="mb-3 text-sm"><ProvenanceBadge status={budget ? 'calculated' : 'unknown'} /> {budget ? 'Estimation selon les hypothèses de mission.' : 'Aucun budget disponible.'}</p>
      <PlanningGate loadingTitle="Chargement du budget" coverageTitle="Pas de budget hors du secteur détaillé">
        {budget ? (
          <BudgetBreakdown {...budget} />
        ) : (
          <DataState
            kind="empty"
            title="Budget non calculé"
            description="Le budget s'affichera quand la mission aura un camp, au moins une étape et ses paramètres de durée."
          />
        )}
        <MissionAssumptions assumptions={selectMissionAssumptions(state)} />
      </PlanningGate>
    </Panel>
  );
}
