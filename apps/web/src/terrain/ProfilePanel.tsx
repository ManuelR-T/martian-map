import { locale } from '../i18n';
import { localize } from '@marps/ui';
import '../i18n';
import { useId, type KeyboardEvent, type PointerEvent } from 'react';
import type { TerrainGrid } from '@marps/data';
import type { ProfilePoint, SteepPortion } from '@marps/mission-core';
import { DataState, Panel } from '@marps/ui';
import { PlanningGate } from '../panels/PlanningGate';
import { usePlannerState } from '../state/PlannerProvider';
import type { RouteStop } from './demoRoute';
import { useRouteProfile } from './RouteProfileProvider';

const THRESHOLD_CHOICES = [5, 10, 15, 20, 25] as const;
const CHART_WIDTH = 1000;
const CHART_HEIGHT = 120;

const formatMetres = (metres: number) => `${Math.round(metres).toLocaleString(locale())} m`;

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

/** Profile point closest to a distance, to read the altitude under the finger. */
function nearestPoint(profile: readonly ProfilePoint[], metres: number) {
  return profile.reduce((best, point) =>
    Math.abs(point.distanceMetres - metres) < Math.abs(best.distanceMetres - metres) ? point : best,
  );
}

export function ProfilePanel({ className, collapsible = true }: { className?: string; collapsible?: boolean }) {
  const { view } = usePlannerState();
  const { dem, stops, relief, threshold, setThreshold } = useRouteProfile();
  const thresholdId = useId();

  const thresholdControl = (
    <label htmlFor={thresholdId} className="flex items-center gap-2 text-sm">
      {localize("Seuil de pente")} <select
        id={thresholdId}
        value={threshold}
        onChange={(event) => setThreshold(Number(event.target.value))}
        className="h-11 border border-input bg-card px-2 tabular-nums"
      >
        {THRESHOLD_CHOICES.map((degrees) => (
          <option key={degrees} value={degrees}>
            {localize(degrees)}{localize("°")} </option>
        ))}
      </select>
      <span className="text-xs text-muted-foreground">{localize("hypothèse")}</span>
    </label>
  );

  // Only the detailed sector has relief; on the global view the panel would hide the map for nothing.
  if (view === 'global') return null;

  return (
    <Panel
      floating
      title={localize("Profil du parcours")}
      description={localize("Parcours hypothétique de la mission, retour au camp inclus")}
      collapsible={collapsible}
      className={className}
    >
      <PlanningGate loadingTitle="Chargement du relief" coverageTitle="Pas de relief hors du secteur détaillé">
        {!dem ? (
          <DataState kind="empty" title={localize("Relief indisponible")} description={localize("Aucun relief n'est préparé pour ce secteur.")} />
        ) : stops.length < 2 ? (
          <DataState kind="empty" title={localize("Pas de parcours")} description={localize("Il faut au moins deux sites pour tracer un profil.")} />
        ) : !relief || relief.status === 'loading' ? (
          <DataState kind="loading" title={localize("Chargement du relief")} />
        ) : relief.status === 'error' ? (
          <DataState kind="error" title={localize("Relief non chargé")} description={localize("Le fichier d'altitudes est inaccessible. Rechargez la page.")} />
        ) : (
          // The threshold sits with the chart it changes, not in the title bar where it squeezed the description.
          <div className="grid gap-3">
            {localize(thresholdControl)}
            <ProfileChart grid={relief.grid} profile={relief.profile} steep={relief.steep} stops={stops} threshold={threshold} />
          </div>
        )}
      </PlanningGate>
    </Panel>
  );
}

interface ProfileChartProps {
  grid: TerrainGrid;
  profile: readonly ProfilePoint[];
  steep: readonly SteepPortion[];
  stops: readonly RouteStop[];
  threshold: number;
}

