import { useState, type ReactNode } from 'react';
import {
  calculateBudget,
  calculateOxygen,
  routeSegments,
  type MissionParameters,
} from '@marps/mission-core';
import { usePlannerState } from '../state/PlannerProvider';

const activityNames = {
  photo: 'Photo',
  observation: 'Observation',
  sampling: 'Prélèvement',
};
const inputClass =
  'w-full border border-input bg-background p-2 text-foreground';
export function NumericField({
  label,
  value,
  onChange,
  min = 0,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
}) {
  const [invalid, setInvalid] = useState(false);
  return (
    <label className="grid gap-1 text-sm">
      {label}
      <input
        className={inputClass}
        type="number"
        step="any"
        min={min}
        required
        defaultValue={value}
        key={value}
        aria-invalid={invalid}
        onBlur={(e) => {
          const n = e.currentTarget.valueAsNumber;
          e.currentTarget.value = String(value);
          if (!Number.isFinite(n) || n < min || n > 1e9) {
            setInvalid(true);
            return;
          }
          setInvalid(false);
          onChange(n);
        }}
      />
      {invalid && (
        <span role="alert" className="text-danger">
          Saisissez un nombre entre {min} et 10⁹. La valeur précédente est
          conservée.
        </span>
      )}
    </label>
  );
}
export function OxygenEditor({
  onParameters,
}: {
  onParameters: (p: MissionParameters) => void;
}) {
  const { mission: m } = usePlannerState();
  const o = m.parameters.oxygen;
  const result = calculateOxygen(m);
  const fields = {
    stockGrams: 'Stock initial (g)',
    reserveGrams: 'Réserve protégée (g)',
    loadKg: 'Charge portée (kg)',
    referenceGramsPerMinute: 'Débit de référence (g/min)',
    restingGramsPerMinute: 'Débit des activités à l’arrêt (g/min)',
    referenceSpeedKmh: 'Vitesse de référence (km/h)',
    speedCoefficient: 'Coefficient vitesse (sans unité)',
    uphillCoefficient: 'Coefficient montée (par unité de pente)',
    downhillCoefficient: 'Coefficient descente (par unité de pente)',
    loadCoefficient: 'Coefficient charge (par kg)',
  };
  return (
    <details open>
      <summary>Estimation O₂ optionnelle · simulée</summary>
      <div className="grid gap-2 py-2">
        <label>
          <input
            type="checkbox"
            checked={o.enabled}
            onChange={(e) =>
              onParameters({
                ...m.parameters,
                oxygen: { ...o, enabled: e.target.checked },
              })
            }
          />{' '}
          Activer l’estimation O₂
        </label>
        <label>
          <input
            type="checkbox"
            checked={o.flatTerrain}
            onChange={(e) =>
              onParameters({
                ...m.parameters,
                oxygen: { ...o, flatTerrain: e.target.checked },
              })
            }
          />{' '}
          J’active l’hypothèse simulée de terrain plat
        </label>
        {o.enabled && (
          <>
            {Object.entries(fields).map(([key, label]) => (
              <NumericField
                key={key}
                label={`${label} · simulé`}
                value={o[key as keyof typeof fields]}
                onChange={(n) =>
                  onParameters({ ...m.parameters, oxygen: { ...o, [key]: n } })
                }
              />
            ))}
            {result.status === 'ready' ? (
              <p role={result.marginGrams < 0 ? 'alert' : 'status'}>
                Besoin : {result.totalGrams.toFixed(1)} g · restant :{' '}
                {result.remainingGrams.toFixed(1)} g · marge après réserve :{' '}
                {result.marginGrams.toFixed(1)} g.{' '}
                {result.marginGrams < 0
                  ? '⚠ Stock insuffisant après réserve.'
                  : ''}
              </p>
            ) : result.status === 'unavailable' ? (
              <p role="status">{result.reason}</p>
            ) : null}
          </>
        )}
        {result.status === 'ready' && (
          <ul>
            {result.consumption.map((c, i) => (
              <li key={c.id}>
                {i < routeSegments(m).length
                  ? routeSegments(m)[i]?.returning
                    ? 'Retour'
                    : `Marche ${i + 1}`
                  : `Activité ${i - routeSegments(m).length + 1}`}{' '}
                : {c.grams.toFixed(1)} g ({c.rate.toFixed(2)} g/min)
              </li>
            ))}
          </ul>
        )}
        <p>
          Modèle simulated-multiplicative-v1. Débit = référence × [1 + cᵥ(v/vᵣ −
          1)²] × [1 + c₊ max(pente,0) + c₋ max(−pente,0)] × [1 + cₘ charge].
          Consommation = Σ débit (g/min) × durée (min).
        </p>
        <p>
          Pente signée montée/distance horizontale, domaine ±100 %. Activités
          successives à débit distinct. Coefficients non calibrés, bilan par
          équipier ; pertes et fuites exclues.
        </p>
      </div>
    </details>
  );
}
export function PrintMission() {
  const state = usePlannerState();
  const m = state.mission;
  const b = calculateBudget(m);
  const o = calculateOxygen(m);
  const item = (label: string, value: ReactNode) => (
    <p>
      {label} : {value}
    </p>
  );
  return (
    <article className="print-mission">
      <h1>{m.name} — mission simulée</h1>
      {item('Région', m.regionId)}
      {m.objective && item('Objectif scientifique', m.objective)}
      {item(
        'Camp fictif',
        m.camp ? `${m.camp.latitude}° N, ${m.camp.longitude}° E` : 'Absent',
      )}
      <p>Parcours : camp → {m.steps.map((s) => s.name).join(' → ')} → camp.</p>
      <ol>
        {m.steps.map((s) => (
          <li key={s.id}>
            {s.name} ({s.position.latitude}°, {s.position.longitude}°) :{' '}
            {s.activities
              .map(
                (a) => `${activityNames[a.type]} ${a.durationSeconds / 60} min`,
              )
              .join(', ') || 'Passage sans activité'}
          </li>
        ))}
      </ol>
      {b ? (
        <>
          <p>
            Distance horizontale : {b.totalKilometres.toFixed(3)} km. Marche :{' '}
            {(b.walkingSeconds / 60).toFixed(1)} min, dont retour :{' '}
            {(b.returnSeconds / 60).toFixed(1)} min. Activités :{' '}
            {(b.activitySeconds / 60).toFixed(1)} min.
          </p>
          <p>
            Disponible : {m.parameters.availableSeconds / 60} min. Réserve :{' '}
            {m.parameters.reserveSeconds / 60} min. Marge :{' '}
            {(b.marginSeconds / 60).toFixed(1)} min.{' '}
            {b.marginSeconds < 0 ? 'DÉPASSEMENT' : 'Budget respecté'}
          </p>
        </>
      ) : (
        <p>Budget indisponible : camp ou étape absent.</p>
      )}
      <p>Événements simulés (inclus dans les résultats ci-dessus) :</p>
      <ul>
        {m.events.map((e) => (
          <li key={e.id}>
            {e.type === 'delay'
              ? `Retard de ${e.seconds / 60} min sur ${m.steps.find((s) => s.activities.some((a) => a.id === e.activityId))?.name ?? 'activité absente'}`
              : `Visibilité réduite : durée ×${e.factor} sur ${e.segmentIds.length} portion(s), ${e.segmentIds.some((id) => routeSegments(m).find((s) => s.id === id)?.returning) ? 'retour inclus' : 'hors retour'}`}
          </li>
        ))}
      </ul>
      <p>
        O₂ :{' '}
        {o.status === 'ready'
          ? `besoin ${o.totalGrams.toFixed(1)} g, marge ${o.marginGrams.toFixed(1)} g — terrain plat simulé`
          : o.status === 'unavailable'
            ? o.reason
            : 'désactivé'}
      </p>
      {m.parameters.oxygen.enabled && (
        <p>
          O₂ simulé — modèle simulated-multiplicative-v1 ; stock{' '}
          {m.parameters.oxygen.stockGrams} g, réserve{' '}
          {m.parameters.oxygen.reserveGrams} g, charge{' '}
          {m.parameters.oxygen.loadKg} kg. Débit de référence{' '}
          {m.parameters.oxygen.referenceGramsPerMinute} g/min à{' '}
          {m.parameters.oxygen.referenceSpeedKmh} km/h ; activités{' '}
          {m.parameters.oxygen.restingGramsPerMinute} g/min. Coefficients
          vitesse / montée / descente / charge :{' '}
          {m.parameters.oxygen.speedCoefficient} /{' '}
          {m.parameters.oxygen.uphillCoefficient} /{' '}
          {m.parameters.oxygen.downhillCoefficient} /{' '}
          {m.parameters.oxygen.loadCoefficient}.
        </p>
      )}
      <p>Hypothèses : {m.assumptions.join(' ')}</p>
      <p>
        Rayon Mars 2000 : {m.radiusMetres} m. Vitesse simulée :{' '}
        {m.parameters.speedKmh} km/h.
      </p>
      <p>
        Avertissement : carte et profil non intégrés ; aucune couche déclarée
        chargée.{' '}
        {state.catalog.status !== 'ready' ? 'Catalogue indisponible.' : ''}
      </p>
      <p>
        Références :{' '}
        {m.dataReferences
          .map((r) => `${r.id} (${r.version}) ${r.sourceUrl}`)
          .join(' ; ')}
      </p>
    </article>
  );
}
