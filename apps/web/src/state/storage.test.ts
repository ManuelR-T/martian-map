import { expect, it } from 'vitest';
import { createEmptyMission } from '@marps/mission-core';
import {
  missingSites,
  restoreMission,
  saveMission,
  STORAGE_KEY,
  type MissionStorage,
} from './storage';
function memory(): MissionStorage {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      map.set(k, v);
    },
    removeItem: (k) => {
      map.delete(k);
    },
  };
}
it('restaure une mission après un nouveau chargement et permet la suppression', () => {
  const storage = memory();
  const m = { ...createEmptyMission('jezero'), name: 'Sortie renommée' };
  saveMission(storage, m);
  expect(restoreMission(storage).mission).toEqual(m);
  storage.removeItem(STORAGE_KEY);
  expect(restoreMission(storage).mission.steps).toEqual([]);
});
it('préserve la sauvegarde corrompue ou incompatible et signale le stockage indisponible', () => {
  const storage = memory();
  for (const raw of ['{', JSON.stringify({ schemaVersion: 2 })]) {
    storage.setItem(STORAGE_KEY, raw);
    expect(restoreMission(storage).message).toContain(
      'Restauration impossible',
    );
    expect(storage.getItem(STORAGE_KEY)).toBe(raw);
  }
  const unavailable = {
    ...storage,
    getItem: () => {
      throw new Error('bloqué');
    },
    setItem: () => {
      throw new Error('quota');
    },
  };
  expect(restoreMission(unavailable).message).toContain(
    'Restauration impossible',
  );
  expect(() =>
    saveMission(unavailable, createEmptyMission('jezero')),
  ).toThrow();
});
it('signale une référence de site manquante sans perdre ses coordonnées', () => {
  const m = {
    ...createEmptyMission('jezero'),
    steps: [
      {
        id: 'a',
        name: 'Site disparu',
        siteId: 'absent',
        position: { latitude: 1, longitude: 2 },
        activities: [],
      },
    ],
  };
  expect(missingSites(m, [])).toEqual(['Site disparu']);
  expect(
    restoreMission({
      getItem: () => JSON.stringify(m),
      setItem: () => {},
      removeItem: () => {},
    }).mission.steps[0]!.position,
  ).toEqual({ latitude: 1, longitude: 2 });
});
