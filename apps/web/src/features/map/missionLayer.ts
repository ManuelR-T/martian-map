import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import LineString from 'ol/geom/LineString';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Circle, Fill, Stroke, Style, Text } from 'ol/style';
import { MAP_LABEL_FONT, MISSION_COLOUR, mapLabel } from './mapText';
import { missionGeometry, type Mission } from '@marps/mission-core';

export function createMissionLayer(mission: Mission) {
  const features: Feature[] = [];
  const route = missionGeometry(mission);
  if (route) {
    const feature = new Feature(new LineString(route.coordinates.map(c => [...c])));
    feature.setStyle(new Style({ stroke: new Stroke({ color: MISSION_COLOUR, width: 3, lineDash: [8, 6] }) }));
    features.push(feature);
  }
  // The camp is named under its marker; each step carries its number inside it, so site names stay readable.
  const points = [...(mission.camp ? [{ position: mission.camp.position, label: 'Camp · simulation', camp: true }] : []),
    ...mission.steps.map((step, index) => ({ position: step.position, label: String(index + 1), camp: false }))];
  points.forEach(p => {
    const feature = new Feature(new Point([p.position.longitude, p.position.latitude]));
    feature.setStyle(new Style({ image: new Circle({ radius: 11, fill: new Fill({ color: '#151b25' }), stroke: new Stroke({ color: MISSION_COLOUR, width: 2 }), declutterMode: 'none' }),
      text: p.camp ? mapLabel(p.label, 26) : new Text({ text: p.label, font: MAP_LABEL_FONT, fill: new Fill({ color: '#fff' }) }) }));
    features.push(feature);
  });
  return new VectorLayer({ zIndex: 2, declutter: true, source: new VectorSource({ features, wrapX: false }) });
}