function ProfileChart({ grid, profile, steep, stops, threshold }: ProfileChartProps) {
  const { focusMetres, setFocusMetres } = useRouteProfile();
  const descriptionId = useId();
  const total = profile.at(-1)?.distanceMetres ?? 0;
  const elevations = profile.flatMap((point) => (point.elevationMetres === null ? [] : [point.elevationMetres]));
  if (total === 0 || elevations.length === 0) {
    return <DataState kind="empty" title={localize("Profil indisponible")} description={localize("Le parcours ne traverse aucune zone mesurée.")} />;
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
  // A focus left from a longer route would fall past the end of this one.
  const focus = focusMetres !== null && focusMetres <= total ? focusMetres : null;
  // Distance as touched, so the text, the line and the map diamond agree; altitude of the closest cell.
  const focusElevation = focus === null ? null : nearestPoint(profile, focus).elevationMetres;
  const focusText =
    focus === null
      ? localize("aucun point désigné")
      : localize("{{v0}} du départ, {{v1}}", { v0: formatMetres(focus), v1: focusElevation === null ? 'altitude non mesurée' : `altitude ${formatMetres(focusElevation)}` });

  // Mouse hover, or a finger dragged along the chart: the map shows the same point.
  const designate = (event: PointerEvent<SVGSVGElement>) => {
    if (event.pointerType !== 'mouse' && event.buttons === 0) return;
    const box = event.currentTarget.getBoundingClientRect();
    setFocusMetres(Math.min(Math.max((event.clientX - box.left) / box.width, 0), 1) * total);
  };
  const step = (event: KeyboardEvent<SVGSVGElement>) => {
    const current = focus ?? 0;
    const moves: Record<string, number | null> = {
      ArrowRight: current + total / 100,
      ArrowUp: current + total / 100,
      ArrowLeft: current - total / 100,
      ArrowDown: current - total / 100,
      PageUp: current + total / 10,
      PageDown: current - total / 10,
      Home: 0,
      End: total,
      Escape: null,
    };
    if (!(event.key in moves)) return;
    event.preventDefault();
    const next = moves[event.key] ?? null;
    setFocusMetres(next === null ? null : Math.min(Math.max(next, 0), total));
  };

  return (
    // minmax(0, 1fr): without it the grid column grows to the 1000-unit SVG and overflows the panel.
    <figure className="m-0 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-1">
      <div className="flex min-w-0 gap-2">
        <div className="flex w-16 shrink-0 flex-col justify-between py-1 text-right text-xs text-muted-foreground tabular-nums">
          <span>{localize(formatMetres(high))}</span>
          <span>{localize(formatMetres(low))}</span>
        </div>
        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          preserveAspectRatio="none"
          // pan-y: a vertical swipe still scrolls the panel, a horizontal drag designates a point.
          className="h-28 w-full min-w-0 flex-1 cursor-crosshair touch-pan-y border bg-muted/40 focus-visible:outline-2 focus-visible:outline-ring"
          role="slider"
          tabIndex={0}
          aria-label={localize("Point du parcours à montrer sur la carte")}
          aria-describedby={descriptionId}
          aria-valuemin={0}
          aria-valuemax={Math.round(total)}
          aria-valuenow={Math.round(focus ?? 0)}
          aria-valuetext={focusText}
          onPointerDown={designate}
          onPointerMove={designate}
          onKeyDown={step}
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
          {focus !== null && (
            <line
              x1={x(focus)}
              x2={x(focus)}
              y1={0}
              y2={CHART_HEIGHT}
              className="stroke-foreground"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
        <span id={descriptionId} className="sr-only">
          {localize("Profil d'altitude sur {{v0}}, entre {{v1}} et {{v2}}. Flèches : déplacer le point sur la carte.", { v0: formatMetres(total), v1: formatMetres(low), v2: formatMetres(high) })}
        </span>
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
              {localize(stop.label)}
            </span>
          );
        })}
      </div>

      <figcaption className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
        <span className="w-full tabular-nums">
          {focus !== null ? (
            <>
              <span aria-hidden="true" className="mr-1 inline-block size-2.5 rotate-45 border-2 border-foreground bg-card align-middle" />
              {localize("Sur la carte :")} {localize(focusText)}{localize(".")} </>
          ) : (
            localize("Touchez le profil pour situer un point sur la carte.")
          )}
        </span>
        <span className="tabular-nums" aria-live="polite">
          {steep.length === 0 ? (
            localize("Aucune pente au-delà de {{v0}}° sur {{v1}}.", { v0: threshold, v1: formatMetres(total) })
          ) : (
            <>
              <span aria-hidden="true" className="mr-1 inline-block size-3 bg-destructive/25 align-middle" />
              {localize(steep.length)} {localize("passage")}{steep.length > 1 ? 's' : ''} {localize("au-delà de")} {localize(threshold)}{localize("°, jusqu'à")}{' '}
              {Math.round(Math.max(...steep.map((portion) => portion.maxSlopeDegrees)))}{localize("°.")} </>
          )}
          {localize(hasNoData ? localize(" Gris clair : trou dans les mesures.") : null)}
          {localize(leavesCoverage ? localize(" Gris foncé : hors de la zone couverte par le relief.") : null)}
          {localize(" Hauteur exagérée pour la lisibilité.")}
        </span>
        <span className="text-xs text-muted-foreground">
          {localize(grid.dataset.title)} {localize("·")} {localize(grid.dataset.source.credit.split(';')[0])}
        </span>
      </figcaption>
    </figure>
  );
}
