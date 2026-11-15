import Feature from 'ol/Feature';
import MultiPolygon from 'ol/geom/MultiPolygon';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Fill, Stroke, Style } from 'ol/style';
import type { GeologicUnitShape, GeologyDataset } from '@marps/data';

export interface GeologySettings {
  readonly visible: boolean;
  /** 0 to 1. */
  readonly opacity: number;
}

/** Hidden by default: an interpretive map must be asked for, never mistaken for the terrain. */
export const geologyDefaults: GeologySettings = { visible: false, opacity: 0.5 };

/**
 * Units filled with their legend colour and a dashed outline: the outline is a
 * 1:75,000 contact that may be 200 m off, so it is drawn thin and dashed, never as a hard edge.
 */
export function createGeologyLayer(dataset: GeologyDataset, units: readonly GeologicUnitShape[]): VectorLayer<VectorSource> {
  const colours = new Map(dataset.geology.units.map(unit => [unit.symbol, unit.colour]));
  // The layer opacity (the slider) makes the fill see-through; the colours stay those of the legend.
  const styles = new Map([...colours].map(([symbol, colour]) => [symbol, new Style({
    fill: new Fill({ color: colour }),
    stroke: new Stroke({ color: '#151b25', width: 1.5, lineDash: [6, 4] }),
  })]));
  const features = units.map(unit => {
    const feature = new Feature(new MultiPolygon(unit.polygons.map(polygon => polygon.map(ring => ring.map(point => [...point])))));
    feature.set('geologicUnit', unit.symbol);
    feature.setStyle(styles.get(unit.symbol));
    return feature;
  });
  // Above imagery and night infrared, below the rover traverse (2) and the sites (3).
  return new VectorLayer({ zIndex: 1, source: new VectorSource({ features, wrapX: false }), ...geologyDefaults });
}

export function applyGeologySettings(layer: VectorLayer<VectorSource>, settings: GeologySettings): void {
  layer.setVisible(settings.visible);
  layer.setOpacity(settings.opacity);
}
