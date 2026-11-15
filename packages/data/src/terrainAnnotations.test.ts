import { readFileSync } from 'node:fs';
import { expect, it, vi } from 'vitest';
import type { DataManifest } from './contracts';
import { findTerrainAnnotationDataset, loadTerrainAnnotations, validateTerrainAnnotations } from './terrainAnnotations';
const manifest = JSON.parse(readFileSync('apps/web/public/data/manifest.json', 'utf8')) as DataManifest;
const collection = JSON.parse(readFileSync('data/research/jezero-terrain-annotations.geojson', 'utf8'));
it('validates the curated evidence without treating global imagery as coverage', () => {
  expect(validateTerrainAnnotations(collection, manifest).features).toHaveLength(3);
  expect(findTerrainAnnotationDataset(manifest, 'global')).toBeUndefined();
});
it.each(['duplicate', 'coordinate', 'source', 'uncertainty', 'path', 'category', 'pixels'])('rejects invalid %s', kind => {
  const invalid = structuredClone(collection);
  const feature = invalid.features[0];
  if (kind === 'duplicate') invalid.features.push(feature);
  if (kind === 'coordinate') feature.geometry.coordinates.reverse();
  if (kind === 'source') feature.properties.imageryVersion = 'other';
  if (kind === 'uncertainty') feature.properties.registration.positionalUncertaintyMetres = 0;
  if (kind === 'path') feature.properties.evidenceFiles = ['../image.png'];
  if (kind === 'pixels') feature.properties.evidenceSha256[feature.properties.evidenceFiles[0]] = 'changed';
  if (kind === 'category') feature.properties.category = 'safe';
  expect(() => validateTerrainAnnotations(invalid, manifest)).toThrow();
});
it('loads only the declared local resource and reports failure', async () => {
  const fetcher = vi.fn(async () => new Response(JSON.stringify(collection)));
  expect((await loadTerrainAnnotations(manifest, 'jezero', undefined, fetcher)).features).toHaveLength(3);
  expect(fetcher.mock.calls).toHaveLength(1);
  await expect(loadTerrainAnnotations(manifest, 'jezero', undefined, async () => new Response('', { status: 404 }))).rejects.toThrow();
});
it('accepts simple approximate polygons but rejects degenerate and intersecting rings', () => {
  const value = structuredClone(collection);
  const ring = [[77.407,18.456], [77.408,18.456], [77.408,18.457], [77.407,18.457], [77.407,18.456]];
  value.features[0].geometry = { type: 'Polygon', coordinates: [ring] };
  expect(validateTerrainAnnotations(value, manifest).features).toHaveLength(3);
  value.features[0].geometry.coordinates[0] = [ring[0],ring[2],ring[1],ring[3],ring[0]];
  expect(() => validateTerrainAnnotations(value, manifest)).toThrow();
});
it('rejects an unavailable, remote or wrong-region capability and aborts without fetching', async () => {
  for (const change of [{ status: 'unavailable' }, { delivery: 'remote' }, { regionId: 'global' }]) {
    const invalid = structuredClone(manifest);
    Object.assign(invalid.datasets.find(dataset => dataset.kind === 'terrain-annotations')!, change);
    expect(findTerrainAnnotationDataset(invalid, 'jezero')).toBeUndefined();
  }
  const fetcher = vi.fn();
  const controller = new AbortController(); controller.abort();
  await expect(loadTerrainAnnotations(manifest, 'jezero', controller.signal, fetcher)).rejects.toThrow();
  expect(fetcher).not.toHaveBeenCalled();
  await expect(loadTerrainAnnotations(manifest, 'jezero', undefined, async () => new Response('{'))).rejects.toThrow();
});
