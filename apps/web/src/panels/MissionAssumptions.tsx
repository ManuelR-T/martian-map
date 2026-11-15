import { ProvenanceBadge } from '@marps/ui';
import type { selectMissionAssumptions } from '../state/planner';

export function MissionAssumptions({ assumptions }: { assumptions: ReturnType<typeof selectMissionAssumptions> }) {
  const parameters = [
    ['Vitesse (km/h)', assumptions.speedKilometresPerHour],
    ['Durée de sortie (min)', assumptions.outingMinutes],
    ['Réserve (min)', assumptions.reserveMinutes],
    ['Seuil de pente (°)', assumptions.slopeLimitDegrees],
  ] as const;

  return (
    <details className="border-t py-2 text-sm">
      <summary className="min-h-11 cursor-pointer py-2 font-semibold">Hypothèses de mission</summary>
      <dl className="space-y-2 py-2">
        {parameters.map(([label, value]) => (
          <div key={label} className="flex flex-wrap items-center justify-between gap-2">
            <dt>{label}</dt>
            <dd><ProvenanceBadge status={value === null ? 'unknown' : 'simulated'} /> {value ?? 'Non renseigné'}</dd>
          </div>
        ))}
      </dl>
      <p>Aucun budget de mission disponible tant que ces entrées manquent.</p>
      {assumptions.stops.length > 0 && (
        <div className="mt-3 space-y-2">
          <p><ProvenanceBadge status="simulated" /> Durées d’observation choisies par l’équipe :</p>
          <ul className="list-disc space-y-1 pl-5">
            {assumptions.stops.map((stop) => <li key={stop.siteId}>{stop.name} : {stop.allottedMinutes} min allouées ; {stop.tasks.reduce((sum, task) => sum + task.minutes, 0)} min de tâches prévues.</li>)}
          </ul>
          <p>Ces durées ne sont pas des mesures NASA de travail humain sur Mars. La procédure s’inspire d’Apollo ; les tâches et leur durée sont des choix du scénario.</p>
        </div>
      )}
    </details>
  );
}
