import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import type LineString from 'ol/geom/LineString';
import type { DataManifest } from '@marps/data';
import { createHillshadeLayer, routeFeatures } from './terrainLayers';

const manifest = JSON.parse(readFileSync(new URL('../../public/data/manifest.json', import.meta.url), 'utf8')) as DataManifest;
const hillshade = manifest.datasets.find((dataset) => dataset.id === 'jezero-hirise-hillshade')!;

it('keeps the shaded relief off until the crew turns it on, stretched exactly over the relief it was computed from', () => {
  const layer = createHillshadeLayer(hillshade);
  const source = layer.getSource()!;
  expect(layer.getVisible()).toBe(false);
  expect(source.getUrl()).toBe('/data/jezero/dem/hirise-4m-hillshade.png');
  const { west, south, east, north } = manifest.datasets.find((dataset) => dataset.id === hillshade.derivedFrom)!.extent;
  expect(source.getImageExtent()).toEqual([west, south, east, north]);
});

it('draws the route through every stop and each steep stretch over it', () => {
  const skinner = { longitude: 77.4, latitude: 18.455 };
  const amalik = { longitude: 77.4, latitude: 18.445 };
  const steep = [skinner, { longitude: 77.4, latitude: 18.452 }];
  const features = routeFeatures([skinner, amalik, skinner], [steep, [amalik]]);
  expect(features.map((feature) => feature.get('kind'))).toEqual(['route', 'steep']);
  expect((features[0]!.getGeometry() as LineString).getCoordinates()).toEqual([
    [77.4, 18.455],
    [77.4, 18.445],
    [77.4, 18.455],
  ]);
});
