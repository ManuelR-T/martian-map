import { DataState, Panel, StepList, StepListItem } from '@marps/ui';
import { formatCoordinate } from '../format';
import { usePlannerState } from '../state/PlannerProvider';
import { PlanningGate } from './PlanningGate';

export function StepsPanel({ className }: { className?: string }) {
  const { mission } = usePlannerState();

  return (
    <Panel
      title="Étapes"
      description="Dans l'ordre de visite"
      collapsible
      className={className}
      contentClassName="overflow-y-auto"
    >
      <PlanningGate loadingTitle="Chargement des étapes" coverageTitle="Pas d'étapes hors du secteur détaillé" offerRegion>
        {mission.steps.length === 0 ? (
          <DataState
            kind="empty"
            title="Aucune étape"
            description="La mission ne contient encore aucune étape. Elles s'afficheront ici dans l'ordre de visite."
          />
        ) : (
          <StepList label="Étapes de la mission">
            {mission.steps.map((step, index) => (
              <StepListItem
                key={step.id}
                position={index + 1}
                title={step.name}
                description={<span className="tabular-nums">{formatCoordinate(step.position)}</span>}
              />
            ))}
          </StepList>
        )}
      </PlanningGate>
    </Panel>
  );
}
