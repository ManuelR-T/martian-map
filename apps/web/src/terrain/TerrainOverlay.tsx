import { useEffect, useId, useMemo, useState } from 'react';
import type Map from 'ol/Map';
import TileLayer from 'ol/layer/Tile';
import { hillshadeFor } from '@marps/data';
import { pointAtDistance, steepStretches } from '@marps/mission-core';
import { Mountain } from 'lucide-react';
import { LayerSwitch } from '../features/map/LayerSwitch';
import { usePlannerState } from '../state/PlannerProvider';
import { useRouteProfile } from './RouteProfileProvider';
import {
  HILLSHADE_DEFAULT_OPACITY,
  ROUTE_COLOUR,
  STEEP_COLOUR,
  createHillshadeLayer,
  focusFeature,
  overlayLayer,
  routeFeatures,
} from './terrainLayers';

/**
 * Relief and route on the Jezero map: shaded relief (off by default), the demo route with
 * its steep stretches, and the point designated on the profile. Kept out of JezeroMap so
 * the map file only hands over its instance.
 */
export function TerrainOverlay({ map }: { map: Map | null }) {
  const { catalog } = usePlannerState();
  const { dem, stops, relief, threshold, focusMetres } = useRouteProfile();
  const [shaded, setShaded] = useState(false);
  const [opacity, setOpacity] = useState(HILLSHADE_DEFAULT_OPACITY);
  const opacityId = useId();
  const hillshade = catalog.status === 'ready' && dem ? hillshadeFor(catalog.data, dem) : null;
  const hillshadeLayer = useMemo(() => (hillshade ? createHillshadeLayer(hillshade) : null), [hillshade]);
  const routeLayer = useMemo(() => overlayLayer(2.5), []);
  const focusLayer = useMemo(() => overlayLayer(4), []);
  const profile = relief?.status === 'ready' ? relief.profile : null;
  const steep = relief?.status === 'ready' ? relief.steep : null;

  useEffect(() => {
    if (!map) return;
    const layers = map.getLayers();
    // Just above the imagery tiles: the sector outlines, route and sites stay on top.
    if (hillshadeLayer) layers.insertAt(layers.getArray().filter((layer) => layer instanceof TileLayer).length, hillshadeLayer);
    map.addLayer(routeLayer);
    map.addLayer(focusLayer);
    return () => {
      if (hillshadeLayer) map.removeLayer(hillshadeLayer);
      map.removeLayer(routeLayer);
      map.removeLayer(focusLayer);
    };
  }, [map, hillshadeLayer, routeLayer, focusLayer]);

  useEffect(() => {
    hillshadeLayer?.setVisible(shaded);
    hillshadeLayer?.setOpacity(opacity);
  }, [hillshadeLayer, shaded, opacity]);

  useEffect(() => {
    const source = routeLayer.getSource()!;
    source.clear();
    if (stops.length < 2) return;
    source.addFeatures(routeFeatures(stops.map((stop) => stop.coordinate), profile && steep ? steepStretches(profile, steep) : []));
  }, [routeLayer, stops, profile, steep]);

  useEffect(() => {
    const source = focusLayer.getSource()!;
    source.clear();
    const point = profile && focusMetres !== null ? pointAtDistance(profile, focusMetres) : null;
    if (point) source.addFeature(focusFeature(point));
  }, [focusLayer, profile, focusMetres]);

  if (stops.length < 2 && !hillshade) return null;

  return (
    <div className="grid gap-2 text-xs">
      {hillshade && (
        <>
          <LayerSwitch label="Relief ombré" icon={<Mountain aria-hidden="true" />} checked={shaded} onChange={setShaded} />
          {shaded && (
            <>
              <label htmlFor={opacityId} className="flex items-center gap-2">
                Opacité
                <input
                  id={opacityId}
                  type="range"
                  min={0.2}
                  max={1}
                  step={0.1}
                  value={opacity}
                  onChange={(event) => setOpacity(Number(event.target.value))}
                  className="min-h-11 flex-1 accent-primary"
                />
                <span className="w-11 shrink-0 text-right tabular-nums">{Math.round(opacity * 100)} %</span>
              </label>
              <p className="flex items-center gap-2">
                <span aria-hidden="true" className="h-3 w-10 shrink-0 border bg-linear-to-r from-black to-white" />
                Sombre : versant à l'ombre. Clair : versant éclairé.
              </p>
              <p className="text-muted-foreground">
                {hillshade.resolution ? `${hillshade.resolution.value} m par pixel · ` : ''}
                Éclairage fictif venant du nord-ouest, aide visuelle et non mesure.
              </p>
              <a href={hillshade.source.url} className="text-muted-foreground underline">
                {hillshade.source.credit}
              </a>
            </>
          )}
        </>
      )}
      {stops.length >= 2 && (
        <ul className="grid gap-1" aria-label="Légende du parcours">
          <li className="flex items-center gap-2">
            <svg viewBox="0 0 40 12" className="w-10 shrink-0" aria-hidden="true"><path d="M0 6H40" stroke="#151b25" strokeWidth="6" /><path d="M0 6H40" stroke={ROUTE_COLOUR} strokeWidth="3" /></svg>
            Parcours de démonstration
          </li>
          {profile && (
            <li className="flex items-center gap-2">
              <svg viewBox="0 0 40 12" className="w-10 shrink-0" aria-hidden="true"><path d="M0 6H40" stroke="#151b25" strokeWidth="8" /><path d="M0 6H40" stroke={STEEP_COLOUR} strokeWidth="5" /></svg>
              Pente au-delà de {threshold}°
            </li>
          )}
          {profile && (
            <li className="flex items-center gap-2">
              <svg viewBox="0 0 40 20" className="w-10 shrink-0" aria-hidden="true"><path d="M20 2L28 10L20 18L12 10Z" fill="#fff" stroke="#151b25" strokeWidth="3" /></svg>
              Point touché sur le profil
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
