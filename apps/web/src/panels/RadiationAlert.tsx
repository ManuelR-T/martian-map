import { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Alert, Button } from '@marps/ui';
import { radiationReturn, type Mission, type RadiationReturn } from '@marps/mission-core';

// Jezero returns are a few hundred metres: kilometres rounded to 0,1 would hide them.
const distance = (metres: number) => metres < 1000 ? `${Math.round(metres)} m` : `${(metres / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km`;
const minutes = (seconds: number) => `${Math.ceil(seconds / 60)} min`;
const plural = (n: number) => `${n} activité${n > 1 ? 's' : ''}`;
const link = (href: string, label: string) => <a className="underline" href={href} target="_blank" rel="noreferrer">{label}</a>;

/** Collapsed context: Jezero has no ionizing-radiation measurement, so the alert can only be an exercise. */
const WhySimulated = () => <details className="text-xs">
  <summary className="cursor-pointer py-2 font-semibold">Pourquoi c’est simulé</summary>
  <ul className="grid list-disc gap-1 pl-4">
    <li>Aucune mesure des radiations n’existe à Jezero. RAD, sur Curiosity, mesure au cratère Gale ({link('https://www.nasa.gov/news-release/nasa-rover-results-include-first-age-measurement-on-mars-and-help-for-human-exploration/', 'NASA, 2013')}).</li>
    <li>RAD y a relevé environ 210 micrograys par jour en 2012-2013, avec un seul événement de particules solaires, faible. Cette mesure décrit le lieu et ne donne la dose de personne ({link('https://science.nasa.gov/resource/radiation-measurements-on-mars/', 'NASA')}).</li>
    <li>MEDA RDS, sur Perseverance, mesure la lumière du Soleil et la poussière. Il ne mesure pas les radiations ionisantes ({link('https://science.nasa.gov/resource/medas-radiation-and-dust-sensor/', 'NASA')}).</li>
  </ul>
</details>;

export interface RadiationAlertState { readonly missionId: string; readonly alert: RadiationReturn }

/**
 * Simulated radiation alert, in the « En mission » view: the teammate in the habitat reads the order
 * and relays it by radio. The figures are frozen when the alert starts, as a real order would be.
 * The state lives in `StepsPanel`, which stays mounted, so switching to « À la base » keeps the alert.
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
  if (!alert) return <Button ref={triggerRef} variant="outline" onClick={() => { focusTarget.current = 'alert'; setAlert(available); }}>Simuler une alerte radiation</Button>;
  return <Alert ref={alertRef} tabIndex={-1} variant="destructive" role="alert" className="outline-none">
    <AlertTriangle aria-hidden />
    <div className="grid gap-2">
      <p className="text-xs font-semibold tracking-wide uppercase">Simulation · Alerte radiation</p>
      <p className="text-lg font-bold uppercase">Rentrer au camp maintenant</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-foreground">
        <dt className="font-semibold">Depuis</dt><dd>étape {alert.fromIndex + 1}, {alert.fromStep.name}</dd>
        <dt className="font-semibold">Retour</dt><dd>{distance(alert.distanceMetres)} · {minutes(alert.returnSeconds)}</dd>
        <dt className="font-semibold">Abandonnées</dt>
        <dd>{alert.abandoned.length ? alert.abandoned.map(entry => `${entry.step.name} (${plural(entry.activities)})`).join(', ') : 'aucune'}</dd>
      </dl>
      <Button className="justify-self-start" variant="outline" onClick={() => { focusTarget.current = 'trigger'; setAlert(null); }}>Annuler la simulation</Button>
      <WhySimulated />
    </div>
  </Alert>;
}
