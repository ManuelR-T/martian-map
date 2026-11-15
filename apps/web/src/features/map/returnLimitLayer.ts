import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import Point from 'ol/geom/Point';
import { Fill, RegularShape, Stroke, Style } from 'ol/style';
import type { MissionReturnLimit } from '@marps/mission-core';
export function returnLimitFeatures(result: MissionReturnLimit, selected: string | null) {
  if (result.status !== 'ready') return [];
  const features: Feature[] = result.portions.filter(p => p.from.distanceMetres !== p.to.distanceMetres).map(p => {
    const feature = new Feature(new LineString([p.from.coordinate, p.to.coordinate].map(c => [c.longitude, c.latitude])));
    feature.set('kind', p.state);
    feature.setStyle([new Style({ stroke: new Stroke({ color: '#151b25', width: 9 }) }), new Style({ stroke: new Stroke({ color: p.state === 'reserve-reached' ? '#ff4d4d' : p.state === 'indeterminate' ? '#ffffff' : '#50c8ff', width: 4, lineDash: p.state === 'positive' ? undefined : p.state === 'reserve-reached' ? [10, 7] : [2, 7] }) })]);
    return feature;
  });
  const markers = [...result.crossings, ...(result.initial.state === 'reserve-reached' ? [{ ...result.initial, id: 'initial' }] : [])];
  for (const crossing of markers) {
    const feature = new Feature(new Point([crossing.coordinate.longitude, crossing.coordinate.latitude]));
    feature.set('returnEventId', crossing.id);
    feature.setStyle(new Style({ zIndex: 10, image: new RegularShape({ points: 3, radius: selected === crossing.id ? 17 : 12, fill: new Fill({ color: selected === crossing.id ? '#50c8ff' : '#fff' }), stroke: new Stroke({ color: '#151b25', width: 3 }) }) }));
    features.push(feature);
  }
  return features;
}
