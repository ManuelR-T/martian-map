import { localize } from '@marps/ui';
import '../i18n';
import { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Alert, Button } from '@marps/ui';
import { radiationReturn, type Mission, type RadiationReturn } from '@marps/mission-core';
import { formatGroundDistance as distance } from '../format';
import type { RadiationAlertState } from '../state/planner';

const minutes = (seconds: number) => `${Math.ceil(seconds / 60)} min`;
const plural = (count: number) => localize("{{count}} activité", { count });
const link = (href: string, label: string) => <a className="underline" href={href} target="_blank" rel="noreferrer">{localize(label)}</a>;

/** Collapsed context: Jezero has no ionizing-radiation measurement, so the alert can only be an exercise. */
const WhySimulated = () => <details className="text-xs">
  <summary className="cursor-pointer py-2 font-semibold">{localize("Pourquoi c’est simulé")}</summary>
  <ul className="grid list-disc gap-1 pl-4">
    <li>{localize("Aucune mesure des radiations n’existe à Jezero. RAD, sur Curiosity, mesure au cratère Gale (")}{localize(link('https://www.nasa.gov/news-release/nasa-rover-results-include-first-age-measurement-on-mars-and-help-for-human-exploration/', 'NASA, 2013'))}{localize(").")}</li>
    <li>{localize("RAD y a relevé environ 210 micrograys par jour en 2012-2013, avec un seul événement de particules solaires, faible. Cette mesure décrit le lieu et ne donne la dose de personne (")}{localize(link('https://science.nasa.gov/resource/radiation-measurements-on-mars/', 'NASA'))}{localize(").")}</li>
    <li>{localize("MEDA RDS, sur Perseverance, mesure la lumière du Soleil et la poussière. Il ne mesure pas les radiations ionisantes (")}{localize(link('https://science.nasa.gov/resource/medas-radiation-and-dust-sensor/', 'NASA'))}{localize(").")}</li>
  </ul>
</details>;

/**
 * Simulated radiation alert, in the « En mission » view: the teammate in the habitat reads the order
 * and relays it by radio. The figures are frozen when the alert starts, as a real order would be.
 * The state lives in the planner state, so « À la base » and the helmet view keep the alert.
 */
export function RadiationAlert({ mission, state, onChange }: { mission: Mission; state: RadiationAlertState | null; onChange: (next: RadiationAlertState | null) => void }) {
  const alert = state?.missionId === mission.id ? state.alert : null;
  const setAlert = (next: RadiationReturn | null) => onChange(next && { missionId: mission.id, alert: next });
  const focusTarget = useRef<'alert' | 'trigger' | null>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (focusTarget.current === 'alert') alertRef.current?.focus();
    if (focusTarget.current === 'trigger') triggerRef.current?.focus();
    focusTarget.current = null;
  }, [alert]);
  const available = radiationReturn(mission);
  if (!available) return null;
  if (!alert) return <Button ref={triggerRef} variant="outline" onClick={() => { focusTarget.current = 'alert'; setAlert(available); }}>{localize("Simuler une alerte radiation")}</Button>;
  return <Alert ref={alertRef} tabIndex={-1} variant="destructive" role="alert" className="outline-none">
    <AlertTriangle aria-hidden />
    <div className="grid gap-2">
      <p className="text-xs font-semibold tracking-wide uppercase">{localize("Simulation · Alerte radiation")}</p>
      <p className="text-lg font-bold uppercase">{localize("Rentrer au camp maintenant")}</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-foreground">
        <dt className="font-semibold">{localize("Depuis")}</dt><dd>{localize("étape")} {localize(alert.fromIndex + 1)}{localize(",")} {localize(alert.fromStep.name)}</dd>
        <dt className="font-semibold">{localize("Retour")}</dt><dd>{localize(distance(alert.distanceMetres))} {localize("·")} {localize(minutes(alert.returnSeconds))}</dd>
        <dt className="font-semibold">{localize("Abandonnées")}</dt>
        <dd>{localize(alert.abandoned.length ? alert.abandoned.map(entry => `${entry.step.name} (${plural(entry.activities)})`).join(', ') : 'aucune')}</dd>
      </dl>
      <Button className="justify-self-start" variant="outline" onClick={() => { focusTarget.current = 'trigger'; setAlert(null); }}>{localize("Annuler la simulation")}</Button>
      <WhySimulated />
    </div>
  </Alert>;
}
