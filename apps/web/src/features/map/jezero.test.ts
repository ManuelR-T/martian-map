import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import type { DataManifest } from '@marps/data';
import { resolveJezeroTile, marsHorizontalResolution } from './jezero';
const manifest = JSON.parse(readFileSync('apps/web/public/data/manifest.json', 'utf8')) as DataManifest;
const dataset = manifest.datasets.find(item => item.kind === 'imagery')!;
it('prefers prepared tiles and streams only valid product tiles', () => {
  expect(resolveJezeroTile(dataset, [12, 5857, 1627])?.kind).toBe('prepared');
  expect(resolveJezeroTile(dataset, [17, 187440, 52100])?.kind).toBe('remote');
  expect(resolveJezeroTile(dataset, [17, 0, 0])).toBeUndefined();
  expect(resolveJezeroTile(dataset, [18, 374880, 104200])).toBeUndefined();
  expect(resolveJezeroTile(dataset, [12, 5857, 1627])?.url).toBe('/data/jezero/hirise/12/1627/5857.png');
});
it('uses the Mars radius and latitude for horizontal metres', () => {
  expect(marsHorizontalResolution(1, 0, 3396190)).toBeCloseTo(59274.6975, 2);
  expect(marsHorizontalResolution(1, 60, 3396190)).toBeCloseTo(29637.3488, 2);
});
it('retains declared site positions within the unchanged mission sector', () => {
  const sector = manifest.regions.find(region => region.id === 'jezero')!.extent;
  expect(sector).toEqual({ west: 77.395, east: 77.412, south: 18.445, north: 18.465 });
  for (const site of manifest.sites) {
    expect(site.coordinate.longitude).toBeGreaterThan(sector.west);
    expect(site.coordinate.longitude).toBeLessThan(sector.east);
  }
});
it('rejects malformed matrix coordinates and keeps remote URL row/column order', () => {
  expect(resolveJezeroTile(dataset, [17, NaN, 52100])).toBeUndefined();
  expect(resolveJezeroTile(dataset, [17, -1, 52100])).toBeUndefined();
  expect(resolveJezeroTile(dataset, [17, 187440, 52100])?.url).toContain('/17/52100/187440.png');
  expect(dataset.wmts!.matrices.map(matrix => matrix.id)).toEqual(Array.from({ length: 18 }, (_, level) => String(level)));
});
