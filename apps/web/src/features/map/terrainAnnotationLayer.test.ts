import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import type { TerrainAnnotationCollection } from '@marps/data';
import { createTerrainAnnotationLayer } from './terrainAnnotationLayer';
it('keeps Mars coordinates and annotation identity separate from sites and rover features', () => {
 const collection = JSON.parse(readFileSync('data/research/jezero-terrain-annotations.geojson', 'utf8')) as TerrainAnnotationCollection;
 const layer = createTerrainAnnotationLayer(collection);
 const feature = layer.getSource()!.getFeatures()[0]!;
 expect(feature.get('annotationId')).toBe('ripple-field');
 expect(feature.getId()).toBe('annotation:ripple-field');
 expect(feature.get('roverIndex')).toBeUndefined();
 expect(feature.getGeometry()!.getExtent().slice(0, 2)).toEqual([77.40767240524292, 18.456687927246094]);
 expect(layer.getZIndex()).toBeLessThan(2.5);
});
