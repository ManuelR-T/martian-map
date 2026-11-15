import { localize } from '@marps/ui';
import '../i18n';
import { Button, DataState, StepList, StepListItem } from '@marps/ui';
import { usePlannerDispatch, usePlannerState } from '../state/PlannerProvider';
import { activityLabels } from './MissionEditor';
import { formatCoordinate } from '../format';
import { confirmAction } from '../confirm';
import { ScanEye } from 'lucide-react';
import { HELMET_HASH } from '../helmet/helmetRoute';

export function MissionTracking() {
  const { runningMission: mission, trackingStatus, trackingReady, trackingError } = usePlannerState();
  const dispatch = usePlannerDispatch();
  if (trackingError) return <DataState kind="error" title={localize("Suivi local indisponible")} description={localize(trackingError)} action={<Button onClick={() => dispatch({ type: 'trackingRequested' })}>{localize("Réessayer le chargement du suivi")}</Button>} />;
  if (!trackingReady) return <DataState kind="loading" title={localize("Chargement du suivi")} />;
  if (!mission) return <DataState kind="empty" title={localize("Aucune sortie en cours")} description={localize("Préparez une mission à la base, puis démarrez une sortie.")}
    action={<Button onClick={() => dispatch({ type: 'workspaceChanged', workspace: 'base' })}>{localize("Aller à la base")}</Button>} />;
  const activities = mission.steps.flatMap(s => s.activities);
  return <div className="grid gap-3">
    <p className="font-semibold">{localize(mission.name)}</p>
    <p role="status" className="text-xs">{localize(trackingStatus)}</p>
    <p className="text-sm">{localize(activities.filter(a => a.completed).length)} {localize("/")} {localize(activities.length)} {localize("activités terminées")}</p>
    <Button asChild variant="outline"><a href={HELMET_HASH}><ScanEye aria-hidden="true" />{localize("Vue casque")}</a></Button>
    <StepList label={localize("Parcours de la sortie en cours")}>
      {mission.camp && <StepListItem kind="camp" title={mission.camp.name} description={formatCoordinate(mission.camp.position)} />}
      {mission.steps.map((step, index) => <StepListItem key={step.id} position={index + 1} title={step.name}
        onSelect={step.siteId ? () => dispatch({ type: 'siteSelected', siteId: step.siteId }) : undefined}
        description={<div className="grid gap-1">
          <span>{formatCoordinate(step.position)}</span>
          {step.activities.length === 0 && <span>{localize("Aucune activité prévue.")}</span>}
          {step.activities.map(a => <label key={a.id} className="flex min-h-11 cursor-pointer items-center gap-2 border p-2">
            <input className="size-5 shrink-0 accent-primary" type="checkbox" checked={a.completed} onChange={() => dispatch({ type: 'activityToggled', stepId: step.id, activityId: a.id })} />
            <span className={a.completed ? 'line-through' : ''}>{localize(activityLabels[a.type])} {localize("·")} {localize(a.durationMinutes)} {localize("min")}</span>
          </label>)}
        </div>} />)}
      {mission.camp && <StepListItem kind="return" title={mission.camp.name} />}
    </StepList>
    <Button variant="outline" onClick={async () => {
      const pending = activities.filter(a => !a.completed).length;
      if (pending && !await confirmAction(localize("Terminer la sortie ? Il reste {{count}} activité non cochée.", { count: pending }), { confirmLabel: localize("Terminer la sortie") })) return;
      dispatch({ type: 'missionEnded' });
    }}>{localize("Terminer la sortie")}</Button>
  </div>;
}
