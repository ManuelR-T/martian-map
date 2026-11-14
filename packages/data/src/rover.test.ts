import { afterEach, expect, it, vi } from 'vitest';
import { loadRoverHistory } from './rover';
import type { DatasetDescriptor } from './contracts';
const datasets = ['waypoints', 'traverse'].map(label => ({ kind: `rover-${label}`, regionId: 'jezero', delivery: 'local', status: 'partial', source: { retrievedAt: '2026-11-14T00:00:00Z' }, files: [{ path: `jezero/rover/${label}.geojson` }] })) as DatasetDescriptor[];
afterEach(() => vi.unstubAllGlobals());
it('rejects an absent history without requesting NASA', async () => {
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
  await expect(loadRoverHistory([])).rejects.toThrow();
  expect(fetcher).not.toHaveBeenCalled();
});
it('loads local original points and separate segments', async () => {
  const point = { type: 'Feature', properties: { sol: 501, RMC: '26_1004' }, geometry: { type: 'Point', coordinates: [77.4, 18.45, -2500] } };
  const line = { type: 'Feature', properties: { sol: 501, fromRMC: 'a', toRMC: 'b' }, geometry: { type: 'LineString', coordinates: [[77.4, 18.45], [77.41, 18.46]] } };
  const fetcher = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ type: 'FeatureCollection', features: [point] }) }).mockResolvedValueOnce({ ok: true, json: async () => ({ type: 'FeatureCollection', features: [line, line] }) });
  vi.stubGlobal('fetch', fetcher);
  const history = await loadRoverHistory(datasets);
  expect(history.features).toEqual([point, line, line]);
  expect(fetcher.mock.calls.map(call => call[0])).toEqual(['/data/jezero/rover/waypoints.geojson', '/data/jezero/rover/traverse.geojson']);
});
it('rejects HTTP failures and malformed geometry', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
  await expect(loadRoverHistory(datasets)).rejects.toThrow();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ type: 'FeatureCollection', features: [{ type: 'Feature', properties: { sol: 1, RMC: 'a' }, geometry: { type: 'Point', coordinates: [999, 0] } }] }) }));
  await expect(loadRoverHistory(datasets)).rejects.toThrow('Invalid rover coordinates');
});
