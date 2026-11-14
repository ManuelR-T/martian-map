import { calculateBudget } from '@marps/mission-core';
import {
  BudgetBreakdown,
  DataState,
  Panel,
  type BudgetBreakdownProps,
} from '@marps/ui';
import { usePlannerState } from '../state/PlannerProvider';
import { PlanningGate } from './PlanningGate';
export type BudgetView = Pick<
  BudgetBreakdownProps,
  'availableLabel' | 'availableValue' | 'lines' | 'marginLabel' | 'margin'
>;
export interface BudgetPanelProps {
  className?: string;
  budget?: BudgetView | null;
}
const minutes = (seconds: number) =>
  `${(seconds / 60).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} min`;
export function BudgetPanel({ className, budget }: BudgetPanelProps) {
  const { mission } = usePlannerState();
  const b = calculateBudget(mission);
  const available = mission.parameters.availableSeconds;
  const view: BudgetView | null =
    budget ??
    (b
      ? {
          availableLabel: 'Disponible (réserve incluse)',
          availableValue: minutes(available),
          marginLabel: 'Marge après réserve',
          margin: {
            value: minutes(b.marginSeconds),
            status: b.marginSeconds < 0 ? 'over' : 'within',
            message:
              b.marginSeconds < 0 ? 'Dépassement du budget' : 'Budget respecté',
          },
          lines: [
            {
              id: 'walk',
              label: 'Marche d’exploration',
              value: minutes(b.walkingSeconds - b.returnSeconds),
              share: available
                ? (b.walkingSeconds - b.returnSeconds) / available
                : 0,
              pattern: 'solid',
            },
            {
              id: 'return',
              label: 'Retour au camp',
              value: minutes(b.returnSeconds),
              share: available ? b.returnSeconds / available : 0,
              pattern: 'hatched',
            },
            {
              id: 'activities',
              label: 'Activités (retards inclus)',
              value: minutes(b.activitySeconds),
              share: available ? b.activitySeconds / available : 0,
              pattern: 'dotted',
            },
            {
              id: 'reserve',
              label: 'Réserve',
              value: minutes(mission.parameters.reserveSeconds),
              share: available
                ? mission.parameters.reserveSeconds / available
                : 0,
              pattern: 'crossed',
            },
          ],
        }
      : null);
  return (
    <Panel
      title="Budget de temps"
      description="Simulation · retour inclus une seule fois"
      collapsible
      className={className}
      contentClassName="overflow-y-auto"
    >
      <PlanningGate
        loadingTitle="Chargement du budget"
        coverageTitle="Pas de budget hors Jezero"
      >
        {view ? (
          <>
            <BudgetBreakdown {...view} />
            {b && (
              <p className="mt-2 text-sm">
                Distance horizontale : {b.totalKilometres.toFixed(3)} km, dont
                retour {(b.returnMetres / 1000).toFixed(3)} km.
              </p>
            )}
          </>
        ) : (
          <DataState
            kind="empty"
            title="Budget non calculé"
            description="Placez le camp et ajoutez au moins une étape."
          />
        )}
        <p className="mt-2 text-sm text-muted-foreground">
          Disponible − marche aller/retour − activités − réserve. Hypothèses
          simulées ; ce budget ne garantit pas un retour sûr.
        </p>
      </PlanningGate>
    </Panel>
  );
}
