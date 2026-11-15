import { Button, DataState, StepList, StepListItem } from '@marps/ui';
import { ActivityEditor } from './MissionEditor';
import { formatCoordinate } from '../format';
import { usePlannerDispatch, usePlannerState } from '../state/PlannerProvider';
export function MissionStepsEditor() {
  const { mission } = usePlannerState();
  const dispatch = usePlannerDispatch();
  return <>
        {mission.steps.length === 0 ? (
          <DataState
            kind="empty"
            title="Aucune étape"
            description="La mission ne contient encore aucune étape. Elles s'afficheront ici dans l'ordre de visite."
          />
        ) : (
          <StepList label="Étapes de la mission">
            {mission.camp && <StepListItem kind="camp" title={mission.camp.name} description={formatCoordinate(mission.camp.position)} />}
            {mission.steps.map((step, index) => (
              <StepListItem
                key={step.id}
                position={index + 1}
                title={step.name}
                description={<><span className="tabular-nums">{formatCoordinate(step.position)}</span>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Button variant="outline" disabled={index === 0} aria-label={`Monter ${step.name}`} onClick={() => dispatch({ type: 'stepMoved', id: step.id, to: index - 1 })}>↑</Button>
                    <Button variant="outline" disabled={index === mission.steps.length - 1} aria-label={`Descendre ${step.name}`} onClick={() => dispatch({ type: 'stepMoved', id: step.id, to: index + 1 })}>↓</Button>
                    <Button variant="outline" onClick={() => dispatch({ type: 'stepRemoved', id: step.id })}>Supprimer</Button>
                  </div>
                  <ActivityEditor step={step} />
                </>}
              />
            ))}
            {mission.camp && <StepListItem kind="return" title={mission.camp.name} />}
          </StepList>
        )}
  </>;
}
