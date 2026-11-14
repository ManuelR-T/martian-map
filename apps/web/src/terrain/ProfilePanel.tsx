import { useEffect, useId, useMemo, useState } from 'react';
import { elevationSampler, loadGrid, terrainDataset, type DatasetDescriptor, type TerrainGrid } from '@marps/data';
import { sampleProfile, steepPortions, type ProfilePoint } from '@marps/mission-core';
import { DataState, Panel } from '@marps/ui';
import { PlanningGate } from '../panels/PlanningGate';
import { usePlannerState } from '../state/PlannerProvider';
import { DETAILED_REGION_ID } from '../state/planner';
import { demoRoute, type RouteStop } from './demoRoute';

const THRESHOLD_CHOICES = [5, 10, 15, 20, 25] as const;
const DEFAULT_THRESHOLD = 10;
const CHART_WIDTH = 1000;
const CHART_HEIGHT = 120;

type GridState =
  | { readonly status: 'loading' }
  | { readonly status: 'error' }
  | { readonly status: 'ready'; readonly grid: TerrainGrid };

const formatMetres = (metres: number) => `${Math.round(metres).toLocaleString('fr-FR')} m`;

/** Runs of consecutive points sharing a status, so gaps are drawn as gaps. */
function runsOf(profile: readonly ProfilePoint[]) {
  const runs: { status: ProfilePoint['status']; points: ProfilePoint[] }[] = [];
  for (const point of profile) {
    const last = runs.at(-1);
    if (last && last.status === point.status) last.points.push(point);
    else runs.push({ status: point.status, points: [point] });
  }
  return runs;
}

export function ProfilePanel({ className }: { className?: string }) {
  const { catalog, view } = usePlannerState();
  const [threshold, setThreshold] = useState<number>(DEFAULT_THRESHOLD);
  const thresholdId = useId();
  // Finest complete relief first: HiRISE 4 m, CTX 20 m as fallback.
  const dem = catalog.status === 'ready' ? terrainDataset(catalog.data, DETAILED_REGION_ID, 'elevation') : null;
  const stops = useMemo(() => (catalog.status === 'ready' ? demoRoute(catalog.data.sites) : []), [catalog]);

  const thresholdControl = (
    <label htmlFor={thresholdId} className="flex items-center gap-2 text-sm">
      Seuil
      <select
        id={thresholdId}
        value={threshold}
        onChange={(event) => setThreshold(Number(event.target.value))}
        className="h-11 border border-input bg-card px-2 tabular-nums"
      >
        {THRESHOLD_CHOICES.map((degrees) => (
          <option key={degrees} value={degrees}>
            {degrees}°
          </option>
        ))}
      </select>
      <span className="text-xs text-muted-foreground">hypothèse</span>
    </label>
  );

  // Only the detailed sector has relief; on the global view the panel would hide the map for nothing.
  if (view === 'global') return null;

  return (
    <Panel
      title="Profil du parcours"
      description="Parcours de démonstration : les sites en ligne droite, puis retour"
      collapsible
      actions={thresholdControl}
      className={className}
    >
      <PlanningGate loadingTitle="Chargement du relief" coverageTitle="Pas de relief hors du secteur détaillé">
        {!dem ? (
          <DataState kind="empty" title="Relief indisponible" description="Aucun relief n'est préparé pour ce secteur." />
        ) : stops.length < 2 ? (
          <DataState kind="empty" title="Pas de parcours" description="Il faut au moins deux sites pour tracer un profil." />
        ) : (
          // Keyed by dataset: a new relief starts from « chargement » instead of showing the previous one.
          <ReliefProfile key={dem.id} dem={dem} stops={stops} threshold={threshold} />
        )}
      </PlanningGate>
    </Panel>
  );
}

function ReliefProfile({ dem, stops, threshold }: { dem: DatasetDescriptor; stops: readonly RouteStop[]; threshold: number }) {
  const [gridState, setGridState] = useState<GridState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    loadGrid(dem).then(
      (grid) => active && setGridState({ status: 'ready', grid }),
      (error: unknown) => {
        console.error(error);
        if (active) setGridState({ status: 'error' });
      },
    );
    return () => {
      active = false;
    };
  }, [dem]);

  if (gridState.status === 'loading') return <DataState kind="loading" title="Chargement du relief" />;
  if (gridState.status === 'error') {
    return <DataState kind="error" title="Relief non chargé" description="Le fichier d'altitudes est inaccessible. Rechargez la page." />;
  }
  return <ProfileChart grid={gridState.grid} stops={stops} threshold={threshold} />;
}

interface ProfileChartProps {
  grid: TerrainGrid;
  stops: readonly RouteStop[];
  threshold: number;
}

