import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import LineString from 'ol/geom/LineString';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Circle, Fill, Stroke, Style, Text } from 'ol/style';
import { missionGeometry, type Mission } from '@marps/mission-core';

export function createMissionLayer(mission: Mission) {
  const features: Feature[] = [];
  const route = missionGeometry(mission);
  if (route) {
    const feature = new Feature(new LineString(route.coordinates.map(c => [...c])));
    feature.setStyle(new Style({ stroke: new Stroke({ color: '#50c8ff', width: 3, lineDash: [8, 6] }) }));
    features.push(feature);
  }
  const points = [...(mission.camp ? [{ position: mission.camp.position, label: 'Camp · simulation' }] : []),
    ...mission.steps.map((step, index) => ({ position: step.position, label: String(index + 1) }))];
  points.forEach(p => {
    const feature = new Feature(new Point([p.position.longitude, p.position.latitude]));
    feature.setStyle(new Style({ image: new Circle({ radius: 10, fill: new Fill({ color: '#151b25' }), stroke: new Stroke({ color: '#50c8ff', width: 2 }) }),
      text: new Text({ text: p.label, offsetY: -22, fill: new Fill({ color: '#fff' }), stroke: new Stroke({ color: '#151b25', width: 4 }) }) }));
    features.push(feature);
  });
  return new VectorLayer({ zIndex: 2, source: new VectorSource({ features, wrapX: false }) });
}
