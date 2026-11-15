import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { datasetScientificStatus, type DataManifest, type DatasetKind } from './index';

const manifest = JSON.parse(readFileSync(new URL('../../../apps/web/public/data/manifest.json', import.meta.url), 'utf8')) as DataManifest;

describe('scientific provenance', () => {
  it.each([
    ['imagery', 'measured'],
    ['rover-waypoints', 'measured'],
    ['rover-traverse', 'calculated'],
    ['thermal', 'measured'],
    ['weather', 'measured'],
    ['sites', 'measured'],
    ['elevation', 'calculated'],
    ['basemap', 'calculated'],
    ['slope', 'calculated'],
    ['hillshade', 'simulated'],
  ] as const)('classifies %s independently from its availability', (kind: DatasetKind, expected) => {
    const dataset = manifest.datasets.find((candidate) => candidate.kind === kind)!;
    expect(datasetScientificStatus(dataset)).toBe(expected);
    expect(datasetScientificStatus({ ...dataset, status: 'partial' })).toBe(expected);
    expect(datasetScientificStatus({ ...dataset, status: 'unavailable' })).toBe('unknown');
  });
});
