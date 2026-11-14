import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { capabilityStatus, loadManifest, type DataManifest, type DataStatus } from './index';

const committed = JSON.parse(
  readFileSync(new URL('../../../apps/web/public/data/manifest.json', import.meta.url), 'utf8'),
) as DataManifest;

function manifestWith(datasetStatus: DataStatus, datasetRegion = 'jezero'): DataManifest {
  return {
    schemaVersion: 1,
    regions: [
      { id: 'jezero', capabilities: [
        { id: 'imagery', status: 'available', datasetIds: ['hirise'] },
        { id: 'empty', status: 'available', datasetIds: [] },
      ] },
    ],
    datasets: [{ id: 'hirise', regionId: datasetRegion, status: datasetStatus }],
  } as unknown as DataManifest;
}

describe('capabilityStatus', () => {
  it('reports an available capability backed by available data', () => {
    expect(capabilityStatus(manifestWith('available'), 'jezero', 'imagery')).toBe('available');
  });

  it('is limited by the weakest dataset', () => {
    expect(capabilityStatus(manifestWith('partial'), 'jezero', 'imagery')).toBe('partial');
    expect(capabilityStatus(manifestWith('unavailable'), 'jezero', 'imagery')).toBe('unavailable');
  });

  it('refuses data that belongs to another region, such as a basemap', () => {
    expect(capabilityStatus(manifestWith('available', 'global'), 'jezero', 'imagery')).toBe('unavailable');
  });

  it.each([
    ['jezero', 'empty'],
    ['jezero', 'unknown'],
    ['elsewhere', 'imagery'],
  ])('treats %s / %s as unavailable', (regionId, capabilityId) => {
    expect(capabilityStatus(manifestWith('available'), regionId, capabilityId)).toBe('unavailable');
  });
});

describe('committed manifest', () => {
  it('exposes the global basemap as orientation only', () => {
    expect(capabilityStatus(committed, 'global', 'orientation-basemap')).toBe('available');
    expect(capabilityStatus(committed, 'global', 'imagery-hirise')).toBe('unavailable');
    expect(committed.regions.find((region) => region.id === 'global')?.kind).toBe('orientation');
  });

  it('enables Jezero detail only where data was frozen', () => {
    for (const id of ['imagery-hirise', 'terrain-dem', 'science-sites']) {
      expect(capabilityStatus(committed, 'jezero', id)).not.toBe('unavailable');
    }
    for (const id of ['rover-traverse', 'thermal-themis', 'weather-meda', 'geology']) {
      expect(capabilityStatus(committed, 'jezero', id)).toBe('unavailable');
    }
  });

  it('lists the three stops inside the Jezero sector', () => {
    const jezero = committed.regions.find((region) => region.id === 'jezero');
    expect(committed.sites.map((site) => site.name)).toEqual(['Skinner Ridge', 'Wildcat Ridge', 'Amalik']);
    for (const { coordinate } of committed.sites) {
      expect(coordinate.longitude).toBeGreaterThan(jezero!.extent.west);
      expect(coordinate.longitude).toBeLessThan(jezero!.extent.east);
      expect(coordinate.latitude).toBeGreaterThan(jezero!.extent.south);
      expect(coordinate.latitude).toBeLessThan(jezero!.extent.north);
    }
  });
});

describe('loadManifest', () => {
  const respond = (body: unknown, status = 200) => (async () => new Response(JSON.stringify(body), { status })) as typeof fetch;

  it('returns the manifest served under the base URL', async () => {
    expect(await loadManifest('/data/', respond(committed))).toEqual(committed);
  });

  it('fails on an HTTP error', async () => {
    await expect(loadManifest('/data/', respond({}, 404))).rejects.toThrow('HTTP 404');
  });

  it('rejects an unknown schema version', async () => {
    await expect(loadManifest('/data/', respond({ ...committed, schemaVersion: 99 }))).rejects.toThrow('version 99');
  });
});
