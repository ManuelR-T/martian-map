import { useEffect, useState } from 'react';
import type Map from 'ol/Map';
import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import Draw from 'ol/interaction/Draw';
import Modify from 'ol/interaction/Modify';
import { Button, localize } from '@marps/ui';
import { missionGeometry } from '@marps/mission-core';
import { usePlannerDispatch, usePlannerState } from '../../state/PlannerProvider';
import { selectCurrentMission } from '../../state/planner';
import type { Extent } from '@marps/data';

/** Edit one leg at a time so camp and visits cannot drift away from the itinerary. */
export function MissionRouteEditor({ map, sector }: { map: Map | null; sector: Extent }) {
  const planner = usePlannerState();
  const dispatch = usePlannerDispatch();
  const mission = selectCurrentMission(planner);
  const [leg, setLeg] = useState(0);
  const [mode, setMode] = useState<'draw' | 'modify' | null>(null);
  const editable = planner.workspace === 'base' && !!mission.camp && mission.steps.length > 0;
  const index = Math.min(leg, mission.steps.length);
  const geometry = missionGeometry(mission);
  const outside = geometry?.coordinates.some(([x, y]) => x < sector.west || x > sector.east || y < sector.south || y > sector.north);
  useEffect(() => {
    if (!map || !mode || !editable || !mission.camp) return;
    const stops = [mission.camp.position, ...mission.steps.map(s => s.position), mission.camp.position];
    const from = stops[index]!; const to = stops[index + 1]!;
    const source = new VectorSource<Feature<LineString>>({ wrapX: false });
    const layer = new VectorLayer({ source, zIndex: 5 });
    map.addLayer(layer);
    const save = (coordinates: number[][]) => {
      dispatch({ type: 'routeLegChanged', index, vertices: coordinates.map(p => ({ longitude: p[0]!, latitude: p[1]! })) });
      setMode(null);
    };
    if (mode === 'modify') source.addFeature(new Feature(new LineString([from, ...(mission.routeLegs?.[index] ?? []), to].map(p => [p.longitude, p.latitude]))));
    const interaction = mode === 'draw' ? new Draw({ source, type: 'LineString', stopClick: true }) : new Modify({ source });
    if (interaction instanceof Draw) interaction.on('drawend', event => save((event.feature.getGeometry() as LineString).getCoordinates()));
    if (interaction instanceof Modify) interaction.on('modifyend', () => save(source.getFeatures()[0]!.getGeometry()!.getCoordinates().slice(1, -1)));
    map.addInteraction(interaction);
    const cancel = (event: KeyboardEvent) => { if (event.key === 'Escape') setMode(null); };
    window.addEventListener('keydown', cancel);
    return () => { window.removeEventListener('keydown', cancel); map.removeInteraction(interaction); map.removeLayer(layer); };
  }, [map, mode, editable, mission, index, dispatch]);
  return <div className="grid gap-2 border-t py-2 text-xs">
    <p>{localize('Parcours hypothétique · terrain non validé.')}</p>
    <p>{localize('Retour au camp inclus une fois. Changer le camp ou les étapes réinitialise tous les segments directs.')}</p>
    {outside && <p role="status">{localize('Parcours hors couverture : données de terrain incomplètes.')}</p>}
    {planner.workspace === 'base' && mission.camp && mission.steps.length === 0 && planner.catalog.status === 'ready' && <Button size="sm" onClick={() => {
      if (planner.catalog.status !== 'ready') return;
      planner.catalog.data.sites.filter(site => site.regionId === mission.regionId).slice(0, 3).forEach(site => dispatch({ type: 'stepAdded', step: { id: `demo-${site.id}`, siteId: site.id, name: site.name, position: site.coordinate, activities: [] } }));
    }}>{localize('Démonstration : visiter les trois sites')}</Button>}
    {editable && <>
      <label>{localize('Segment à éditer')}<select className="min-h-11 w-full bg-card" value={index} onChange={e => { setLeg(Number(e.target.value)); setMode(null); }}>
        {mission.steps.map((step, i) => <option key={step.id} value={i}>{i + 1} · {step.name}</option>)}
        <option value={mission.steps.length}>{localize('Retour au camp')}</option>
      </select></label>
      <p>{localize('Dessiner les points intermédiaires, double-cliquer pour terminer. Les extrémités restent fixées aux visites. Échap annule.')}</p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => setMode('draw')}>{localize('Dessiner')}</Button>
        <Button size="sm" onClick={() => setMode('modify')}>{localize('Modifier')}</Button>
        <Button size="sm" onClick={() => setMode(null)}>{localize('Annuler')}</Button>
        <Button size="sm" onClick={() => { setMode(null); dispatch({ type: 'routeReset' }); }}>{localize('Segments directs')}</Button>
      </div>
      {mode && <p role="status">{localize(mode === 'draw' ? 'Dessin en cours' : 'Déplacer un point ou insérer un sommet sur le segment.')}</p>}
    </>}
  </div>;
}
