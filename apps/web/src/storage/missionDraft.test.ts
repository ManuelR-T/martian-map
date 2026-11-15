import { describe, expect, it } from 'vitest';
import { createEmptyMission, isMission, missionGeometry, type Mission } from '@marps/mission-core';
import { exampleCamps, type Catalog } from '@marps/data';
import { loadMissionDraft, MISSION_DRAFT_KEY, saveMissionDraft, withDataReferences } from './missionDraft';

function memoryStorage() {
  const records = new Map<string, string>();
  return { getItem: (key: string) => records.get(key) ?? null, setItem: (key: string, value: string) => { records.set(key, value); } };
}
const mission: Mission = {
  ...createEmptyMission('jezero', 'local-1'), name: 'Sortie delta', camp: exampleCamps[0]!,
  steps: [{ id: 'step', name: 'Site', siteId: 'amalik', position: { longitude: 77.4, latitude: 18.45 },
    activities: [{ id: 'photo', type: 'photo', durationMinutes: 30, completed: true }] }],
  siteWork: { amalik: { allottedMinutes: 45, doneTaskIds: ['photo'] } },
  dataReferences: [{ id: 'hirise', version: '2026-11-14', sha256: 'a'.repeat(64) }],
};

describe('préparation locale versionnée', () => {
  it('restaure camp, parcours, activités, hypothèses, paramètres et références après sérialisation', () => {
    const storage = memoryStorage();
    expect(loadMissionDraft(storage)).toBeNull();
    saveMissionDraft(mission, storage);
    const restored = loadMissionDraft(storage)!;
    expect(restored).toEqual(mission);
    expect(restored).not.toBe(mission);
    expect(missionGeometry(restored)).toEqual(missionGeometry(mission));
    saveMissionDraft({ ...restored, name: 'Nom modifié' }, storage);
    expect(loadMissionDraft(storage)?.name).toBe('Nom modifié');
  });

  it('conserve les détours et les paramètres O₂ ensemble après restauration', () => {
    const storage = memoryStorage();
    const edited: Mission = { ...mission, routeLegs: [
      [{ longitude: 77.401, latitude: 18.451 }],
      [{ longitude: 77.402, latitude: 18.452 }],
    ] };
    saveMissionDraft(edited, storage);
    const restored = loadMissionDraft(storage)!;
    expect(restored).toEqual(edited);
    expect(missionGeometry(restored)).toEqual(missionGeometry(edited));
  });

  it('restaure les événements simulés avec leurs cibles et coefficients', () => {
    const storage = memoryStorage();
    const scenario: Mission = { ...mission, events: [
      { id: 'delay', simulated: true, kind: 'activity-delay', stepId: 'step', activityId: 'photo', delayMinutes: 15 },
      { id: 'visibility', simulated: true, kind: 'visibility', legIndices: [0, 1], speedFactor: 0.5 },
    ] };
    saveMissionDraft(scenario, storage);
    expect(loadMissionDraft(storage)).toEqual(scenario);
  });

  it.each(['{invalid', 'null', JSON.stringify({ ...mission, schemaVersion: 2 }), JSON.stringify({ ...mission, parameters: {} }),
    JSON.stringify({ ...mission, dataReferences: [{ id: 'data', version: '1', sha256: 'broken' }] })])(
    'refuse le contenu corrompu ou incompatible et conserve l’original : %s', raw => {
      const storage = memoryStorage();
      storage.setItem(MISSION_DRAFT_KEY, raw);
      expect(() => loadMissionDraft(storage)).toThrow(/endommagée|incompatible/);
      expect(storage.getItem(MISSION_DRAFT_KEY)).toBe(raw);
    },
  );

  it('accepte les anciennes missions v1 sans références et refuse les références ambiguës', () => {
    const legacy = createEmptyMission('jezero');
    const storage = memoryStorage();
    saveMissionDraft(legacy, storage);
    expect(loadMissionDraft(storage)).toEqual(legacy);
    expect(isMission({ ...mission, dataReferences: [mission.dataReferences![0], mission.dataReferences![0]] })).toBe(false);
    expect(() => saveMissionDraft({ ...legacy, schemaVersion: 99 } as unknown as Mission, storage)).toThrow('Préparation invalide');
  });

  it('signale un stockage refusé ou plein, en lecture comme en écriture', () => {
    const unavailable = { getItem: () => { throw new Error('SecurityError'); }, setItem: () => { throw new Error('QuotaExceededError'); } };
    expect(() => loadMissionDraft(unavailable)).toThrow('SecurityError');
    expect(() => saveMissionDraft(mission, unavailable)).toThrow('QuotaExceededError');
  });

  it('ne sérialise pas les propriétés supplémentaires, rasters, tuiles ou caches', () => {
    const storage = memoryStorage();
    const extra = { ...mission, raster: 'raster-pixels', tileCache: ['cached-tile'],
      camp: { ...mission.camp!, raster: 'camp-raster' },
      steps: mission.steps.map(step => ({ ...step, cache: 'site-cache' })) };
    saveMissionDraft(extra, storage);
    expect(loadMissionDraft(storage)).toEqual(mission);
    expect(storage.getItem(MISSION_DRAFT_KEY)).not.toMatch(/raster|cache|cached-tile/i);
  });

  it('fige uniquement les identifiants, versions et empreintes des sources de la région', () => {
    const source = { fingerprint: { sha256: 'b'.repeat(64) } };
    const catalog = { datasets: [{ id: 'global', regionId: 'global', version: '1', source },
      { id: 'local', regionId: 'jezero', version: '2', source, files: ['raster'] }] } as unknown as Catalog;
    const saved = withDataReferences(createEmptyMission('jezero'), catalog);
    expect(saved.dataReferences).toEqual([{ id: 'local', version: '2', sha256: 'b'.repeat(64) }]);
    expect(withDataReferences(mission, catalog)).toBe(mission);
  });
});

it('round trips the optional return constraint mode without derived calculations', () => {
  const storage = memoryStorage();
  const combined = { ...mission, parameters: { ...mission.parameters, returnLimitMode: 'time-and-oxygen' as const } };
  saveMissionDraft(combined, storage);
  expect(loadMissionDraft(storage)?.parameters.returnLimitMode).toBe('time-and-oxygen');
  expect(isMission({ ...combined, parameters: { ...combined.parameters, returnLimitMode: 'automatic' } })).toBe(false);
  expect(storage.getItem(MISSION_DRAFT_KEY)).not.toContain('crossings');
});
