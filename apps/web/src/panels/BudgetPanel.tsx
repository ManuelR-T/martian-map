import { BudgetBreakdown, DataState, Panel, type BudgetBreakdownProps } from '@marps/ui';
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
      floating
      className={className}
      contentClassName="overflow-y-auto"
    >
      <p className="mb-3 text-sm">{budget ? 'Calculé · Estimation selon les hypothèses de mission.' : 'Inconnu · Aucun budget disponible.'}</p>
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
      </PlanningGate>
    </Panel>
  );
}
