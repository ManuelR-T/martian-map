import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Stroke, Style } from 'ol/style';
import { missionGeometry, type Mission } from '@marps/mission-core';

/** Screen-spaced chevrons built along the route tangent, including when the map rotates. */
export function routeArrowStyles(route: LineString, resolution: number): Style[] {
  if (!Number.isFinite(resolution) || resolution <= 0) return [];
  const styles: Style[] = [];
  let nextPixels = 45;
  let traveledPixels = 0;
  route.forEachSegment((from, to) => {
    const dx = to[0]! - from[0]!, dy = to[1]! - from[1]!;
    const length = Math.hypot(dx, dy);
    if (length === 0) return;
    const pixels = length / resolution;
    while (nextPixels < traveledPixels + pixels && styles.length < 500) {
      const fraction = (nextPixels - traveledPixels) / pixels;
      const tipX = from[0]! + dx * fraction, tipY = from[1]! + dy * fraction;
      const alongX = dx / length * resolution, alongY = dy / length * resolution;
      const chevron = new LineString([
        [tipX - alongX * 8 - alongY * 5, tipY - alongY * 8 + alongX * 5],
        [tipX, tipY],
        [tipX - alongX * 8 + alongY * 5, tipY - alongY * 8 - alongX * 5],
      ]);
      styles.push(
        new Style({ geometry: chevron, stroke: new Stroke({ color: '#151b25', width: 6, lineCap: 'round', lineJoin: 'round' }) }),
        new Style({ geometry: chevron, stroke: new Stroke({ color: '#fff', width: 2.5, lineCap: 'round', lineJoin: 'round' }) }),
      );
      nextPixels += 90;
    }
    traveledPixels += pixels;
  });
  return styles;
}

export function createRouteArrowLayer(mission: Mission) {
  const geometry = missionGeometry(mission);
  const route = geometry ? new LineString(geometry.coordinates.map(coordinate => [...coordinate])) : null;
  return new VectorLayer({ zIndex: 3.75, source: new VectorSource({ wrapX: false, features: route ? [new Feature(route)] : [] }),
    style: (_feature, resolution) => route ? routeArrowStyles(route, resolution) : [] });
}
