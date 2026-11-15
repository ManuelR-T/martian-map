import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { findGeologyDataset, loadGeologyUnits, type DataManifest } from './index';

const root = new URL('../../../apps/web/public/data/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('manifest.json', root), 'utf8')) as DataManifest;
const dataset = findGeologyDataset(manifest, 'jezero')!;
const frozen = (path: string) => readFileSync(new URL(path.replace(/^\/data\//, ''), root), 'utf8');
const serve = (body: string) => (async () => new Response(body)) as unknown as typeof fetch;

describe('geologic map', () => {
  it('is offered for Jezero only, and only while the manifest declares it', () => {
    expect(dataset.kind).toBe('geology');
    expect(dataset.geology.interpretive).toBe(true);
    expect(findGeologyDataset(manifest, 'global')).toBeUndefined();
    const withdrawn = { ...manifest, regions: manifest.regions.map(region => ({ ...region,
      capabilities: region.capabilities.map(c => c.id === 'geology' ? { ...c, status: 'unavailable' as const, datasetIds: [] } : c) })) };
    expect(findGeologyDataset(withdrawn, 'jezero')).toBeUndefined();
  });

  it('loads every frozen unit with a legend entry', async () => {
    const units = await loadGeologyUnits(dataset, undefined, (async (url: string) => new Response(frozen(url))) as unknown as typeof fetch);
    const legend = dataset.geology.units.map(unit => unit.symbol);
    expect(units.map(unit => unit.symbol).sort()).toEqual(legend.filter(symbol => dataset.geology.units.find(u => u.symbol === symbol)!.sectorShare > 0).sort());
  });

  it('never assigns a stop to a unit while another lies within the registration offset', () => {
    for (const entry of dataset.geology.sites) {
      const close = entry.candidates.filter(c => c.distanceMetres <= dataset.geology.registration.offsetMetres.max);
      if (close.length !== 1) expect(entry.assignedSymbol).toBeNull();
    }
    expect(dataset.geology.sites.map(entry => entry.siteId).sort()).toEqual(manifest.sites.map(site => site.id).sort());
  });

  it('rejects a unit missing from the legend or a broken geometry', async () => {
    const feature = (symbol: string, coordinates: unknown) => JSON.stringify({ type: 'FeatureCollection', features: [{ type: 'Feature', properties: { symbol }, geometry: { type: 'MultiPolygon', coordinates } }] });
    const ring = [[77.4, 18.45], [77.41, 18.45], [77.41, 18.46], [77.4, 18.45]];
    await expect(loadGeologyUnits(dataset, undefined, serve(feature('Xx', [[ring]])))).rejects.toThrow('legend');
    await expect(loadGeologyUnits(dataset, undefined, serve(feature('Njf', [[[[77.4, Number.NaN]]]])))).rejects.toThrow('geometry');
  });
});
