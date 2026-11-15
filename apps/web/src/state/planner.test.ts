import { describe, expect, it } from 'vitest';
import type { Catalog, DatasetDescriptor } from '@marps/data';
import {
  initialPlannerState,
  plannerReducer,
  selectDetailedRegion,
  selectMapStatus,
  selectPlanningStatus,
  type PlannerState,
} from './planner';

const jezero = { id: 'jezero', name: 'Jezero', center: { longitude: 77.58, latitude: 18.44 } };
const emptyCatalog: Catalog = { regions: [jezero], datasets: [], sites: [] };
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
const catalogWithDataset: Catalog = { regions: [jezero], datasets: [exampleDataset], sites: [] };

const loaded = (catalog: Catalog, state: PlannerState = initialPlannerState) =>
  plannerReducer(state, { type: 'catalogLoaded', request: state.catalogRequest, catalog });

describe('état de planification', () => {
  it('démarre en chargement sur Mars entière, sans étape ni site sélectionné', () => {
    expect(initialPlannerState.view).toBe('global');
    expect(initialPlannerState.mission).toMatchObject({ schemaVersion: 1, regionId: 'jezero', steps: [], camp: null });
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

  it('conserve la même référence quand une action ne change rien', () => {
    const state = loaded(emptyCatalog);
    expect(plannerReducer(state, { type: 'viewChanged', view: 'global' })).toBe(state);
    expect(plannerReducer(state, { type: 'siteSelected', siteId: null })).toBe(state);
    expect(plannerReducer(state, { type: 'siteSelected', siteId: 'amalik' }).selectedSiteId).toBe('amalik');
  });
});

describe('édition de mission dans le planificateur', () => {
  it('interdit les modifications depuis la vue globale et conserve la mission en changeant de vue', () => {
    const state = loaded(catalogWithDataset);
    expect(plannerReducer(state, { type: 'missionRenamed', name: 'Sortie' })).toBe(state);
    const region = plannerReducer(state, { type: 'viewChanged', view: 'region' });
    const edited = plannerReducer(region, { type: 'missionRenamed', name: 'Sortie' });
    expect(edited.mission.name).toBe('Sortie');
    expect(plannerReducer(edited, { type: 'viewChanged', view: 'global' }).mission).toBe(edited.mission);
  });
  it('refuse un faux site du catalogue', () => {
    const state = plannerReducer(loaded(catalogWithDataset), { type: 'viewChanged', view: 'region' });
    expect(plannerReducer(state, { type: 'stepAdded', step: { id: 'a', name: 'Faux', siteId: 'absent', position: jezero.center, activities: [] } })).toBe(state);
  });
});

describe('séparation base et suivi', () => {
  const prepared = () => {
    let state = plannerReducer(loaded(catalogWithDataset), { type: 'viewChanged', view: 'region' });
    state = plannerReducer(state, { type: 'trackingLoaded', mission: null });
    state = plannerReducer(state, { type: 'campPlaced', camp: { id: 'camp', name: 'Camp fictif', regionId: 'jezero', position: jezero.center, provenance: 'simulation', note: 'Test', referenceUrl: null } });
    state = plannerReducer(state, { type: 'stepAdded', step: { id: 'stop', name: 'Arrêt', position: jezero.center, siteId: null, activities: [{ id: 'photo', type: 'photo', durationMinutes: 5, completed: true }] } });
    return state;
  };
  it('démarre une copie indépendante, remet les coches à zéro et conserve le modèle', () => {
    const base = prepared();
    const started = plannerReducer(base, { type: 'missionStarted', id: 'sortie-1' });
    expect(started.workspace).toBe('mission');
    expect(started.mission).toBe(base.mission);
    expect(started.runningMission?.id).toBe('sortie-1');
    expect(started.runningMission?.steps[0]?.activities[0]?.completed).toBe(false);
    const tracked = plannerReducer(started, { type: 'activityToggled', stepId: 'stop', activityId: 'photo' });
    expect(tracked.runningMission?.steps[0]?.activities[0]?.completed).toBe(true);
    expect(tracked.mission).toBe(base.mission);
    const returned = plannerReducer(tracked, { type: 'workspaceChanged', workspace: 'base' });
    const edited = plannerReducer(returned, { type: 'stepRemoved', id: 'stop' });
    expect(edited.mission.steps).toEqual([]);
    expect(edited.runningMission).toBe(tracked.runningMission);
    expect(plannerReducer(edited, { type: 'activityToggled', stepId: 'stop', activityId: 'photo' })).toBe(edited);
  });
  it('interdit de modifier la configuration pendant le suivi', () => {
    const state = plannerReducer(prepared(), { type: 'missionStarted', id: 'sortie' });
    expect(plannerReducer(state, { type: 'stepRemoved', id: 'stop' })).toBe(state);
    expect(plannerReducer(state, { type: 'parametersChanged', parameters: { availableSeconds: 3600, reserveSeconds: 0, speedMetresPerSecond: 1 } })).toBe(state);
    expect(plannerReducer(state, { type: 'missionOpened', mission: initialPlannerState.mission })).toBe(state);
  });
  it('refuse de démarrer sans camp, étape ou restauration terminée', () => {
    expect(plannerReducer(initialPlannerState, { type: 'missionStarted', id: 'sortie' })).toBe(initialPlannerState);
    const state = { ...prepared(), trackingReady: false };
    expect(plannerReducer(state, { type: 'missionStarted', id: 'sortie' })).toBe(state);
  });
});

it('refuse une préparation restaurée hors du secteur et le démarrage d’un plan hors couverture', () => {
  const catalog: Catalog = { ...catalogWithDataset, coverage: [{ id: 'jezero', name: 'Jezero', kind: 'detailed', extent: { west: 77.395, east: 77.412, south: 18.445, north: 18.465 }, capabilities: [] }] };
  const state = plannerReducer(loaded(catalog), { type: 'viewChanged', view: 'region' });
  const outside = { ...state.mission, steps: [{ id: 'a', name: 'Hors secteur', siteId: null, position: { longitude: 0, latitude: 0 }, activities: [] }] };
  expect(plannerReducer(state, { type: 'missionOpened', mission: outside })).toBe(state);
  const unknownSite = { ...outside, steps: [{ ...outside.steps[0]!, position: { longitude: 77.4, latitude: 18.45 }, siteId: 'inconnu' }] };
  expect(plannerReducer(state, { type: 'missionOpened', mission: unknownSite })).toBe(state);
  const invalid = { ...state, trackingReady: true, mission: { ...outside, camp: { id: 'camp', name: 'Camp', regionId: 'jezero', position: { longitude: 77.4, latitude: 18.45 }, provenance: 'simulation' as const, note: 'Test', referenceUrl: null } } };
  expect(plannerReducer(invalid, { type: 'missionStarted', id: 'sortie' })).toBe(invalid);
});

it('bloque le remplacement d’un suivi non restauré et ignore les réponses de chargement périmées', () => {
  const failed = plannerReducer(initialPlannerState, { type: 'trackingFailed', request: 0, message: 'Erreur' });
  expect(failed.trackingReady).toBe(false);
  expect(failed.trackingError).toBe('Erreur');
  const retry = plannerReducer(failed, { type: 'trackingRequested' });
  expect(retry.trackingError).toBeNull();
  expect(plannerReducer(retry, { type: 'trackingLoaded', mission: null, request: 0 })).toBe(retry);
  expect(plannerReducer(retry, { type: 'trackingFailed', request: 0, message: 'Ancienne erreur' })).toBe(retry);
  expect(plannerReducer(retry, { type: 'trackingLoaded', mission: null, request: 1 }).trackingReady).toBe(true);
});

describe('démarrage d’une mission enregistrée', () => {
  it('laisse la préparation ouverte intacte quand le démarrage est refusé', () => {
    // Catalog loaded, so the saved mission could be opened; tracking not loaded yet, so the start is refused.
    const state = loaded(emptyCatalog);
    expect(plannerReducer(state, { type: 'missionOpened', mission: { ...state.mission, id: 'saved', name: 'Mission enregistrée' } })).not.toBe(state);
    const saved = { ...initialPlannerState.mission, id: 'saved', name: 'Mission enregistrée' };
    expect(plannerReducer(state, { type: 'savedMissionStarted', mission: saved, id: 'run' })).toBe(state);
  });
});
