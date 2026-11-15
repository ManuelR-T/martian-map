import { localize } from '@marps/ui';
import '../i18n';
import { useEffect, useId, useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import {
  availableHours,
  conditionsAt,
  loadMedaConditions,
  preparedSols,
  temperatureCurve,
  windStatus,
  type DatasetDescriptor,
  type MedaConditions,
  type WindStatus,
} from '@marps/data';
import { DataState, Panel, ProvenanceBadge } from '@marps/ui';
import { TemperatureCurve } from '../conditions/TemperatureCurve';
import { formatCelsius, formatLmst, formatMonthYear, formatPascals } from '../format';
import { usePlannerState } from '../state/PlannerProvider';
import type { Resource } from '../state/planner';
import { PlanningGate } from './PlanningGate';

/** Heure proposée à l'ouverture : milieu de journée, quand une sortie a lieu. */
const DEFAULT_HOUR = 12;
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const selectClass = 'h-11 border border-input bg-card px-2 tabular-nums';

function useMedaConditions(datasets: readonly DatasetDescriptor[] | null): Resource<MedaConditions | null> {
  const [resource, setResource] = useState<Resource<MedaConditions | null>>({ status: 'loading' });
  useEffect(() => {
    if (!datasets) return;
    let current = true;
    loadMedaConditions(datasets)
      .then((data) => current && setResource({ status: 'ready', data }))
      .catch((error: unknown) => current && setResource({ status: 'error', message: String(error) }));
    return () => {
      current = false;
    };
  }, [datasets]);
  return resource;
}

function nearestMeasuredHour(measured: Set<number>, wanted: number): number {
  return [...measured].sort((a, b) => Math.abs(a - wanted) - Math.abs(b - wanted))[0] ?? wanted;
}

interface ConditionsViewProps {
  conditions: MedaConditions;
  /** Sols préparés, au moins un. */
  sols: readonly number[];
  firstSol: number;
  wind: WindStatus;
}

function ConditionsView({ conditions, sols, firstSol, wind }: ConditionsViewProps) {
  const [sol, setSol] = useState(firstSol);
  const [hour, setHour] = useState(() => nearestMeasuredHour(availableHours(conditions, firstSol), DEFAULT_HOUR));
  const solId = useId();
  const hourId = useId();
  const curve = temperatureCurve(conditions, sol);
  const measured = availableHours(conditions, sol);
  const now = conditionsAt(conditions, sol, hour);
  const chooseSol = (next: number) => {
    setSol(next);
    setHour(nearestMeasuredHour(availableHours(conditions, next), hour));
  };
  const series = conditions.temperature.find((candidate) => candidate.sol === sol);
  const source = conditions.datasets.temperature.source;
  const pressureSource = conditions.datasets.pressure.source;

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label htmlFor={solId} className="flex items-center gap-2">
          {localize("Sol")} <select id={solId} value={sol} onChange={(event) => chooseSol(Number(event.target.value))} className={selectClass}>
            {sols.map((candidate) => (
              <option key={candidate} value={candidate}>
                {localize(candidate)}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor={hourId} className="flex items-center gap-2">
          {localize("Heure martienne")} <select id={hourId} value={hour} onChange={(event) => setHour(Number(event.target.value))} className={selectClass}>
            {HOURS.map((candidate) => (
              <option key={candidate} value={candidate} disabled={!measured.has(candidate)}>
                {measured.has(candidate) ? `${candidate} h` : `${candidate} h, indisponible`}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p aria-live="polite" className="flex items-baseline gap-2">
        {now.temperature ? (
          <>
            <span className="heading-display text-4xl font-bold tabular-nums">{formatCelsius(now.temperature.celsius)}</span>{' '}
            <span className="text-sm text-muted-foreground">{localize("à")} {localize(hour)} {localize("h")}</span>
          </>
        ) : (
          <span className="font-semibold">{localize("Température indisponible à")} {localize(hour)} {localize("h")}</span>
        )}
      </p>

      <TemperatureCurve values={curve} selectedHour={hour} selectable={measured} onSelect={setHour} />
      {curve.some((value) => value === null) ? (
        <p className="-mt-2 text-xs text-muted-foreground">{localize("Zone hachurée : température non mesurée.")}</p>
      ) : null}

      <div className="grid gap-1 text-sm">
        {now.temperature ? (
          <p>
            {localize("Mesuré de {{v0}} à {{v1}}.", { v0: formatLmst(now.temperature.firstLmst), v1: formatLmst(now.temperature.lastLmst) })} </p>
        ) : null}
        {/* Le lieu ne dépend pas de la température : une heure avec la seule pression le montre aussi. */}
        {now.location ? (
          <p>
            {localize("Au rover, à")} {localize(now.location.nearestSite.distanceMetres)} {localize("m de")} {localize(now.location.nearestSite.name)}{localize(".")} </p>
        ) : null}
        <p className="text-muted-foreground">
          {localize("Pression")} {localize(now.pressure ? formatPascals(now.pressure.pascals) : 'indisponible')}
        </p>
        <p className="text-muted-foreground">
          {wind.reasonUrl ? (
            <a href={wind.reasonUrl} className="underline">
              {localize(wind.reason)}
            </a>
          ) : (
            wind.reason
          )}
        </p>
        <p className="flex items-start gap-1.5 font-semibold text-warning">
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {localize("Mesure passée")}{localize(series ? ` (${formatMonthYear(series.startUtc)})` : '')}{localize(", pas une prévision.")} </p>
        <p className="text-muted-foreground">
          <a href={source.url} className="underline">
            {localize("NASA PDS · MEDA")} </a>
          {/* Lowercased after the comma; the catalog holds that lowercase form. */}
          {series ? <>{localize(",")} {localize(`${series.sensor.charAt(0).toLowerCase()}${series.sensor.slice(1)}`)}</> : null}
          {localize(' · ')}
          <a href={pressureSource.url} className="underline">
            {localize("source de la pression")} </a>
        </p>
      </div>
    </div>
  );
}

export function ConditionsPanel({ className, collapsible = true }: { className?: string; collapsible?: boolean }) {
  const { catalog } = usePlannerState();
  const conditions = useMedaConditions(catalog.status === 'ready' ? catalog.data.datasets : null);
  const sols = conditions.status === 'ready' && conditions.data ? preparedSols(conditions.data) : [];

  return (
    <Panel
      title={localize("Conditions au rover")}
      actions={<ProvenanceBadge status="measured" />}
      collapsible={collapsible}
      floating
      className={className}
      contentClassName="overflow-y-auto p-3"
    >
      <PlanningGate loadingTitle="Chargement des conditions" coverageTitle="Pas de mesure hors du secteur détaillé">
        {conditions.status === 'loading' ? (
          <DataState kind="loading" announce={false} title={localize("Chargement des mesures MEDA")} />
        ) : conditions.status === 'error' ? (
          <DataState kind="error" title={localize("Mesures MEDA inaccessibles")} description={localize("Vérifiez la connexion, puis rechargez.")} />
        ) : conditions.data && sols[0] !== undefined ? (
          // La clé repart du premier sol si un rechargement change la liste des sols préparés.
          <ConditionsView
            key={sols.join()}
            conditions={conditions.data}
            sols={sols}
            firstSol={sols[0]}
            wind={windStatus(catalog.status === 'ready' ? catalog.data.coverage : undefined)}
          />
        ) : (
          <DataState kind="empty" title={localize("Aucune mesure préparée")} description={localize("Ce secteur n'a pas de mesure MEDA.")} />
        )}
      </PlanningGate>
    </Panel>
  );
}
