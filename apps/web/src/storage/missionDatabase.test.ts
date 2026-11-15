import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { createEmptyMission, missionReducer } from '@marps/mission-core';
import { MissionDatabase } from './missionDatabase';

describe('base locale IndexedDB', () => {
  it('initialise les camps fictifs, persiste et remplace les missions sans réensemencer la base', async () => {
    const factory = new IDBFactory();
    const first = new MissionDatabase(factory);
    const camps = await first.camps();
    expect(camps).toHaveLength(2);
    expect(camps.every(c => c.provenance === 'simulation')).toBe(true);
    let m = missionReducer(createEmptyMission('jezero', 'mission-a'), { type: 'campPlaced', camp: camps[0]! });
    m = { ...m, siteWork: { amalik: { allottedMinutes: 30, doneTaskIds: ['photo'] } } };
    await first.saveMission(m);
    await first.saveMission({ ...m, name: 'Sortie delta' });
    await first.saveMission(createEmptyMission('jezero', 'mission-b'));
    await first.saveCamp({ ...camps[0]!, id: 'crew-camp', name: 'Camp équipage' });
    const reopened = new MissionDatabase(factory);
    expect(await reopened.camps()).toHaveLength(3);
    const saved = await reopened.missions();
    expect(saved).toHaveLength(2);
    expect(saved.find(s => s.id === 'mission-a')).toEqual({ ...m, name: 'Sortie delta' });
  });
  it('refuse d’écrire un modèle invalide', async () => {
    const db = new MissionDatabase(new IDBFactory());
    const m = createEmptyMission('jezero');
    await expect(db.saveMission({ ...m, parameters: { ...m.parameters, speedMetresPerSecond: 0 } })).rejects.toThrow('Mission invalide');
    expect(await db.missions()).toEqual([]);
  });
});

it('signale une version persistée inconnue au lieu de charger un modèle partiel', async () => {
  const factory = new IDBFactory();
  const db = new MissionDatabase(factory);
  await db.saveMission(createEmptyMission('jezero', 'a'));
  await new Promise<void>((resolve, reject) => {
    const request = factory.open('marps-missions', 3);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const tx = request.result.transaction('missions', 'readwrite');
      tx.objectStore('missions').put({ id: 'future', schemaVersion: 999 });
      tx.oncomplete = () => { request.result.close(); resolve(); };
      tx.onerror = () => reject(tx.error);
    };
  });
  await expect(db.missions()).rejects.toThrow('incompatible ou endommagée');
});

it('restaure le suivi séparément des missions types et conserve les instantanés après suppression', async () => {
  const factory = new IDBFactory();
  const db = new MissionDatabase(factory);
  expect(await db.activeMission()).toBeNull();
  const camp = (await db.camps())[0]!;
  const model = { ...createEmptyMission('jezero', 'type-1'), camp };
  await db.saveMission(model);
  const run = { ...model, id: 'sortie-1', siteWork: { amalik: { allottedMinutes: 30, doneTaskIds: ['photo'] } } };
  await db.saveActiveMission(run);
  await db.deleteMission(model.id);
  await db.deleteCamp(camp.id);
  const reopened = new MissionDatabase(factory);
  expect(await reopened.activeMission()).toEqual(run);
  expect(await reopened.missions()).toEqual([]);
  expect(await reopened.camps()).toHaveLength(1);
});

it('migre la base v1 en préservant les camps et les missions existants', async () => {
  const factory = new IDBFactory();
  const model = createEmptyMission('jezero', 'existing');
  await new Promise<void>((resolve, reject) => {
    const request = factory.open('marps-missions', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('camps', { keyPath: 'id' });
      request.result.createObjectStore('missions', { keyPath: 'id' }).put(model);
    };
    request.onsuccess = () => { request.result.close(); resolve(); };
    request.onerror = () => reject(request.error);
  });
  const db = new MissionDatabase(factory);
  expect(await db.missions()).toEqual([model]);
  expect(await db.camps()).toEqual([]);
  expect(await db.activeMission()).toBeNull();
});

it('sépare modèles, préparations et historique de chaque sortie', async () => {
  const db = new MissionDatabase(new IDBFactory());
  const model = createEmptyMission('jezero', 'template');
  await db.saveTemplate(model);
  expect(await db.missions()).toEqual([]);
  await db.saveMission({ ...model, id: 'preparation' });
  await db.saveActiveMission({ ...model, id: 'run-1', name: 'Première sortie' });
  await db.saveActiveMission({ ...model, id: 'run-1', name: 'Première sortie mise à jour' });
  await db.saveActiveMission({ ...model, id: 'run-2' });
  expect(await db.templates()).toEqual([model]);
  expect((await db.missions()).map(m => m.id)).toEqual(['preparation']);
  const history = await db.history();
  expect(history).toHaveLength(2);
  expect(history.find(h => h.id === 'run-1')?.mission.name).toBe('Première sortie mise à jour');
  await db.deleteTemplate(model.id);
  expect(await db.templates()).toEqual([]);
  expect(await db.history()).toHaveLength(2);
});
