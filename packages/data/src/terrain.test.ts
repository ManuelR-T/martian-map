import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  cellAt,
  decodeGrid,
  hillshadeFor,
  loadGrid,
  sampleGrid,
  terrainDataset,
  type DataManifest,
  type DatasetDescriptor,
  type RasterGrid,
} from './index';

const dataRoot = new URL('../../../apps/web/public/data/', import.meta.url);
const committed = JSON.parse(readFileSync(new URL('manifest.json', dataRoot), 'utf8')) as DataManifest;

function frozen(dataset: DatasetDescriptor): ArrayBuffer {
  const bytes = readFileSync(new URL(dataset.files[0]!.path, dataRoot));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function committedGrid(id: string) {
  const dataset = committed.datasets.find((candidate) => candidate.id === id)!;
  return decodeGrid(dataset, frozen(dataset));
}

/** A 2 x 2 grid, 10 m cells, whose north-west corner is at longitude 0, latitude 0. */
const raster: RasterGrid = {
  width: 2,
  height: 2,
  dtype: 'float32',
  byteOrder: 'little-endian',
  rowOrder: 'north-to-south',
  pixelSizeMetres: 10,
  origin: { x: 0, y: 0 },
  projection: { name: 'equirectangular', centralMeridian: 0, standardParallel: 0, radiusMetres: 3_396_190 },
  aggregation: null,
  navigationGrade: false,
};
const metre = 180 / (Math.PI * raster.projection.radiusMetres); // degrees per metre
const dataset = { id: 'tiny', raster, files: [{ path: 'tiny.f32' }] } as unknown as DatasetDescriptor;

function bytes(values: readonly number[]): ArrayBuffer {
  const view = new DataView(new ArrayBuffer(values.length * 4));
  values.forEach((value, index) => view.setFloat32(index * 4, value, true));
  return view.buffer;
}

describe('cellAt', () => {
  it('counts columns eastwards and rows southwards from the north-west corner', () => {
    expect(cellAt(raster, { longitude: 5 * metre, latitude: -5 * metre })).toEqual({ row: 0, column: 0 });
    expect(cellAt(raster, { longitude: 15 * metre, latitude: -5 * metre })).toEqual({ row: 0, column: 1 });
    expect(cellAt(raster, { longitude: 5 * metre, latitude: -15 * metre })).toEqual({ row: 1, column: 0 });
  });

  it('is null on every side outside the grid', () => {
    for (const [x, y] of [[-1, -5], [21, -5], [5, 1], [5, -21]] as const) {
      expect(cellAt(raster, { longitude: x * metre, latitude: y * metre })).toBeNull();
    }
  });
});

describe('sampleGrid', () => {
  const grid = decodeGrid(dataset, bytes([1.5, 0, Number.NaN, -2500]));

  it('reads the value of the containing cell, including a real zero', () => {
    expect(sampleGrid(grid, { longitude: 5 * metre, latitude: -5 * metre })).toBe(1.5);
    expect(sampleGrid(grid, { longitude: 15 * metre, latitude: -5 * metre })).toBe(0);
    expect(sampleGrid(grid, { longitude: 15 * metre, latitude: -15 * metre })).toBe(-2500);
  });

  it('reports NoData and positions outside the grid as null, never 0', () => {
    expect(sampleGrid(grid, { longitude: 5 * metre, latitude: -15 * metre })).toBeNull();
    expect(sampleGrid(grid, { longitude: 25 * metre, latitude: -5 * metre })).toBeNull();
  });
});

describe('decodeGrid', () => {
  it('rejects a file that does not hold the declared grid', () => {
    expect(() => decodeGrid(dataset, bytes([1, 2, 3]))).toThrow('do not hold 2 x 2 cells');
  });

  it('rejects a dataset without a grid or with another projection', () => {
    expect(() => decodeGrid({ id: 'sites' } as DatasetDescriptor, bytes([]))).toThrow('not a grid');
    const tilted = { ...raster, projection: { ...raster.projection, standardParallel: 18 } } as unknown as RasterGrid;
    expect(() => decodeGrid({ ...dataset, raster: tilted }, bytes([1, 2, 3, 4]))).toThrow('unsupported projection');
  });
});

describe('loadGrid', () => {
  const respond = (body: ArrayBuffer, status = 200) => (async () => new Response(body, { status })) as typeof fetch;

  it('fetches the frozen file under the base URL', async () => {
    let requested = '';
    const fetcher = (async (url: string) => {
      requested = url;
      return new Response(bytes([1, 2, 3, 4]));
    }) as typeof fetch;
    const grid = await loadGrid(dataset, '/data/', fetcher);
    expect(requested).toBe('/data/tiny.f32');
    expect(Array.from(grid.values)).toEqual([1, 2, 3, 4]);
  });

  it('fails on an HTTP error', async () => {
    await expect(loadGrid(dataset, '/data/', respond(bytes([]), 404))).rejects.toThrow('HTTP 404');
  });
});

describe('terrainDataset', () => {
  const withStatus = (id: string, status: string): DataManifest => ({
    ...committed,
    datasets: committed.datasets.map((candidate) => (candidate.id === id ? { ...candidate, status } : candidate)),
  }) as DataManifest;

  it('prefers the finest complete grid', () => {
    expect(terrainDataset(committed, 'jezero', 'elevation')?.id).toBe('jezero-hirise-dem');
    expect(terrainDataset(committed, 'jezero', 'slope')?.id).toBe('jezero-hirise-slope');
  });

  it('falls back to CTX when HiRISE has holes or is unavailable', () => {
    expect(terrainDataset(withStatus('jezero-hirise-dem', 'partial'), 'jezero', 'elevation')?.id).toBe('jezero-ctx-dem');
    expect(terrainDataset(withStatus('jezero-hirise-dem', 'unavailable'), 'jezero', 'elevation')?.id).toBe('jezero-ctx-dem');
  });

  it('offers no relief outside the detailed region', () => {
    expect(terrainDataset(committed, 'global', 'elevation')).toBeNull();
  });

  it('shades the map with the relief the profile reads, so the map and the profile never disagree', () => {
    const elevation = (manifest: DataManifest) => terrainDataset(manifest, 'jezero', 'elevation')!;
    expect(hillshadeFor(committed, elevation(committed))?.id).toBe('jezero-hirise-hillshade');
    const fallback = withStatus('jezero-hirise-dem', 'partial');
    expect(hillshadeFor(fallback, elevation(fallback))?.id).toBe('jezero-ctx-hillshade');
  });

  it('shows no shading rather than one that is unavailable', () => {
    const manifest = withStatus('jezero-hirise-hillshade', 'unavailable');
    expect(hillshadeFor(manifest, terrainDataset(manifest, 'jezero', 'elevation')!)).toBeNull();
  });
});

describe('committed relief', () => {
  it('gives every stop an elevation and a slope on both grids', () => {
    for (const product of ['hirise', 'ctx']) {
      const elevation = committedGrid(`jezero-${product}-dem`);
      const slope = committedGrid(`jezero-${product}-slope`);
      for (const site of committed.sites) {
        expect(sampleGrid(elevation, site.coordinate)).toBeTypeOf('number');
        const degrees = sampleGrid(slope, site.coordinate);
        expect(degrees).toBeGreaterThanOrEqual(0);
        expect(degrees).toBeLessThan(90);
      }
    }
  });

  it('places the HiRISE grid where the rover measured its own elevation', () => {
    // Independent check of the transform: the sample elevations come from another NASA source.
    const elevation = committedGrid('jezero-hirise-dem');
    for (const site of committed.sites) {
      expect(Math.abs(sampleGrid(elevation, site.coordinate)! - site.elevation!.value)).toBeLessThan(1);
    }
  });

  it('keeps the two products within a few metres of each other at the stops', () => {
    const hirise = committedGrid('jezero-hirise-dem');
    const ctx = committedGrid('jezero-ctx-dem');
    for (const site of committed.sites) {
      expect(Math.abs(sampleGrid(hirise, site.coordinate)! - sampleGrid(ctx, site.coordinate)!)).toBeLessThan(10);
    }
  });

  it('never declares a grid fit for navigation', () => {
    const grids = committed.datasets.filter((candidate) => candidate.raster);
    expect(grids).toHaveLength(4);
    for (const grid of grids) expect(grid.raster!.navigationGrade).toBe(false);
  });
});
