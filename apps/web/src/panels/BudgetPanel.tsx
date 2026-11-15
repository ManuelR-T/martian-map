import { ReturnLimitSummary } from './ReturnLimitSummary';
import { MissionEvents } from './MissionEvents';
import { OxygenBudget } from './OxygenBudget';
import { CircleDashed } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { calculateMissionBudget } from '@marps/mission-core';
import { BudgetBreakdown, DataState, Panel } from '@marps/ui';
import { usePlannerState } from '../state/PlannerProvider';
import { PlanningGate } from './PlanningGate';
import { formatBudgetKilometres, formatBudgetMinutes, toBudgetView } from './budgetView';
import { localize } from '@marps/ui';

export interface BudgetPanelProps {
  className?: string;
  collapsible?: boolean;
}

export function BudgetPanel({ className, collapsible = true }: BudgetPanelProps) {
  useTranslation();
  const state = usePlannerState();
  const mission = state.workspace === 'base' ? state.mission : state.runningMission;
  const budget = state.workspace === 'base' && !state.parameterDraftValid
    ? { status: 'invalid-inputs' } as const : calculateMissionBudget(mission);
  return (
    <Panel
      title={localize('Budget de temps')}
      description={localize('Marche, observations, retour et réserve')}
      collapsible={collapsible}
      floating
      className={className}
    >
      <PlanningGate loadingTitle="Chargement du budget" coverageTitle="Pas de budget hors du secteur détaillé">
        <ReturnLimitSummary />
        {mission && <details className="mb-3 border-b text-sm"><summary className="min-h-11 cursor-pointer py-3 font-semibold">{localize('Paramètres de la sortie')}</summary><dl className="mb-3 grid gap-1 text-sm">
          <div><dt className="inline">{localize('Durée disponible :')} </dt><dd className="inline">{formatBudgetMinutes(mission.parameters.availableSeconds / 60)}</dd></div>
          <div><dt className="inline">{localize('Vitesse prévue :')} </dt><dd className="inline">{localize(mission.parameters.speedMetresPerSecond)} m/s</dd></div>
          <div><dt className="inline">{localize('Réserve :')} </dt><dd className="inline">{formatBudgetMinutes(mission.parameters.reserveSeconds / 60)}</dd></div>
        </dl></details>}
        {budget.status === 'ready' ? <div className="grid gap-3">
          {!!mission?.events?.length && <p className="text-xs font-semibold">{localize('Budget simulé : événements actifs.')}</p>}
          <BudgetBreakdown {...toBudgetView(budget)} />
          <p className="text-sm">{localize('Durée prévue hors réserve :')} <strong>{formatBudgetMinutes(budget.missionMinutes)}</strong><br />
            {localize('Marche totale (retour compris) :')} <strong>{formatBudgetMinutes(budget.walkingMinutes)}</strong><br />
            {localize('Distance totale :')} {formatBudgetKilometres(budget.distances.total.kilometres)} · {localize('Retour :')} {formatBudgetKilometres(budget.distances.return.kilometres)}</p>
          <p className="text-xs text-muted-foreground">{localize('Budget du plan complet : cocher une activité ne mesure pas le temps écoulé. Distances horizontales estimées et durées de scénario ; ce budget ne garantit pas un retour sûr.')}</p>
        </div> : budget.status === 'invalid-inputs' ? (
          <DataState kind="error" title={localize('Budget non calculable')} description={localize('Vérifiez les paramètres et les activités : durées finies positives ou nulles, vitesse strictement positive et réserve inférieure ou égale à la durée disponible.')} />
        ) : (
          // One line only: the empty budget must not push the site sheet below the fold on a 1280 × 800 screen.
          <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
            <CircleDashed aria-hidden="true" className="size-4 shrink-0" />
            {budget.missing.includes('mission') ? localize('Aucune sortie en cours : préparez puis démarrez une mission.')
              : budget.missing.length === 2 ? localize('Budget non calculé : ajoutez un camp et au moins une étape.')
                : budget.missing.includes('camp') ? localize('Budget non calculé : ajoutez un camp.') : localize('Budget non calculé : ajoutez au moins une étape.')}
          </p>
        )}
        <MissionEvents />
        <OxygenBudget />
      </PlanningGate>
    </Panel>
  );
}
