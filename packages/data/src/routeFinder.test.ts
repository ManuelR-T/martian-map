import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { slopeScenario, type MarsCoordinate, type RouteScenario } from '@marps/mission-core';
import {
  cellAt,
  coordinateAt,
  decodeGrid,
  exampleCamps,
  gridPointAt,
  measureRoute,
  proposeRoute,
  type DataManifest,
  type DatasetDescriptor,
  type RasterGrid,
  type TerrainGrid,
} from './index';

const dataRoot = new URL('../../../apps/web/public/data/', import.meta.url);
const committed = JSON.parse(readFileSync(new URL('manifest.json', dataRoot), 'utf8')) as DataManifest;

function committedGrid(id: string): TerrainGrid {
  const dataset = committed.datasets.find((candidate) => candidate.id === id)!;
  const bytes = readFileSync(new URL(dataset.files[0]!.path, dataRoot));
  return decodeGrid(dataset, bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
}

/** A grid of 10 m cells whose north-west corner is at longitude 0, latitude 0. */
function tinyGrid(rows: readonly (readonly number[])[], kind: DatasetDescriptor['kind'] = 'slope'): TerrainGrid {
  const raster: RasterGrid = {
    width: rows[0]!.length,
    height: rows.length,
    dtype: 'float32',
    byteOrder: 'little-endian',
    rowOrder: 'north-to-south',
    pixelSizeMetres: 10,
    origin: { x: 0, y: 0 },
    projection: { name: 'equirectangular', centralMeridian: 0, standardParallel: 0, radiusMetres: 3_396_190 },
    aggregation: null,
    navigationGrade: false,
  };
  return { dataset: { id: 'tiny', kind, raster } as unknown as DatasetDescriptor, raster, values: Float32Array.from(rows.flat()) };
}
const scenario: RouteScenario = slopeScenario(20);
const X = 90;

describe('grid positions', () => {
  it('places a coordinate in the cell cellAt finds, and converts back', () => {
    const { raster } = committedGrid('jezero-hirise-slope');
    const site = committed.sites[0]!.coordinate;
    const point = gridPointAt(raster, site);
    expect({ row: Math.floor(point.y), column: Math.floor(point.x) }).toEqual(cellAt(raster, site));
    expect(coordinateAt(raster, point).longitude).toBeCloseTo(site.longitude, 10);
    expect(coordinateAt(raster, point).latitude).toBeCloseTo(site.latitude, 10);
  });
});

describe('proposeRoute', () => {
  const grid = tinyGrid([
    [0, X, 0],
    [0, X, 0],
    [0, 0, 0],
  ]);
  const centre = (row: number, column: number) => coordinateAt(grid.raster, { x: column + 0.5, y: row + 0.5 });

  it('returns the turning points between the stops, without repeating the stops', () => {
    const proposal = proposeRoute(grid, [centre(0, 0), centre(0, 2), centre(0, 0)], scenario);
    if (proposal.status !== 'found') throw new Error(proposal.status);
    expect(proposal.legs).toHaveLength(2);
    // Around the wall through the only open cell of the middle column.
    expect(proposal.legs[0]!.length).toBeGreaterThan(0);
    const route = [centre(0, 0), ...proposal.legs[0]!, centre(0, 2), ...proposal.legs[1]!, centre(0, 0)];
    expect(measureRoute(grid, route, scenario).blockedMetres).toBe(0);
    expect(measureRoute(grid, [centre(0, 0), centre(0, 2)], scenario).blockedMetres).toBeGreaterThan(0);
  });

  it('proposes the straight leg itself across open ground', () => {
    const open = tinyGrid(Array.from({ length: 5 }, () => Array.from({ length: 9 }, () => 0)));
    const from = coordinateAt(open.raster, { x: 0.2, y: 0.7 });
    const to = coordinateAt(open.raster, { x: 8.6, y: 4.1 });
    expect(proposeRoute(open, [from, to], scenario)).toEqual({ status: 'found', legs: [[]] });
  });

  it('names the leg that fails and why', () => {
    const outside: MarsCoordinate = { longitude: 1, latitude: 1 };
    expect(proposeRoute(grid, [centre(0, 0), centre(2, 2), outside], scenario)).toEqual({ status: 'invalid-goal', leg: 1, reason: 'out-of-coverage' });
    expect(proposeRoute(grid, [centre(0, 1), centre(2, 2)], scenario)).toEqual({ status: 'invalid-start', leg: 0, reason: 'too-steep' });
    const split = tinyGrid([[0, X, 0]]);
    expect(proposeRoute(split, [coordinateAt(split.raster, { x: 0.5, y: 0.5 }), coordinateAt(split.raster, { x: 2.5, y: 0.5 })], scenario)).toEqual({ status: 'no-path', leg: 0 });
  });

  it('refuses a grid that does not hold slopes', () => {
    expect(() => proposeRoute(tinyGrid([[0]], 'elevation'), [centre(0, 0), centre(0, 0)], scenario)).toThrow(/not a slope grid/);
  });
});

describe('experimental route on the frozen Jezero slopes', () => {
  const camp = exampleCamps[0]!.position;
  const stops = [camp, ...committed.sites.map((site) => site.coordinate), camp];

  it.each(['jezero-hirise-slope', 'jezero-ctx-slope'])('on %s, either proposes an open route no costlier than the straight legs, or says why not', (id) => {
    const grid = committedGrid(id);
    const outcomes = [15, 20, 25, 30].map(slopeScenario).map((candidate) => {
      const proposal = proposeRoute(grid, stops, candidate);
      if (proposal.status !== 'found') return proposal.status;
      const route = [stops[0]!, ...proposal.legs.flatMap((leg, index) => [...leg, stops[index + 1]!])];
      const proposed = measureRoute(grid, route, candidate);
      const direct = measureRoute(grid, stops, candidate);
      expect(proposed.blockedMetres).toBe(0);
      expect(proposed.metres).toBeGreaterThanOrEqual(direct.metres - 1e-6);
      if (direct.blockedMetres === 0) expect(proposed.costMetres).toBeLessThanOrEqual(direct.costMetres + 1e-6);
      return 'found';
    });
    // A 30° limit reaches every site of the sector on both grids.
    expect(outcomes.at(-1)).toBe('found');
  });

  it('answers fast enough to run on the main thread', () => {
    const grid = committedGrid('jezero-hirise-slope');
    const started = performance.now();
    for (const limit of [15, 20, 25]) proposeRoute(grid, stops, slopeScenario(limit));
    expect(performance.now() - started).toBeLessThan(500);
  });
});
