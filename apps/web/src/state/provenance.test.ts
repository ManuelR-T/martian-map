import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { regions, scienceSources, siteSheets, type Catalog, type DataManifest } from '@marps/data';
import {
  initialPlannerState,
  plannerReducer,
  selectMapDataset,
  selectMissionAssumptions,
  selectProvenanceSnapshot,
} from './planner';

const manifest = JSON.parse(readFileSync(new URL('../../public/data/manifest.json', import.meta.url), 'utf8')) as DataManifest;
const catalog: Catalog = { regions, datasets: manifest.datasets, sites: manifest.sites, manifest };
const loaded = plannerReducer(initialPlannerState, { type: 'catalogLoaded', request: 0, catalog });

describe('planner provenance', () => {
  it('follows the displayed dataset across views while retaining all site and terrain sources', () => {
    expect(selectMapDataset(loaded)?.id).toBe('mola-colorized-relief');
    const selected = plannerReducer(loaded, { type: 'siteSelected', siteId: 'wildcat-ridge' });
    const jezero = plannerReducer(selected, { type: 'viewChanged', view: 'region' });
    expect(selectMapDataset(jezero)?.id).toBe('jezero-hirise-mosaic');
    const global = plannerReducer(jezero, { type: 'viewChanged', view: 'global' });
    for (const state of [selected, jezero, global]) {
      const provenance = selectProvenanceSnapshot(state)!;
      expect(provenance.manifest).toBe(manifest);
      expect(provenance.selectedSiteId).toBe('wildcat-ridge');
      expect(provenance.siteSheets).toBe(siteSheets);
      expect(provenance.scienceSources).toBe(scienceSources);
      expect(provenance.mapDatasetId).toBe(selectMapDataset(state)?.id);
    }
  });

  it('can serialize a self-contained manifest, scientific references and actual timing assumptions for future saves', () => {
    const sheet = siteSheets.find((candidate) => candidate.siteId === 'amalik')!;
    const changed = plannerReducer({ ...loaded, view: 'region' }, { type: 'siteAllottedChanged', sheet, minutes: 45 });
    const snapshot = selectProvenanceSnapshot(changed)!;
    const restored = JSON.parse(JSON.stringify(snapshot)) as typeof snapshot;
    expect(restored).toEqual(snapshot);
    expect(restored.manifest).toEqual(manifest);
    expect(restored.manifest.datasets.every((dataset) => dataset.version && dataset.source.fingerprint.sha256)).toBe(true);
    expect(restored.assumptions.stops.find((stop) => stop.siteId === 'amalik')?.allottedMinutes).toBe(45);
    expect(restored.assumptions.stops.find((stop) => stop.siteId === 'wildcat-ridge')?.allottedMinutes).toBe(75);
    expect(restored.scienceSources).toEqual(scienceSources);
    expect(restored.siteSheets).toEqual(siteSheets);
  });

  it('uses the mission scenario parameters while retaining unavailable terrain thresholds as null', () => {
    expect(selectMissionAssumptions(loaded)).toMatchObject({
      speedKilometresPerHour: 1.8,
      outingMinutes: 240,
      reserveMinutes: 30,
      slopeLimitDegrees: null,
    });
    expect(selectMissionAssumptions(initialPlannerState).stops).toEqual([]);
    expect(selectProvenanceSnapshot(initialPlannerState)).toBeNull();
    expect(selectProvenanceSnapshot({ ...loaded, catalog: { status: 'error', message: 'Offline' } })).toBeNull();
  });

  it('never substitutes a global layer for unavailable Jezero data, or Jezero for the global layer', () => {
    const globalOnly: Catalog = { ...catalog, datasets: manifest.datasets.filter((dataset) => dataset.regionId === 'global') };
    const state = plannerReducer(initialPlannerState, { type: 'catalogLoaded', request: 0, catalog: globalOnly });
    const jezero = plannerReducer(state, { type: 'viewChanged', view: 'region' });
    expect(selectMapDataset(jezero)).toBeNull();
    expect(selectProvenanceSnapshot(jezero)?.mapDatasetId).toBeNull();
    const jezeroOnly: Catalog = { ...catalog, datasets: manifest.datasets.filter((dataset) => dataset.regionId === 'jezero') };
    expect(selectMapDataset({ ...loaded, catalog: { status: 'ready', data: jezeroOnly } })).toBeNull();
    const unavailable: Catalog = { ...catalog, datasets: manifest.datasets.map((dataset) => ({ ...dataset, status: 'unavailable' })) };
    expect(selectMapDataset({ ...loaded, catalog: { status: 'ready', data: unavailable } })).toBeNull();
  });
});
