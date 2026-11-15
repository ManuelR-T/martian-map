import { DataState, Panel, ProvenanceBadge, StepList, StepListItem } from '@marps/ui';
import { formatCoordinate } from '../format';
import { usePlannerState } from '../state/PlannerProvider';
import { PlanningGate } from './PlanningGate';

export function StepsPanel({ className, collapsible = true }: { className?: string; collapsible?: boolean }) {
  const { mission } = usePlannerState();

  return (
    <Panel
      title="Étapes"
      collapsible={collapsible}
      floating
      className={className}
      contentClassName="overflow-y-auto"
    >
      <p className="mb-3 text-sm"><ProvenanceBadge status="simulated" /> Mission hypothétique</p>
      <PlanningGate loadingTitle="Chargement des étapes" coverageTitle="Pas d'étapes hors du secteur détaillé" offerRegion>
        {mission.steps.length === 0 ? (
          <DataState
            kind="empty"
            title="Aucune étape"
            description="Choisissez un site sur la fiche pour préparer votre sortie."
          />
        ) : (
          <StepList label="Étapes de la mission">
            {mission.steps.map((step, index) => (
              <StepListItem
                key={step.id}
                position={index + 1}
                title={step.name}
                description={<details><summary className="min-h-11 cursor-pointer py-2">Coordonnées</summary><span className="tabular-nums">{formatCoordinate(step.position)}</span></details>}
              />
            ))}
          </StepList>
        )}
      </PlanningGate>
    </Panel>
  );
}
