import { describe, expect, it } from 'vitest';
import { createEmptyMission } from '@marps/mission-core';
import {
  LIBRARY_KEY,
  activeMission,
  emptyLibrary,
  libraryReducer,
  restoreLibrary,
  updateActiveMission,
} from './library';
import { STORAGE_KEY } from './storage';
const at = '2026-11-14T10:00:00Z';
const mission = {
  ...createEmptyMission('jezero'),
  id: 'first',
  name: 'Première sortie',
};
function memory() {
  const values = new Map<string, string>();
  return {
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => {
      values.set(k, v);
    },
    removeItem: (k: string) => {
      values.delete(k);
    },
  };
}
describe('bibliothèque et historique des plans', () => {
  it('migre la mission existante sans supprimer sa sauvegarde', () => {
    const s = memory();
    s.setItem(STORAGE_KEY, JSON.stringify(mission));
    const r = restoreLibrary(s);
    expect(r.writable).toBe(true);
    expect(activeMission(r.library)).toEqual(mission);
    expect(s.getItem(STORAGE_KEY)).not.toBeNull();
  });
  it('conserve plusieurs missions, rouvre la bonne et archive sans perte', () => {
    let l = libraryReducer(emptyLibrary, { type: 'create', mission, at });
    l = libraryReducer(l, {
      type: 'create',
      mission: { ...mission, id: 'second', name: 'Seconde' },
      at,
    });
    l = libraryReducer(l, { type: 'open', id: 'first' });
    expect(activeMission(l).name).toBe('Première sortie');
    l = libraryReducer(l, { type: 'archive', id: 'first', archived: true, at });
    expect(l.records.find((r) => r.mission.id === 'first')!.archived).toBe(
      true,
    );
    expect(
      activeMission(
        updateActiveMission(l, { ...mission, name: 'Changement interdit' }, at),
      ).name,
    ).toBe('Première sortie');
    l = libraryReducer(l, {
      type: 'archive',
      id: 'first',
      archived: false,
      at,
    });
    expect(l.records).toHaveLength(2);
  });
  it('garde un instantané intact après modification et restauration dans une nouvelle mission', () => {
    let l = libraryReducer(emptyLibrary, { type: 'create', mission, at });
    l = libraryReducer(l, {
      type: 'checkpoint',
      id: 'first',
      revisionId: 'v1',
      at,
      label: 'Avant imprévus',
    });
    l = updateActiveMission(
      l,
      { ...mission, name: 'Plan modifié' },
      '2026-11-15T10:00:00Z',
    );
    expect(l.records[0]!.revisions[0]!.mission.name).toBe('Première sortie');
    l = libraryReducer(l, {
      type: 'create',
      mission: { ...l.records[0]!.revisions[0]!.mission, id: 'restored' },
      at,
    });
    expect(l.records).toHaveLength(2);
    expect(l.records[1]!.mission.name).toBe('Plan modifié');
    const s = memory();
    s.setItem(LIBRARY_KEY, JSON.stringify(l));
    expect(restoreLibrary(s).library).toEqual(l);
  });
  it('supprime la mission active sans ressusciter l’ancienne sauvegarde', () => {
    const s = memory();
    s.setItem(STORAGE_KEY, JSON.stringify(mission));
    let l = restoreLibrary(s).library;
    l = libraryReducer(l, { type: 'delete', id: 'first' });
    s.setItem(LIBRARY_KEY, JSON.stringify(l));
    expect(restoreLibrary(s).library.records).toEqual([]);
  });
  it('préserve les données corrompues et refuse les identifiants dupliqués', () => {
    const s = memory();
    for (const raw of [
      '{',
      JSON.stringify({ schemaVersion: 99 }),
      JSON.stringify({ ...emptyLibrary, records: [{ mission }] }),
    ]) {
      s.setItem(LIBRARY_KEY, raw);
      expect(restoreLibrary(s).writable).toBe(false);
      expect(s.getItem(LIBRARY_KEY)).toBe(raw);
    }
    const l = libraryReducer(emptyLibrary, { type: 'create', mission, at });
    expect(() => libraryReducer(l, { type: 'create', mission, at })).toThrow();
  });
});
