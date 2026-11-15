import { useEffect, useId, useMemo, useState } from 'react';
import type Map from 'ol/Map';
import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Stroke, Style } from 'ol/style';
import { Button, localize } from '@marps/ui';
import { loadGrid, measureRoute, proposeRoute, terrainDataset, type RouteProposal, type TerrainGrid } from '@marps/data';
import { missionGeometry, slopeScenario, type CellBlock, type MarsCoordinate, type RouteScenario } from '@marps/mission-core';
import { locale } from '../../i18n';
import { routeArrowStyles } from './routeArrows';
import { usePlannerDispatch, usePlannerState } from '../../state/PlannerProvider';
import { selectCurrentMission } from '../../state/planner';

/** Green, so the proposal is not mistaken for the drawn route (orange dashes) or the profile route (blue). */
export const PROPOSAL_COLOUR = '#3ddc84';

const DEFAULT_LIMIT = '20';
/** Past 60° the grid itself holds no cell: the input stops there rather than promise more. */
const MAX_LIMIT = 60;

const formatMetres = (metres: number) => `${Math.round(metres).toLocaleString(locale())} m`;

function blockReason(reason: CellBlock, scenario: RouteScenario) {
  if (reason === 'out-of-coverage') return localize('hors de la grille de pentes');
  if (reason === 'no-data') return localize('pente non mesurée à cet endroit');
  return localize('pente au-delà de {{v0}}° à cet endroit', { v0: scenario.maxSlopeDegrees });
}

function failureText(proposal: Exclude<RouteProposal, { status: 'found' }>, scenario: RouteScenario, names: readonly string[]) {
  const from = names[proposal.leg];
  const to = names[proposal.leg + 1];
  if (proposal.status === 'no-path') return localize('Aucun chemin de « {{v0}} » à « {{v1}} » avec une pente maximale de {{v2}}°.', { v0: from, v1: to, v2: scenario.maxSlopeDegrees });
  return proposal.status === 'invalid-start'
    ? localize('Départ « {{v0}} » inutilisable : {{v1}}.', { v0: from, v1: blockReason(proposal.reason, scenario) })
    : localize('Arrivée « {{v0}} » inutilisable : {{v1}}.', { v0: to, v1: blockReason(proposal.reason, scenario) });
}

/** `grid` is null when the file could not be read. */
interface Loaded {
  readonly datasetId: string;
  readonly grid: TerrainGrid | null;
}

/**
 * Experimental route of #29: the shortest walk that stays under the slope the crew accepts,
 * compared with the route the crew drew, previewed on the map, and written back as the
 * mission's own legs when applied. The budget and the profile then read that geometry as
 * they read any drawn route.
 */
