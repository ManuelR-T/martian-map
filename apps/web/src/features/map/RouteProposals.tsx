import { useEffect, useMemo, useState } from 'react';
import type Map from 'ol/Map';
import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Stroke, Style } from 'ol/style';
import { Button, localize } from '@marps/ui';
import { loadGrid, measureRoute, proposeRoute, terrainDataset, type RouteProposal, type TerrainGrid } from '@marps/data';
import { missionGeometry, routeScenarios, type CellBlock, type MarsCoordinate, type RouteScenario } from '@marps/mission-core';
import { locale } from '../../i18n';
import { usePlannerDispatch, usePlannerState } from '../../state/PlannerProvider';
import { selectCurrentMission } from '../../state/planner';

/** Green, so the proposal is not mistaken for the drawn route (orange dashes) or the profile route (blue). */
export const PROPOSAL_COLOUR = '#3ddc84';

const scenarioNames: Record<RouteScenario['id'], string> = { cautious: 'Prudent', balanced: 'Équilibré', bold: 'Audacieux' };

const formatMetres = (metres: number) => `${Math.round(metres).toLocaleString(locale())} m`;

function blockReason(reason: CellBlock, scenario: RouteScenario) {
  if (reason === 'out-of-coverage') return localize('hors de la grille de pentes');
  if (reason === 'no-data') return localize('pente non mesurée à cet endroit');
  return localize('pente au-delà de {{v0}}° à cet endroit', { v0: scenario.maxSlopeDegrees });
}

function failureText(proposal: Exclude<RouteProposal, { status: 'found' }>, scenario: RouteScenario, names: readonly string[]) {
  const from = names[proposal.leg];
  const to = names[proposal.leg + 1];
  if (proposal.status === 'no-path') return localize('Aucun chemin de « {{v0}} » à « {{v1}} » avec ces hypothèses.', { v0: from, v1: to });
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
 * Experimental routes of #29: one per scenario, compared with the route the crew drew,
 * previewed on the map, and written back as the mission's own legs when applied. The
 * budget and the profile then read that geometry as they read any drawn route.
 */
export function RouteProposals({ map, names }: { map: Map | null; names: readonly string[] }) {
  const planner = usePlannerState();
  const dispatch = usePlannerDispatch();
  const mission = selectCurrentMission(planner);
  // Same rule as the profile: the finest complete grid of the sector, CTX 20 m when HiRISE is unusable.
  const dataset = planner.catalog.status === 'ready' ? terrainDataset(planner.catalog.data, mission.regionId, 'slope') : null;
  const [requested, setRequested] = useState(false);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [choice, setChoice] = useState<RouteScenario['id'] | null>(null);

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
  // The grids of the sector are small (at most 253 × 298 cells): the search takes milliseconds, no worker needed.
  const proposals = useMemo(
    () =>
      grid &&
      routeScenarios.map((scenario) => {
        const proposal = proposeRoute(grid, stops, scenario);
        const route = proposal.status === 'found' ? [stops[0]!, ...proposal.legs.flatMap((leg, index) => [...leg, stops[index + 1]!])] : null;
        return { scenario, proposal, route, measure: route && measureRoute(grid, route, scenario) };
      }),
    [grid, stops],
  );
  const selected = proposals?.find((row) => row.scenario.id === choice && row.route) ?? proposals?.find((row) => row.route) ?? null;
  const preview = selected?.route ?? null;

  useEffect(() => {
    if (!map || !preview) return;
    const feature = new Feature(new LineString(preview.map((point) => [point.longitude, point.latitude])));
    feature.setStyle([
      new Style({ stroke: new Stroke({ color: '#151b25', width: 6 }) }),
      new Style({ stroke: new Stroke({ color: PROPOSAL_COLOUR, width: 3 }) }),
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
      ) : !grid || !proposals ? (
        <div role="alert" className="grid gap-2">
          <p>{localize('Grille de pentes inaccessible : aucun chemin proposé.')}</p>
          <Button size="sm" variant="outline" onClick={() => setLoaded(null)}>{localize('Réessayer')}</Button>
        </div>
      ) : (
        <>
          <ul className="grid gap-2">
            {proposals.map(({ scenario, proposal, measure }) => {
              const own = measureRoute(grid, drawn, scenario);
              return (
                <li key={scenario.id} className="grid gap-1 border bg-card p-2">
                  <label className="flex min-h-11 items-center gap-2 font-semibold">
                    <input
                      type="radio"
                      name="route-scenario"
                      checked={selected?.scenario.id === scenario.id}
                      disabled={!measure}
                      onChange={() => setChoice(scenario.id)}
                    />
                    {localize(scenarioNames[scenario.id])}
                    <span className="font-normal text-muted-foreground">
                      {localize('pente jusqu’à {{v0}}°, 1 m à {{v0}}° compte {{v1}} m à plat', { v0: scenario.maxSlopeDegrees, v1: 1 + scenario.slopeWeight })}
                    </span>
                  </label>
                  {proposal.status !== 'found' ? (
                    <p role="alert">{failureText(proposal, scenario, names)}</p>
                  ) : measure && (
                    <dl className="grid grid-cols-[auto_1fr] gap-x-3 tabular-nums">
                      <dt>{localize('Chemin proposé')}</dt>
                      <dd>{localize('{{v0}}, coût {{v1}} à plat', { v0: formatMetres(measure.metres), v1: formatMetres(measure.costMetres) })}</dd>
                      <dt>{localize('Tracé actuel')}</dt>
                      <dd>
                        {own.blockedMetres > 0.5
                          ? localize('{{v0}}, dont {{v1}} sur terrain fermé pour ce scénario : coût non comparable', { v0: formatMetres(own.metres), v1: formatMetres(own.blockedMetres) })
                          : localize('{{v0}}, coût {{v1}} à plat', { v0: formatMetres(own.metres), v1: formatMetres(own.costMetres) })}
                      </dd>
                    </dl>
                  )}
                </li>
              );
            })}
          </ul>
          {selected ? (
            <>
              <p className="flex items-center gap-2">
                <svg viewBox="0 0 40 12" className="w-10 shrink-0" aria-hidden="true"><path d="M0 6H40" stroke="#151b25" strokeWidth="6" /><path d="M0 6H40" stroke={PROPOSAL_COLOUR} strokeWidth="3" /></svg>
                {localize('Sur la carte : chemin proposé « {{v0}} ».', { v0: scenarioNames[selected.scenario.id] })}
              </p>
              <Button size="sm" onClick={() => selected.proposal.status === 'found' && dispatch({ type: 'routeLegsReplaced', legs: selected.proposal.legs })}>
                {localize('Appliquer ce chemin au parcours')}
              </Button>
            </>
          ) : (
            <p role="alert">{localize('Aucun scénario ne donne de chemin pour ce parcours.')}</p>
          )}
          <details>
            <summary className="min-h-11 cursor-pointer py-3 font-semibold">{localize('Hypothèses et limites')}</summary>
            <ul className="grid list-disc gap-1 pl-5">
              <li>{localize('Grille : {{v0}}, cellules de {{v1}} m. Le chemin ne sort jamais de cette grille.', { v0: grid.dataset.title, v1: grid.raster.pixelSizeMetres })}</li>
              <li>{localize('Coût : chaque mètre compte 1 + poids × pente / pente limite mètres à plat. Les poids et les pentes limites sont des hypothèses de scénario, pas des limites de combinaison.')}</li>
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