function ProfileChart({ grid, stops, threshold }: ProfileChartProps) {
  // One point per relief cell: a finer step would invent detail the data does not have.
  const profile = useMemo(
    () => sampleProfile(stops.map((stop) => stop.coordinate), elevationSampler(grid), grid.raster.pixelSizeMetres),
    [grid, stops],
  );
  const steep = useMemo(() => steepPortions(profile, threshold), [profile, threshold]);
  const total = profile.at(-1)?.distanceMetres ?? 0;
  const elevations = profile.flatMap((point) => (point.elevationMetres === null ? [] : [point.elevationMetres]));
  if (total === 0 || elevations.length === 0) {
    return <DataState kind="empty" title="Profil indisponible" description="Le parcours ne traverse aucune zone mesurée." />;
  }

  const low = Math.min(...elevations);
  const high = Math.max(...elevations);
  const span = Math.max(high - low, 1);
  const x = (metres: number) => (metres / total) * CHART_WIDTH;
  const y = (elevation: number) => CHART_HEIGHT - 8 - ((elevation - low) / span) * (CHART_HEIGHT - 16);
  const runs = runsOf(profile);
  const gaps = runs.filter((run) => run.status !== 'measured');
  const hasNoData = gaps.some((gap) => gap.status === 'no-data');
  const leavesCoverage = gaps.some((gap) => gap.status === 'out-of-coverage');
  // Same distances as the sampled profile, so stop lines never drift from the curve.
  const stopDistances = profile.flatMap((point) => (point.vertexIndex === undefined ? [] : [point.distanceMetres]));

  return (
    <figure className="m-0 grid gap-1">
      <div className="flex gap-2">
        <div className="flex w-16 shrink-0 flex-col justify-between py-1 text-right text-xs text-muted-foreground tabular-nums">
          <span>{formatMetres(high)}</span>
          <span>{formatMetres(low)}</span>
        </div>
        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          preserveAspectRatio="none"
          className="h-28 min-w-0 flex-1 border bg-muted/40"
          role="img"
          aria-label={`Profil d'altitude sur ${formatMetres(total)}, entre ${formatMetres(low)} et ${formatMetres(high)}.`}
        >
          {steep.map((portion) => (
            <rect
              key={portion.startMetres}
              x={x(portion.startMetres)}
              width={Math.max(x(portion.endMetres) - x(portion.startMetres), 2)}
              y={0}
              height={CHART_HEIGHT}
              className="fill-destructive/25"
            />
          ))}
          {gaps.map((gap) => (
            <rect
              key={`gap-${gap.points[0]?.distanceMetres}`}
              x={x(gap.points[0]?.distanceMetres ?? 0)}
              width={Math.max(x(gap.points.at(-1)?.distanceMetres ?? 0) - x(gap.points[0]?.distanceMetres ?? 0), 2)}
              y={0}
              height={CHART_HEIGHT}
              // Darker outside the relief, lighter for a hole inside it: the crew can tell them apart.
              className={gap.status === 'out-of-coverage' ? 'fill-muted-foreground/40' : 'fill-muted-foreground/20'}
            />
          ))}
          {stopDistances.map((distance, index) => (
            <line key={index} x1={x(distance)} x2={x(distance)} y1={0} y2={CHART_HEIGHT} className="stroke-border" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
          ))}
          {runs
            .filter((run) => run.status === 'measured')
            .map((run) =>
              run.points.length === 1 ? (
                // A lone measured point between two gaps would be an invisible one-point line.
                <circle key={run.points[0]?.distanceMetres} cx={x(run.points[0]?.distanceMetres ?? 0)} cy={y(run.points[0]?.elevationMetres ?? low)} r={3} className="fill-primary" />
              ) : (
                <polyline
                  key={run.points[0]?.distanceMetres}
                  points={run.points.map((point) => `${x(point.distanceMetres)},${y(point.elevationMetres ?? low)}`).join(' ')}
                  className="fill-none stroke-primary"
                  strokeWidth={2}
                  vectorEffect="non-scaling-stroke"
                />
              ),
            )}
        </svg>
      </div>

      {/* Same left offset as the altitude column (w-16 + gap-2), so labels sit on their dashed lines. */}
      <div className="relative ml-[4.5rem] h-8 text-xs text-muted-foreground">
        {stops.map((stop, index) => {
          const share = ((stopDistances[index] ?? 0) / total) * 100;
          const previous = ((stopDistances[index - 1] ?? -Infinity) / total) * 100;
          // Sites a few metres apart (Skinner and Wildcat) would overlap: the second goes one line down.
          const lowered = share - previous < 15 && index % 2 === 1;
          return (
            <span
              key={`${stop.label}-${index}`}
              className="absolute whitespace-nowrap"
              style={{
                left: `${share}%`,
                top: lowered ? '1rem' : 0,
                transform: share > 90 ? 'translateX(-100%)' : share > 5 ? 'translateX(-50%)' : undefined,
              }}
            >
              {stop.label}
            </span>
          );
        })}
      </div>

      <figcaption className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
        <span className="tabular-nums" aria-live="polite">
          {steep.length === 0 ? (
            `Aucune pente au-delà de ${threshold}° sur ${formatMetres(total)}.`
          ) : (
            <>
              <span aria-hidden="true" className="mr-1 inline-block size-3 bg-destructive/25 align-middle" />
              {steep.length} passage{steep.length > 1 ? 's' : ''} au-delà de {threshold}°, jusqu'à{' '}
              {Math.round(Math.max(...steep.map((portion) => portion.maxSlopeDegrees)))}°.
            </>
          )}
          {hasNoData ? ' Gris clair : trou dans les mesures.' : null}
          {leavesCoverage ? ' Gris foncé : hors de la zone couverte par le relief.' : null}
          {' Hauteur exagérée pour la lisibilité.'}
        </span>
        <span className="text-xs text-muted-foreground">
          {grid.dataset.title} · {grid.dataset.source.credit.split(';')[0]}
        </span>
      </figcaption>
    </figure>
  );
}
