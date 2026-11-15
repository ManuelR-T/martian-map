import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import Polygon from 'ol/geom/Polygon';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Fill, RegularShape, Stroke, Style } from 'ol/style';
import type { TerrainAnnotationCollection } from '@marps/data';
const style = (selected: boolean) => new Style({
  stroke: new Stroke({ color: selected ? '#fff' : '#50c8ff', width: selected ? 3 : 2, lineDash: [3, 5] }),
  fill: new Fill({ color: 'rgba(80,200,255,0.08)' }),
  image: new RegularShape({ points: 3, radius: selected ? 12 : 10, fill: new Fill({ color: '#151b25' }), stroke: new Stroke({ color: selected ? '#fff' : '#50c8ff', width: 3 }) }),
});
const normal = style(false), highlighted = style(true);
export function createTerrainAnnotationLayer(collection: TerrainAnnotationCollection) {
  const layer: VectorLayer = new VectorLayer({ zIndex: 2.25, source: new VectorSource({ wrapX: false, features: collection.features.map(annotation => {
    const geometry = annotation.geometry;
    const feature = new Feature(geometry.type === 'Point' ? new Point([...geometry.coordinates]) : new Polygon(geometry.coordinates.map(ring => ring.map(position => [...position]))));
    feature.setId(`annotation:${annotation.id}`);
    feature.set('annotationId', annotation.id);
    return feature;
  }) }), style: feature => feature.get('annotationId') === layer.get('selectedAnnotationId') ? highlighted : normal });
  return layer;
}
