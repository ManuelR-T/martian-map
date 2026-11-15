import { CircleDashed } from 'lucide-react';
import { calculateMissionBudget } from '@marps/mission-core';
import { BudgetBreakdown, DataState, Panel } from '@marps/ui';
import { usePlannerState } from '../state/PlannerProvider';
import { PlanningGate } from './PlanningGate';
import { formatBudgetKilometres, formatBudgetMinutes, toBudgetView } from './budgetView';

export interface BudgetPanelProps {
  className?: string;
  collapsible?: boolean;
}

export function BudgetPanel({ className, collapsible = true }: BudgetPanelProps) {
  const state = usePlannerState();
  const mission = state.workspace === 'base' ? state.mission : state.runningMission;
  const budget = state.workspace === 'base' && !state.parameterDraftValid
    ? { status: 'invalid-inputs' } as const : calculateMissionBudget(mission);
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
        {mission && <details className="mb-3 border-b text-sm"><summary className="min-h-11 cursor-pointer py-3 font-semibold">Paramètres de la sortie</summary><dl className="mb-3 grid gap-1 text-sm">
          <div><dt className="inline">Durée disponible : </dt><dd className="inline">{mission.parameters.availableSeconds / 60} min</dd></div>
          <div><dt className="inline">Vitesse prévue : </dt><dd className="inline">{mission.parameters.speedMetresPerSecond} m/s</dd></div>
          <div><dt className="inline">Réserve : </dt><dd className="inline">{mission.parameters.reserveSeconds / 60} min</dd></div>
        </dl></details>}
        {budget.status === 'ready' ? <div className="grid gap-3">
          <BudgetBreakdown {...toBudgetView(budget)} />
          <p className="text-sm">Durée prévue hors réserve : <strong>{formatBudgetMinutes(budget.missionMinutes)}</strong><br />
            Marche totale (retour compris) : <strong>{formatBudgetMinutes(budget.walkingMinutes)}</strong><br />
            Distance totale : {formatBudgetKilometres(budget.distances.total.kilometres)} · Retour : {formatBudgetKilometres(budget.distances.return.kilometres)}</p>
          <p className="text-xs text-muted-foreground">Budget du plan complet : cocher une activité ne mesure pas le temps écoulé. Distances horizontales estimées et durées de scénario ; ce budget ne garantit pas un retour sûr.</p>
        </div> : budget.status === 'invalid-inputs' ? (
          <DataState kind="error" title="Budget non calculable" description="Vérifiez les paramètres et les activités : durées finies positives ou nulles, vitesse strictement positive et réserve inférieure ou égale à la durée disponible." />
        ) : (
          // One line only: the empty budget must not push the site sheet below the fold on a 1280 × 800 screen.
          <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
            <CircleDashed aria-hidden="true" className="size-4 shrink-0" />
            {budget.missing.includes('mission') ? 'Aucune sortie en cours : préparez puis démarrez une mission.'
              : `Budget non calculé : ajoutez ${budget.missing.map(input => input === 'camp' ? 'un camp' : 'au moins une étape').join(' et ')}.`}
          </p>
        )}
      </PlanningGate>
    </Panel>
  );
}
