import { expect, it } from 'vitest';
import { createGlobalMarsSource, marsProjection, resolutions } from './marsWmts';

it('uses the Mars geographic grid, including bounded polar tiles', () => {
  const grid = createGlobalMarsSource().getTileGrid()!;
  expect(marsProjection.getCode()).toBe('MARS:104905');
  expect(resolutions[0]).toBe(0.703125);
  expect(resolutions[7]).toBe(0.0054931640625);
  expect(grid.getFullTileRange(0)?.getSize()).toEqual([2, 1]);
  expect(grid.getFullTileRange(7)?.getSize()).toEqual([256, 128]);
  expect(grid.getTileCoordForCoordAndZ([77.58, 18.44], 0)).toEqual([0, 1, 0]);
  expect(grid.getOrigin(0)).toEqual([-180, 90]);
});

it('uses manifest URLs and never requests local Jezero tiles outside frozen ranges', async () => {
  const { readFile } = await import('node:fs/promises');
  const { createRegionSource } = await import('./marsWmts');
  const manifest = JSON.parse(await readFile('apps/web/public/data/manifest.json', 'utf8'));
  const dataset = manifest.datasets.find((item: { kind: string }) => item.kind === 'imagery');
  const source = createRegionSource(dataset);
  const url = source.getTileUrlFunction();
  expect(url([12, 5857, 1627], 1, marsProjection)).toBe('/data/jezero/hirise/12/1627/5857.png');
  expect(url([12, 5856, 1627], 1, marsProjection)).toBeUndefined();
  expect(url([11, 5857, 1627], 1, marsProjection)).toBeUndefined();
  expect(url([16, 93720, 26052], 1, marsProjection)).toBe('/data/jezero/hirise/16/26052/93720.png');
});
