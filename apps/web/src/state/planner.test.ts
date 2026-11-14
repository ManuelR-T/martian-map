import { describe, expect, it } from 'vitest';
import type { Catalog, DatasetDescriptor, DataManifest } from '@marps/data';
import {
  initialPlannerState,
  plannerReducer,
  selectDetailedRegion,
  selectMapStatus,
  selectPlanningStatus,
  type PlannerState,
} from './planner';

const jezero = { id: 'jezero', name: 'Jezero', center: { longitude: 77.58, latitude: 18.44 } };
const manifest = { schemaVersion: 1, generatedAt: '2026-11-14', regions: [], datasets: [], sites: [] } as unknown as DataManifest;
const emptyCatalog: Catalog = { regions: [jezero], datasets: [], sites: [], manifest };
const exampleDataset: DatasetDescriptor = {
  id: 'exemple',
  regionId: 'jezero',
  title: 'Jeu de test',
  kind: 'imagery',
  instrument: 'Test',
  delivery: 'local',
  source: {
    url: 'https://example.org/source',
    retrievedAt: '2026-01-01T00:00:00Z',
    credit: 'Test',
    terms: { summary: 'Test', url: 'https://example.org/terms', verified: false },
    fingerprint: { target: 'test', sha256: '0'.repeat(64), bytes: 0 },
  },
  acquisition: { date: null, sol: null, note: 'Test' },
  units: {},
  crs: 'test',
  extent: { west: 77, south: 18, east: 78, north: 19 },
  resolution: null,
  noData: { kind: 'not-applicable' },
  status: 'available',
  version: 'test',
  limitations: [],
  files: [],
};
const catalogWithDataset: Catalog = { regions: [jezero], datasets: [exampleDataset], sites: [], manifest };

const loaded = (catalog: Catalog, state: PlannerState = initialPlannerState) =>
  plannerReducer(state, { type: 'catalogLoaded', request: state.catalogRequest, catalog });

describe('état de planification', () => {
  it('démarre en chargement sur Mars entière, sans étape ni site sélectionné', () => {
    expect(initialPlannerState.view).toBe('global');
    expect(initialPlannerState.mission).toEqual({ regionId: 'jezero', steps: [] });
    expect(initialPlannerState.selectedSiteId).toBeNull();
    expect(selectMapStatus(initialPlannerState)).toBe('loading');
    expect(selectPlanningStatus(initialPlannerState)).toBe('loading');
    expect(selectDetailedRegion(initialPlannerState)).toBeNull();
  });

  it('signale un catalogue sans jeu de données comme une absence de données, pas comme une erreur', () => {
    const state = loaded(emptyCatalog);
    expect(selectMapStatus(state)).toBe('empty');
    expect(selectPlanningStatus(state)).toBe('insufficient-coverage');
    expect(selectDetailedRegion(state)).toEqual(jezero);
  });

  it('rend la carte disponible dès qu’un jeu de données existe', () => {
    expect(selectMapStatus(loaded(catalogWithDataset))).toBe('ready');
  });

  it('expose l’échec du chargement puis repasse en chargement à la nouvelle tentative', () => {
    const failed = plannerReducer(initialPlannerState, { type: 'catalogFailed', request: 0, message: 'Réseau coupé' });
    expect(failed.catalog).toEqual({ status: 'error', message: 'Réseau coupé' });
    expect(selectMapStatus(failed)).toBe('error');
    expect(selectPlanningStatus(failed)).toBe('error');

    const retried = plannerReducer(failed, { type: 'catalogRequested' });
    expect(retried.catalog).toEqual({ status: 'loading' });
    expect(retried.catalogRequest).toBe(1);
  });

  it('ignore la réponse d’un chargement remplacé par une nouvelle tentative', () => {
    const retried = plannerReducer(initialPlannerState, { type: 'catalogRequested' });
    const stale = plannerReducer(retried, { type: 'catalogFailed', request: 0, message: 'Ancienne erreur' });
    expect(stale).toBe(retried);
    expect(loaded(emptyCatalog, retried).catalog.status).toBe('ready');
  });

  it('limite la planification au secteur détaillé : la vue globale est hors couverture', () => {
    const global = plannerReducer(loaded(catalogWithDataset), { type: 'viewChanged', view: 'global' });
    expect(selectPlanningStatus(global)).toBe('insufficient-coverage');
    expect(selectMapStatus(global)).toBe('ready');

    const back = plannerReducer(global, { type: 'viewChanged', view: 'region' });
    expect(selectPlanningStatus(back)).toBe('ready');
  });

  it('conserve le manifeste et la provenance lors de la sélection et du changement de vue', () => {
    const state = loaded(catalogWithDataset);
    const selected = plannerReducer(state, { type: 'siteSelected', siteId: 'amalik' });
    const global = plannerReducer(selected, { type: 'viewChanged', view: 'global' });
    const back = plannerReducer(global, { type: 'viewChanged', view: 'region' });
    expect(back.catalog).toBe(state.catalog);
    expect(back.selectedSiteId).toBe('amalik');
  });

  it('conserve la même référence quand une action ne change rien', () => {
    const state = loaded(emptyCatalog);
    expect(plannerReducer(state, { type: 'viewChanged', view: 'global' })).toBe(state);
    expect(plannerReducer(state, { type: 'siteSelected', siteId: null })).toBe(state);
    expect(plannerReducer(state, { type: 'siteSelected', siteId: 'amalik' }).selectedSiteId).toBe('amalik');
  });
});
