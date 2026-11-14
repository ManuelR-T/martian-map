import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import LineString from 'ol/geom/LineString';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Circle, Fill, Stroke, Style } from 'ol/style';
import type { RoverHistory, RoverFeature } from '@marps/data';
export function roverLabel(feature: RoverFeature): string {
  const p = feature.properties;
  return `Sol ${p.sol} · ${p.RMC ?? `${p.fromRMC} → ${p.toRMC}`}`;
}
export function createRoverLayers(history: RoverHistory, selected: number | null = null) {
  return new VectorLayer({ zIndex: 2, source: new VectorSource({ wrapX: false, features: history.features.map((entry, index) => {
    const geometry = entry.geometry.type === 'Point' ? new Point((entry.geometry.coordinates as number[]).slice(0, 2)) : new LineString((entry.geometry.coordinates as number[][]).map(p => p.slice(0, 2)));
    const feature = new Feature(geometry);
    feature.set('roverIndex', index);
    if (index === selected) feature.setStyle(new Style({ stroke: new Stroke({ color: '#fff', width: 5, lineDash: [6, 4] }), image: new Circle({ radius: 8, fill: new Fill({ color: '#df8bff' }), stroke: new Stroke({ color: '#fff', width: 3 }) }) }));
    return feature;
  }) }), style: new Style({ stroke: new Stroke({ color: '#df8bff', width: 3, lineDash: [6, 4] }), image: new Circle({ radius: 4, fill: new Fill({ color: '#df8bff' }), stroke: new Stroke({ color: '#161522', width: 2 }) }) }) });
}
