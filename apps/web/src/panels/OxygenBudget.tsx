import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { elevationSampler } from '@marps/data';
import { calculateMissionOxygen, DEFAULT_OXYGEN_PARAMETERS, validOxygenParameters, type OxygenParameters } from '@marps/mission-core';
import { localize } from '@marps/ui';
import { usePlannerDispatch, usePlannerState } from '../state/PlannerProvider';
import { useOptionalRouteProfile } from '../terrain/RouteProfileProvider';

const fields: readonly [keyof Omit<OxygenParameters, 'modelVersion' | 'assumeFlatTerrain'>, string][] = [
  ['stockGrams', 'Stock initial (g)'], ['reserveGrams', 'Réserve protégée (g)'], ['loadKg', 'Charge portée (kg)'],
  ['referenceGramsPerMinute', 'Débit de référence (g/min)'], ['activityGramsPerMinute', 'Débit à l’arrêt (g/min)'],
  ['referenceSpeedMetresPerSecond', 'Vitesse de référence (m/s)'], ['speedCoefficient', 'Coefficient de vitesse'],
  ['uphillCoefficient', 'Coefficient de montée'], ['downhillCoefficient', 'Coefficient de descente'], ['loadCoefficientPerKg', 'Coefficient de charge (1/kg)'],
];
export function OxygenBudget() {
  const { i18n } = useTranslation();
  const state = usePlannerState();
  const dispatch = usePlannerDispatch();
  const mission = state.workspace === 'base' ? state.mission : state.runningMission;
  const relief = useOptionalRouteProfile()?.relief;
  const p = mission?.parameters.oxygen;
  const [draft, setDraft] = useState<{ source: OxygenParameters; values: OxygenParameters } | null>(null);
  const values = p && draft?.source === p ? draft.values : p;
  const valid = !values || validOxygenParameters(values);
  const result = !valid || (state.workspace === 'base' && !state.parameterDraftValid)
    ? { status: 'invalid-inputs' } as const
    : calculateMissionOxygen(mission, relief?.status === 'ready' ? { sample: elevationSampler(relief.grid), spacingMetres: relief.grid.raster.pixelSizeMetres } : undefined);
  const save = (next: OxygenParameters | undefined) => {
    if (!mission) return;
    dispatch({ type: 'parametersChanged', parameters: { ...mission.parameters, oxygen: next } });
  };
  const format = (n: number) => `${n.toLocaleString(i18n.language, { maximumFractionDigits: 1 })} g`;
  return <section className="mt-4 grid gap-3 border-t pt-3" aria-label={localize('Estimation d’oxygène')}>
    <h3 className="font-semibold">{localize('Estimation d’oxygène')}</h3>
    {state.workspace === 'base' && mission && <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={!!p} onChange={e => { setDraft(null); save(e.target.checked ? { ...DEFAULT_OXYGEN_PARAMETERS } : undefined); }} />{localize('Activer le modèle O₂ simulé')}</label>}
    {p && values && <>
      {state.workspace === 'base' && <div className="grid gap-2">
        {fields.map(([key, label]) => <label key={key} className="grid grid-cols-2 items-center gap-2 text-sm">{localize(label)}<input className="min-h-11 w-full border bg-background px-2" type="number" step="any" min={key === 'referenceSpeedMetresPerSecond' ? Number.MIN_VALUE : 0} value={Number.isNaN(values[key]) ? '' : values[key]} onChange={e => {
          const next = { ...values, [key]: e.target.value === '' ? NaN : Number(e.target.value) };
          setDraft({ source: p, values: next });
          if (validOxygenParameters(next)) { save(next); setDraft(null); }
        }} /></label>)}
        <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={values.assumeFlatTerrain} onChange={e => {
          const next = { ...values, assumeFlatTerrain: e.target.checked };
          setDraft({ source: p, values: next });
          if (validOxygenParameters(next)) { save(next); setDraft(null); }
        }} />{localize('Supposer explicitement un terrain plat')}</label>
      </div>}
      {result.status === 'ready' ? <>
        <p>{localize('Besoin total, retour compris :')} <strong>{format(result.totalGrams)}</strong><br />{localize('Stock restant :')} {format(result.remainingGrams)}<br />{localize('Marge après réserve :')} <strong>{format(result.marginGrams)}</strong></p>
        {result.overBudget && <p role="alert" className="font-semibold text-destructive">{localize('O₂ insuffisant : la réserve protégée est entamée.')}</p>}
        <p>{localize(result.flatTerrain ? 'Hypothèse active : terrain plat, relief ignoré.' : 'Pente directionnelle calculée depuis le relief disponible.')}</p>
        <details><summary className="min-h-11 cursor-pointer">{localize('Détail de consommation')}</summary>
          <ol>{result.legs.map((leg, i) => <li key={i}>{localize(leg.returnToCamp ? 'Retour au camp' : 'Segment')} {i + 1} : {format(leg.grams)}</li>)}</ol>
          <ul>{result.activities.map(a => <li key={`${a.stepId}/${a.activityId}`}>{a.stepId} / {a.activityId} : {format(a.grams)}</li>)}</ul>
        </details>
      </> : <p role="status">{localize(result.status === 'invalid-inputs' ? 'O₂ non calculable : vérifiez les valeurs et la réserve.' : result.status === 'terrain-unavailable' ? 'O₂ indisponible : relief absent ou NoData sur le parcours. Le terrain plat doit être activé explicitement.' : 'Ajoutez un camp et une étape pour estimer l’O₂.')}</p>}
      <details><summary className="min-h-11 cursor-pointer">{localize('Formule et hypothèses O₂ — modèle v1')}</summary>
        <p>{localize('Simulation pédagogique : tous les paramètres par défaut sont simulés, sans calibration physiologique. Aucune donnée du rover ne mesure la consommation humaine. Pertes et fuites non modélisées.')}</p>
        <p>q = q₀ × [1 + kᵥ(v/v₀ − 1)²] × [1 + k↑ max(0, tan θ) + k↓ max(0, −tan θ)] × (1 + kₘ m)</p>
        <p>{localize('q en g/min, v en m/s, m en kg, θ en degrés signés ; consommation = Σ q × durée en minutes. À l’arrêt : débit distinct constant. Retour inclus une fois. Durées horizontales, coefficients non négatifs, |θ| < 90°. Aucune plage physiologique validée.')}</p>
        <dl>{fields.map(([key, label]) => <div key={key}><dt className="inline">{localize(label)} : </dt><dd className="inline">{p[key]}</dd></div>)}</dl>
      </details>
    </>}
  </section>;
}