export function RouteProposals({ map, names }: { map: Map | null; names: readonly string[] }) {
  const planner = usePlannerState();
  const dispatch = usePlannerDispatch();
  const mission = selectCurrentMission(planner);
  // Same rule as the profile: the finest complete grid of the sector, CTX 20 m when HiRISE is unusable.
  const dataset = planner.catalog.status === 'ready' ? terrainDataset(planner.catalog.data, mission.regionId, 'slope') : null;
  const [requested, setRequested] = useState(false);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  // Kept as typed, so a half-written number is not rewritten under the cursor.
  const [limitText, setLimitText] = useState(DEFAULT_LIMIT);
  const limitId = useId();
  const limit = Number(limitText);
  const validLimit = limitText.trim() !== '' && Number.isFinite(limit) && limit > 0 && limit <= MAX_LIMIT;

  useEffect(() => {
    if (!requested || !dataset || loaded?.datasetId === dataset.id) return;
    let active = true;
    loadGrid(dataset).then(
      (grid) => active && setLoaded({ datasetId: dataset.id, grid }),
      (error: unknown) => {
        console.error(error);
        if (active) setLoaded({ datasetId: dataset.id, grid: null });
      },
    );
    return () => {
      active = false;
    };
  }, [requested, dataset, loaded]);

  const current = loaded?.datasetId === dataset?.id ? loaded : null;
  const grid = current?.grid ?? null;
  const { camp, steps } = mission;
  const stops = useMemo(() => (camp ? [camp.position, ...steps.map((step) => step.position), camp.position] : []), [camp, steps]);
  const drawn = useMemo<MarsCoordinate[]>(
    () => missionGeometry(mission)?.coordinates.map(([longitude, latitude]) => ({ longitude, latitude })) ?? [],
    [mission],
  );
  const scenario = useMemo(() => (validLimit ? slopeScenario(limit) : null), [validLimit, limit]);
  // The grids of the sector are small (at most 253 × 298 cells): the search takes milliseconds, no worker needed.
  const result = useMemo(() => {
    if (!grid || !scenario) return null;
    const proposal = proposeRoute(grid, stops, scenario);
    if (proposal.status !== 'found') return { proposal, route: null, proposed: null, own: measureRoute(grid, drawn, scenario) };
    const route = [stops[0]!, ...proposal.legs.flatMap((leg, index) => [...leg, stops[index + 1]!])];
    return { proposal, route, proposed: measureRoute(grid, route, scenario), own: measureRoute(grid, drawn, scenario) };
  }, [grid, scenario, stops, drawn]);
  const preview = result?.route ?? null;

  useEffect(() => {
    if (!map || !preview) return;
    const line = new LineString(preview.map((point) => [point.longitude, point.latitude]));
    const feature = new Feature(line);
    // Same direction arrows as the mission route, so the proposal reads the way the applied route will.
    feature.setStyle((_feature, resolution) => [
      new Style({ stroke: new Stroke({ color: '#151b25', width: 6 }) }),
      new Style({ stroke: new Stroke({ color: PROPOSAL_COLOUR, width: 3 }) }),
      ...routeArrowStyles(line, resolution),
    ]);
    const layer = new VectorLayer({ zIndex: 2.75, source: new VectorSource({ features: [feature], wrapX: false }) });
    map.addLayer(layer);
    return () => {
      map.removeLayer(layer);
    };
  }, [map, preview]);

  return (
    <section aria-label={localize('Chemin expérimental selon la pente')} className="grid gap-3 border-t pt-3">
      <h3 className="font-semibold">{localize('Chemin expérimental selon la pente')}</h3>
      <p>{localize("Proposition calculée sur une grille de pentes. Ce n'est ni un itinéraire validé ni une garantie de sécurité.")}</p>
      {!dataset ? (
        <p role="status">{localize("Aucune grille de pentes n'est préparée pour ce secteur.")}</p>
      ) : !requested ? (
        <Button size="sm" onClick={() => setRequested(true)}>{localize('Proposer un chemin')}</Button>
      ) : !current ? (
        <p role="status">{localize('Chargement des pentes…')}</p>
      ) : !grid ? (
        <div role="alert" className="grid gap-2">
          <p>{localize('Grille de pentes inaccessible : aucun chemin proposé.')}</p>
          <Button size="sm" variant="outline" onClick={() => setLoaded(null)}>{localize('Réessayer')}</Button>
        </div>
      ) : (
        <>
          <label htmlFor={limitId} className="flex flex-wrap items-center gap-2 font-semibold">
            {localize('Pente maximale acceptée')}
            <input
              id={limitId}
              type="number"
              inputMode="decimal"
              min={1}
              max={MAX_LIMIT}
              step={1}
              value={limitText}
              onChange={(event) => setLimitText(event.target.value)}
              aria-invalid={!validLimit}
              aria-describedby={`${limitId}-hint`}
              className="h-11 w-24 border border-input bg-card px-2 tabular-nums"
            />
            {localize('°')}
          </label>
          <p id={`${limitId}-hint`} className={validLimit ? 'text-muted-foreground' : undefined} role={validLimit ? undefined : 'alert'}>
            {validLimit
              ? localize('Le chemin évite toute cellule plus pentue et préfère les pentes douces.')
              : localize('Saisissez une pente entre 1° et {{v0}}°.', { v0: MAX_LIMIT })}
          </p>
          {result && scenario && (result.proposal.status !== 'found' || !result.proposed ? (
            <div role="alert" className="grid gap-1 border border-destructive/60 bg-card p-2">
              <p className="font-semibold">{localize('Aucune solution à {{v0}}°.', { v0: scenario.maxSlopeDegrees })}</p>
              {result.proposal.status !== 'found' && <p>{failureText(result.proposal, scenario, names)}</p>}
              <p>{localize('Essayez une pente maximale plus élevée.')}</p>
            </div>
          ) : (
            <>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 border bg-card p-2 tabular-nums">
                <dt>{localize('Chemin proposé')}</dt>
                <dd>{localize('{{v0}}, coût {{v1}} à plat', { v0: formatMetres(result.proposed.metres), v1: formatMetres(result.proposed.costMetres) })}</dd>
                <dt>{localize('Tracé actuel')}</dt>
                <dd>
                  {result.own.blockedMetres > 0.5
                    ? localize('{{v0}}, dont {{v1}} sur terrain fermé à {{v2}}° : coût non comparable', { v0: formatMetres(result.own.metres), v1: formatMetres(result.own.blockedMetres), v2: scenario.maxSlopeDegrees })
                    : localize('{{v0}}, coût {{v1}} à plat', { v0: formatMetres(result.own.metres), v1: formatMetres(result.own.costMetres) })}
                </dd>
              </dl>
              <p className="flex items-center gap-2">
                <svg viewBox="0 0 40 12" className="w-10 shrink-0" aria-hidden="true"><path d="M0 6H40" stroke="#151b25" strokeWidth="6" /><path d="M0 6H40" stroke={PROPOSAL_COLOUR} strokeWidth="3" /></svg>
                {localize('Sur la carte : chemin proposé.')} {localize("Les flèches indiquent le sens de marche, retour au camp compris.")}
              </p>
              <Button size="sm" onClick={() => dispatch({ type: 'routeLegsReplaced', legs: result.proposal.legs })}>
                {localize('Appliquer ce chemin au parcours')}
              </Button>
            </>
          ))}
          <details>
            <summary className="min-h-11 cursor-pointer py-3 font-semibold">{localize('Hypothèses et limites')}</summary>
            <ul className="grid list-disc gap-1 pl-5">
              <li>{localize('Grille : {{v0}}, cellules de {{v1}} m. Le chemin ne sort jamais de cette grille.', { v0: grid.dataset.title, v1: grid.raster.pixelSizeMetres })}</li>
              <li>{localize('Coût : chaque mètre compte 1 + 2 × pente / pente maximale mètres à plat. Le poids 2 est une hypothèse de modèle, pas une limite de combinaison.')}</li>
              <li>{localize("Terrain fermé : pente au-delà de la limite, cellule sans mesure, tout ce qui est hors de la grille. Le chemin ne coupe pas le coin d'une cellule fermée.")}</li>
              <li>{localize('La pente lue est celle du terrain dans la cellule, quelle que soit la direction de marche.')}</li>
              <li>{localize('Le relief ne montre ni chaque rocher ni la portance du sol : ce chemin reste hypothétique.')}</li>
              <li>{localize('Appliquer remplace tous les segments du parcours ; le budget et le profil se recalculent sur le nouveau tracé.')}</li>
            </ul>
          </details>
        </>
      )}
    </section>
  );
}
