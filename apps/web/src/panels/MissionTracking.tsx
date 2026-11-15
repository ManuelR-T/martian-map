import { Button, DataState, StepList, StepListItem } from '@marps/ui';
import { usePlannerDispatch, usePlannerState } from '../state/PlannerProvider';
import { activityLabels } from './MissionEditor';
import { formatCoordinate } from '../format';

export function MissionTracking() {
  const { runningMission: mission, trackingStatus, trackingReady, trackingError } = usePlannerState();
  const dispatch = usePlannerDispatch();
  if (trackingError) return <DataState kind="error" title="Suivi local indisponible" description={trackingError} action={<Button onClick={() => dispatch({ type: 'trackingRequested' })}>Réessayer le chargement du suivi</Button>} />;
  if (!trackingReady) return <DataState kind="loading" title="Chargement du suivi" />;
  if (!mission) return <DataState kind="empty" title="Aucune sortie en cours" description="Préparez une mission à la base, puis démarrez une sortie."
    action={<Button onClick={() => dispatch({ type: 'workspaceChanged', workspace: 'base' })}>Aller à la base</Button>} />;
  const activities = mission.steps.flatMap(s => s.activities);
  return <div className="grid gap-3">
    <p className="font-semibold">{mission.name}</p>
    <p role="status" className="text-xs">{trackingStatus}</p>
    <p className="text-sm">{activities.filter(a => a.completed).length} / {activities.length} activités terminées</p>
    <StepList label="Parcours de la sortie en cours">
      {mission.camp && <StepListItem kind="camp" title={mission.camp.name} description={formatCoordinate(mission.camp.position)} />}
      {mission.steps.map((step, index) => <StepListItem key={step.id} position={index + 1} title={step.name}
        onSelect={step.siteId ? () => dispatch({ type: 'siteSelected', siteId: step.siteId }) : undefined}
        description={<div className="grid gap-1">
          <span>{formatCoordinate(step.position)}</span>
          {step.activities.length === 0 && <span>Aucune activité prévue.</span>}
          {step.activities.map(a => <label key={a.id} className="flex min-h-11 cursor-pointer items-center gap-2 border p-2">
            <input className="size-5 shrink-0 accent-primary" type="checkbox" checked={a.completed} onChange={() => dispatch({ type: 'activityToggled', stepId: step.id, activityId: a.id })} />
            <span className={a.completed ? 'line-through' : ''}>{activityLabels[a.type]} · {a.durationMinutes} min</span>
          </label>)}
        </div>} />)}
      {mission.camp && <StepListItem kind="return" title={mission.camp.name} />}
    </StepList>
  </div>;
}
