import { useState } from 'react';
import { FlaskConical, Mountain, Settings2, TriangleAlert } from 'lucide-react';
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
  const profile = useOptionalRouteProfile();
  const relief = profile?.relief;
  const p = mission?.parameters.oxygen ?? DEFAULT_OXYGEN_PARAMETERS;
  const [draft, setDraft] = useState<{ source: OxygenParameters; missionId: string | undefined; workspace: typeof state.workspace; values: OxygenParameters } | null>(null);
  const values = draft?.source === p && draft.missionId === mission?.id && draft.workspace === state.workspace ? draft.values : p;
  const valid = !values || validOxygenParameters(values);
  const result = !valid || (state.workspace === 'base' && !state.parameterDraftValid)
    ? { status: 'invalid-inputs' } as const
    : calculateMissionOxygen(mission, relief?.status === 'ready' ? { sample: elevationSampler(relief.grid), spacingMetres: relief.grid.raster.pixelSizeMetres } : undefined);
  const save = (next: OxygenParameters) => {
    if (!mission) return;
    dispatch({ type: 'parametersChanged', parameters: { ...mission.parameters, oxygen: next } });
  };
  const format = (n: number) => `${n.toLocaleString(i18n.language, { maximumFractionDigits: 1 })} g`;
  return <section className="mt-4 grid gap-3 border-t pt-3" aria-label={localize('Estimation d’oxygène')}>
    <h3 className="font-semibold">{localize('Estimation d’oxygène')}</h3>
      {result.status === 'ready' ? <>
        <div className={`border border-l-4 p-3 ${result.overBudget ? 'border-danger-border bg-danger-surface text-danger' : 'border-input bg-muted/40'}`}>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide"><FlaskConical aria-hidden="true" className="size-4" />{localize('Simulation O₂ — modèle non calibré')}</p>
          <p className="mt-3 text-sm">{localize('Besoin total, retour compris :')}</p>
          <p className="numeral-display text-3xl font-semibold tabular-nums">{format(result.totalGrams)}</p>
          <dl className="mt-3 grid grid-cols-2 gap-3 border-t pt-3 text-sm">
            <div><dt>{localize('Stock restant :')}</dt><dd className="font-semibold tabular-nums">{format(result.remainingGrams)}</dd></div>
            <div><dt>{localize('Marge après réserve :')}</dt><dd className="font-semibold tabular-nums">{format(result.marginGrams)}</dd></div>
          </dl>
          {result.overBudget && <p role="alert" className="mt-3 flex items-start gap-2 font-semibold"><TriangleAlert aria-hidden="true" className="size-5 shrink-0" />{localize('O₂ insuffisant : la réserve protégée est entamée.')}</p>}
        </div>
        <div className="grid gap-2 text-xs">
          <div aria-hidden="true" className="flex h-4 overflow-hidden border bg-muted">
            <span className="bg-primary" style={{ width: `${100 * Math.min(1, result.totalGrams / Math.max(p!.stockGrams, Number.MIN_VALUE))}%` }} />
            <span className="pattern-hatched border-l text-primary" style={{ width: `${100 * Math.min(Math.max(0, p!.stockGrams - result.totalGrams), p!.reserveGrams) / Math.max(p!.stockGrams, Number.MIN_VALUE)}%` }} />
          </div>
          <p>{localize('Plein : besoin estimé · Hachures : réserve restante · Vide : marge disponible')}</p>
          <p>{localize('Stock initial (g)')} : {format(p!.stockGrams)} · {localize('Réserve protégée (g)')} : {format(p!.reserveGrams)}</p>
        </div>
        <div role="status" className={`flex items-start gap-2 border p-3 text-sm ${result.flatTerrain ? 'border-danger-border bg-danger-surface text-danger' : 'border-input'}`}>
          {result.flatTerrain ? <TriangleAlert aria-hidden="true" className="size-5 shrink-0" /> : <Mountain aria-hidden="true" className="size-5 shrink-0" />}
          <div><p className="font-semibold">{localize(result.flatTerrain ? 'Hypothèse active : terrain plat, relief ignoré.' : 'Pente directionnelle calculée depuis le relief disponible.')}</p>
            {result.flatTerrain ? <p>{localize('Estimation incertaine : les pentes réelles ne sont pas prises en compte.')}</p> : <p>{localize(profile?.dem?.title)}</p>}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{localize('Valeurs de scénario simulées : même avec le relief, cette estimation ne garantit pas une autonomie réelle.')}</p>
        <details><summary className="min-h-11 cursor-pointer">{localize('Détail de consommation')}</summary>
          <ol>{result.legs.map((leg, i) => <li key={i}>{localize(leg.returnToCamp ? 'Retour au camp' : 'Segment')} {i + 1} : {format(leg.grams)}</li>)}</ol>
          <ul>{result.activities.map(a => <li key={`${a.stepId}/${a.activityId}`}>{a.stepId} / {a.activityId} : {format(a.grams)}</li>)}</ul>
        </details>
      </> : <p role="status" className="border border-dashed bg-muted/40 p-3 text-sm">{localize(result.status === 'invalid-inputs' ? 'O₂ non calculable : vérifiez les valeurs et la réserve.' : result.status === 'terrain-unavailable' && relief?.status === 'loading' ? 'Chargement du relief : estimation O₂ masquée.' : result.status === 'terrain-unavailable' ? 'O₂ indisponible : relief absent ou NoData sur le parcours. Le terrain plat doit être activé explicitement.' : 'Ajoutez un camp et une étape pour estimer l’O₂.')}</p>}
      <section className="border-t pt-2" aria-label={localize('Paramètres et données O₂')}>
        <h4 className="flex min-h-11 items-center gap-2 font-semibold"><Settings2 aria-hidden="true" className="size-4" />{localize('Paramètres et données O₂')}</h4>
        <div className="grid gap-3 pb-3">
    {p && values && <>
      {state.workspace === 'base' && <div className="grid gap-2">
        {fields.map(([key, label]) => <label key={key} className="grid grid-cols-2 items-center gap-2 text-sm">{localize(label)}<input className="min-h-11 w-full border bg-background px-2" name={`oxygen-${key}`} type="number" step="any" min={key === 'referenceSpeedMetresPerSecond' ? Number.MIN_VALUE : 0} value={Number.isNaN(values[key]) ? '' : values[key]} onChange={e => {
          const next = { ...values, [key]: e.target.value === '' ? NaN : Number(e.target.value) };
          setDraft({ source: p, missionId: mission?.id, workspace: state.workspace, values: next });
          if (validOxygenParameters(next)) { save(next); setDraft(null); }
        }} /></label>)}
        <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={values.assumeFlatTerrain} onChange={e => {
          const next = { ...values, assumeFlatTerrain: e.target.checked };
          setDraft({ source: p, missionId: mission?.id, workspace: state.workspace, values: next });
          if (validOxygenParameters(next)) { save(next); setDraft(null); }
        }} />{localize('Supposer explicitement un terrain plat')}</label>
      </div>}
      {state.workspace === 'mission' && <dl>{fields.map(([key, label]) => <div key={key}><dt className="inline">{localize(label)} : </dt><dd className="inline">{p[key]}</dd></div>)}</dl>}
    </>}
        </div>
      </section>
      {p && values && <>
      <details><summary className="min-h-11 cursor-pointer">{localize('Formule et hypothèses O₂ — modèle v1')}</summary>
        <p>{localize('Simulation pédagogique : tous les paramètres par défaut sont simulés, sans calibration physiologique. Aucune donnée du rover ne mesure la consommation humaine. Pertes et fuites non modélisées.')}</p>
        <p>q = q₀ × [1 + kᵥ(v/v₀ − 1)²] × [1 + k↑ max(0, tan θ) + k↓ max(0, −tan θ)] × (1 + kₘ m)</p>
        <p>{localize('q en g/min, v en m/s, m en kg, θ en degrés signés ; consommation = Σ q × durée en minutes. À l’arrêt : débit distinct constant. Retour inclus une fois. Durées horizontales, coefficients non négatifs, |θ| < 90°. Aucune plage physiologique validée.')}</p>
      </details>
      </>}
  </section>;
}
