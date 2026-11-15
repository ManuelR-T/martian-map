import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MARS_RADIUS_METRES, sampleProfile, slopeSegments } from '@marps/mission-core';
import { decodeGrid, elevationSampler, sampleGrid, type DataManifest, type RasterGrid, type TerrainGrid } from './index';

const dataRoot = new URL('../../../apps/web/public/data/', import.meta.url);
const committed = JSON.parse(readFileSync(new URL('manifest.json', dataRoot), 'utf8')) as DataManifest;
const hiriseDataset = committed.datasets.find((dataset) => dataset.id === 'jezero-hirise-dem');
if (!hiriseDataset) throw new Error('The committed manifest has no HiRISE elevation grid.');
const bytes = readFileSync(new URL(hiriseDataset.files[0]?.path ?? '', dataRoot));
const hirise = decodeGrid(hiriseDataset, bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);

const radius = MARS_RADIUS_METRES;
const degreesPerMetre = 180 / (Math.PI * radius);
/** 3 x 3 grid of 10 m cells whose north-west corner is at longitude 0, latitude 0. */
const raster: RasterGrid = {
  width: 3,
  height: 3,
  dtype: 'float32',
  byteOrder: 'little-endian',
  rowOrder: 'north-to-south',
  pixelSizeMetres: 10,
  origin: { x: 0, y: 0 },
  projection: { name: 'equirectangular', centralMeridian: 0, standardParallel: 0, radiusMetres: radius },
  aggregation: null,
  navigationGrade: false,
};
const small = (values: number[]): TerrainGrid => ({ dataset: hiriseDataset, raster, values: Float32Array.from(values) });
/** Coordinate `east` metres east and `south` metres south of the grid corner. */
const at = (east: number, south: number) => ({ longitude: east * degreesPerMetre, latitude: -south * degreesPerMetre });

describe('elevation along a route', () => {
  it('reads the same altitude as the relief cell at the centre of each site cell', () => {
    const sample = elevationSampler(hirise);
    const metresPerDegree = (hirise.raster.projection.radiusMetres * Math.PI) / 180;
    for (const site of committed.sites) {
      const cellSize = hirise.raster.pixelSizeMetres;
      const column = Math.floor((site.coordinate.longitude * metresPerDegree - hirise.raster.origin.x) / cellSize);
      const row = Math.floor((hirise.raster.origin.y - site.coordinate.latitude * metresPerDegree) / cellSize);
      const centre = {
        longitude: (hirise.raster.origin.x + (column + 0.5) * cellSize) / metresPerDegree,
        latitude: (hirise.raster.origin.y - (row + 0.5) * cellSize) / metresPerDegree,
      };
      expect(sample(centre).elevationMetres, site.id).toBeCloseTo(sampleGrid(hirise, centre) ?? Number.NaN, 3);
    }
  });

  it('interpolates halfway between two measured cells', () => {
    const sample = elevationSampler(small([0, 10, 20, 0, 10, 20, 0, 10, 20]));
    expect(sample(at(10, 15)).elevationMetres).toBeCloseTo(5, 6);
  });

  it('reports no data next to an empty cell, rather than bridging the hole', () => {
    const sample = elevationSampler(small([0, 0, 0, 0, Number.NaN, 0, 0, 0, 0]));
    expect(sample(at(12, 12))).toEqual({ elevationMetres: null, status: 'no-data' });
    expect(sample(at(2, 2)).status).toBe('measured');
  });

  it('reports out of coverage beyond the edge of the relief', () => {
    expect(elevationSampler(small(Array(9).fill(0)))(at(45, 5))).toEqual({ elevationMetres: null, status: 'out-of-coverage' });
  });

  it('measures an east-west slope with the narrower ground width of cells at Jezero latitude', () => {
    // 20 m projected cells rising 10 m per column. At 18.45° N a projected metre east is only
    // cos(18.45°) = 0.949 m on the ground, so the true slope is steeper than atan(10 / 20).
    const metresPerDegree = (radius * Math.PI) / 180;
    const jezero: RasterGrid = { ...raster, width: 20, height: 20, pixelSizeMetres: 20, origin: { x: 77.4 * metresPerDegree, y: 18.46 * metresPerDegree } };
    const values = Float32Array.from({ length: 400 }, (_, index) => (index % 20) * 10);
    const sample = elevationSampler({ dataset: hiriseDataset, raster: jezero, values });
    const lonAt = (projectedMetres: number) => 77.4 + projectedMetres / metresPerDegree;
    const route = [
      { longitude: lonAt(60), latitude: 18.4585 },
      { longitude: lonAt(300), latitude: 18.4585 },
    ];
    const expected = (Math.atan(10 / (20 * Math.cos((18.4585 * Math.PI) / 180))) * 180) / Math.PI;
    for (const segment of slopeSegments(sampleProfile(route, sample, 20))) {
      expect(segment.slopeDegrees).toBeCloseTo(expected, 1);
    }
    expect(expected).toBeCloseTo(27.8, 1);
  });

  it('profiles the walk between the three sites on HiRISE without any gap', () => {
    const route = committed.sites.map((site) => site.coordinate);
    const profile = sampleProfile(route, elevationSampler(hirise), hirise.raster.pixelSizeMetres);
    expect(profile.every((point) => point.status === 'measured')).toBe(true);
  });
});
