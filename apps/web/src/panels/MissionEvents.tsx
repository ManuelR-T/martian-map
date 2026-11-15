import { useTranslation } from 'react-i18next';
import { Button, localize } from '@marps/ui';
import { calculateMissionBudget, type MissionEvent } from '@marps/mission-core';
import { usePlannerDispatch, usePlannerState } from '../state/PlannerProvider';

export function MissionEvents() {
  const { i18n } = useTranslation();
  const state = usePlannerState();
  const dispatch = usePlannerDispatch();
  const mission = state.workspace === 'base' ? state.mission : state.runningMission;
  if (!mission?.camp || !mission.steps.length) return null;
  const activities = mission.steps.flatMap(s => s.activities.map(a => ({ stepId: s.id, activityId: a.id, name: `${s.name} · ${localize(a.type === 'sampling' ? 'Prélèvement' : a.type === 'photo' ? 'Photo' : 'Observation')}` })));
  const legNames = [...mission.steps.map(s => localize('Vers : {{v0}}', { v0: s.name })), localize('Retour au camp')];
  const add = (event: MissionEvent) => dispatch({ type: 'eventAdded', event });
  const events = mission.events ?? [];
  const baseline = calculateMissionBudget({ ...mission, events: undefined });
  const current = calculateMissionBudget(mission);
  const minutes = (n: number) => `${n.toLocaleString(i18n.language, { maximumFractionDigits: 1 })} min`;
  return <section className="mt-4 grid gap-3 border-t pt-3" aria-label={localize('Événements simulés')}>
    <h3 className="font-semibold">{localize('Événements simulés')}</h3>
    <p className="text-xs text-muted-foreground">{localize('Hypothèses pédagogiques, sans observation météo. Les retards s’additionnent ; les facteurs de vitesse se multiplient. Chaque événement reste actif sur toute sa cible jusqu’à annulation, activités cochées comprises.')}</p>
    {events.length > 0 && baseline.status === 'ready' && current.status === 'ready' && <p role="status" className="border bg-muted/40 p-3 text-sm">{localize('Conséquence simulée :')} +{minutes(current.missionMinutes - baseline.missionMinutes)} · {localize('Marge sans événement :')} {minutes(baseline.marginMinutes)} · {localize('Marge simulée :')} {minutes(current.marginMinutes)}</p>}
    <ul className="grid gap-2">{events.map(e => <li key={e.id} className="grid gap-1 border p-2 text-sm">
      <p className="font-semibold">{localize('Simulé')} · {e.kind === 'activity-delay' ? <>{localize('Retard d’activité')} +{minutes(e.delayMinutes)} · {activities.find(a => a.stepId === e.stepId && a.activityId === e.activityId)?.name}</> : <>{localize('Visibilité réduite')} · ×{e.speedFactor.toLocaleString(i18n.language)} · {e.legIndices.map(i => legNames[i]).join(', ')}</>}</p>
      <Button type="button" variant="outline" onClick={() => dispatch({ type: 'eventRemoved', id: e.id })}>{localize('Annuler cet événement')}</Button>
    </li>)}</ul>
    {events.length > 0 && <Button type="button" variant="outline" onClick={() => dispatch({ type: 'eventsCleared' })}>{localize('Annuler tous les événements')}</Button>}
    <details><summary className="min-h-11 cursor-pointer font-semibold">{localize('Simuler un événement')}</summary>
      {activities.length > 0 && <form className="grid gap-2 border-b py-3" onSubmit={e => {
        e.preventDefault();
        if (!e.currentTarget.reportValidity()) return;
        const data = new FormData(e.currentTarget);
        const target = activities[Number(data.get('activity'))];
        const delayMinutes = Number(data.get('delay'));
        if (target && Number.isFinite(delayMinutes) && delayMinutes > 0) add({ id: crypto.randomUUID(), simulated: true, kind: 'activity-delay', stepId: target.stepId, activityId: target.activityId, delayMinutes });
      }}>
        <label className="grid gap-1 text-sm">{localize('Activité concernée')}<select name="activity" className="min-h-11 border bg-background px-2">{activities.map((a, i) => <option key={`${a.stepId}/${a.activityId}`} value={i}>{a.name}</option>)}</select></label>
        <label className="grid gap-1 text-sm">{localize('Retard ajouté (min)')}<input name="delay" type="number" min="0.1" step="any" required defaultValue="10" className="min-h-11 w-full border bg-background px-2" /></label>
        <Button type="submit" variant="outline">{localize('Simuler un retard')}</Button>
      </form>}
      <form className="grid gap-2 py-3" onSubmit={e => {
        e.preventDefault();
        if (!e.currentTarget.reportValidity()) return;
        const data = new FormData(e.currentTarget);
        const legIndices = data.getAll('leg').map(Number);
        const speedFactor = Number(data.get('factor'));
        if (legIndices.length && Number.isFinite(speedFactor) && speedFactor > 0 && speedFactor <= 1) add({ id: crypto.randomUUID(), simulated: true, kind: 'visibility', legIndices, speedFactor });
      }}>
        <fieldset onChange={e => {
          const field = e.currentTarget.querySelector<HTMLInputElement>('input');
          field?.setCustomValidity(e.currentTarget.querySelector('input:checked') ? '' : localize('Choisissez au moins une portion.'));
        }}><legend className="text-sm font-semibold">{localize('Portions de marche concernées')}</legend>{legNames.map((name, i) => <label key={i} className="flex min-h-11 items-center gap-2 text-sm"><input name="leg" type="checkbox" value={i} defaultChecked />{name}</label>)}</fieldset>
        <label className="grid gap-1 text-sm">{localize('Facteur de vitesse (0 < facteur ≤ 1)')}<input name="factor" type="number" min="0.01" max="1" step="any" required defaultValue="0.5" className="min-h-11 w-full border bg-background px-2" /></label>
        <p className="text-xs text-muted-foreground">{localize('À 0,5, la vitesse est divisée par deux. Les détours des portions choisies sont inclus. Le retour radiatif direct utilise le facteur de la portion de retour au camp.')}</p>
        <Button type="submit" variant="outline">{localize('Simuler une visibilité réduite')}</Button>
      </form>
    </details>
  </section>;
}
