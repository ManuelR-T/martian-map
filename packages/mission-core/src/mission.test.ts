import { describe, expect, it } from 'vitest';
import { createEmptyMission, isMission, missionGeometry, missionReducer, type Camp, type MissionStep } from './mission';
const camp: Camp = { id: 'camp', name: 'Simulation', regionId: 'jezero', position: { longitude: 77.4, latitude: 18.45 }, provenance: 'simulation', note: 'Test', referenceUrl: null };
const step = (id: string): MissionStep => ({ id, name: id, position: { longitude: 77.401, latitude: 18.451 }, siteId: null, activities: [] });
const empty = createEmptyMission('jezero');
describe('modèle de mission versionné', () => {
  it('ferme le parcours sur le camp et conserve son ordre après déplacement et suppression', () => {
    let m = missionReducer(empty, { type: 'campPlaced', camp });
    expect(missionGeometry(m)).toBeNull();
    m = missionReducer(m, { type: 'stepAdded', step: step('a') });
    m = missionReducer(m, { type: 'stepAdded', step: step('b') });
    m = missionReducer(m, { type: 'stepMoved', id: 'b', to: 0 });
    expect(m.steps.map(s => s.id)).toEqual(['b', 'a']);
    expect(missionGeometry(m)?.coordinates).toEqual([[77.4, 18.45], [77.401, 18.451], [77.401, 18.451], [77.4, 18.45]]);
    m = missionReducer(m, { type: 'stepRemoved', id: 'b' });
    expect(m.steps.map(s => s.id)).toEqual(['a']);
    expect(missionReducer(m, { type: 'stepMoved', id: 'missing', to: 0 })).toBe(m);
  });
  it.each([-1, Infinity, NaN, 0])('refuse la vitesse %s', speedMetresPerSecond => {
    expect(missionReducer(empty, { type: 'parametersChanged', parameters: { ...empty.parameters, speedMetresPerSecond } })).toBe(empty);
  });
  it('refuse durées négatives, infinis, réserve excessive et coordonnées invalides', () => {
    for (const availableSeconds of [-1, Infinity, NaN]) expect(missionReducer(empty, { type: 'parametersChanged', parameters: { ...empty.parameters, availableSeconds } })).toBe(empty);
    expect(missionReducer(empty, { type: 'parametersChanged', parameters: { ...empty.parameters, reserveSeconds: 999999 } })).toBe(empty);
    expect(missionReducer(empty, { type: 'campPlaced', camp: { ...camp, regionId: 'other' } })).toBe(empty);
    expect(missionReducer(empty, { type: 'stepAdded', step: { ...step('a'), position: { longitude: Infinity, latitude: 18 } } })).toBe(empty);
    expect(missionReducer(empty, { type: 'missionRenamed', name: ' ' })).toBe(empty);
  });
  it('gère les activités indépendamment à chaque visite du même site', () => {
    let m = missionReducer(empty, { type: 'stepAdded', step: step('a') });
    m = missionReducer(m, { type: 'stepAdded', step: step('b') });
    const activity = { id: 'photo', type: 'photo' as const, durationMinutes: 2.5, completed: false };
    m = missionReducer(m, { type: 'activityAdded', stepId: 'a', activity });
    expect(m.steps[1]?.activities).toEqual([]);
    expect(missionReducer(m, { type: 'activityAdded', stepId: 'a', activity })).toBe(m);
    expect(missionReducer(m, { type: 'activityChanged', stepId: 'a', activity: { ...activity, durationMinutes: -1 } })).toBe(m);
    m = missionReducer(m, { type: 'activityChanged', stepId: 'a', activity: { ...activity, durationMinutes: 4, completed: true } });
    expect(m.steps[0]?.activities[0]).toMatchObject({ completed: true, durationMinutes: 4 });
    expect(isMission(JSON.parse(JSON.stringify(m)))).toBe(true);
    m = missionReducer(m, { type: 'activityRemoved', stepId: 'a', id: activity.id });
    expect(m.steps[0]?.activities).toEqual([]);
  });
  it('rejette les versions inconnues et les sauvegardes corrompues', () => {
    for (const value of [null, {}, { ...empty, schemaVersion: 2 }, { ...empty, steps: [step('a'), step('a')] }, { ...empty, parameters: null }, { ...empty, siteWork: { x: { allottedMinutes: -1, doneTaskIds: [] } } }]) expect(isMission(value)).toBe(false);
  });
});

it('propose un nom selon le type et préserve un nom personnalisé', () => {
  let m = createEmptyMission('jezero');
  expect(m.name).toBe('Reconnaissance du terrain');
  m = missionReducer(m, { type: 'missionTypeChanged', missionType: 'sampling' });
  expect(m.name).toBe('Prélèvement d’échantillons');
  m = missionReducer(m, { type: 'missionRenamed', name: 'Sortie delta 3' });
  m = missionReducer(m, { type: 'missionTypeChanged', missionType: 'photography' });
  expect(m.name).toBe('Sortie delta 3');
  expect(m.missionType).toBe('photography');
  expect(isMission(JSON.parse(JSON.stringify(m)))).toBe(true);
});

it('accepte les anciennes missions sans type et refuse les types inconnus', () => {
  const { missionType: _type, ...legacy } = createEmptyMission('jezero');
  expect(_type).toBe('reconnaissance');
  expect(isMission(legacy)).toBe(true);
  expect(isMission({ ...legacy, missionType: 'unknown' })).toBe(false);
});

it('refuse toutes les durées et réserves négatives/non finies, y compris pour les activités', () => {
  let m = missionReducer(empty, { type: 'stepAdded', step: step('a') });
  m = missionReducer(m, { type: 'activityAdded', stepId: 'a', activity: { id: 'activity', type: 'observation', durationMinutes: 5, completed: false } });
  for (const value of [-1, Infinity, -Infinity, NaN]) {
    expect(missionReducer(m, { type: 'parametersChanged', parameters: { ...m.parameters, availableSeconds: value } })).toBe(m);
    expect(missionReducer(m, { type: 'parametersChanged', parameters: { ...m.parameters, reserveSeconds: value } })).toBe(m);
    expect(missionReducer(m, { type: 'activityChanged', stepId: 'a', activity: { ...m.steps[0]!.activities[0]!, durationMinutes: value } })).toBe(m);
  }
});

it('conserve un moteur de mission indépendant de Jezero', () => {
  const mission = missionReducer(createEmptyMission('autre-region'), { type: 'campPlaced', camp: { ...camp, regionId: 'autre-region' } });
  expect(mission.camp?.regionId).toBe('autre-region');
  expect(isMission(mission)).toBe(true);
});

it('persists intermediate vertices, resets them after itinerary changes and rejects corrupt legs', () => {
  let m = missionReducer(missionReducer(empty, { type: 'campPlaced', camp }), { type: 'stepAdded', step: step('a') });
  m = missionReducer(m, { type: 'routeLegChanged', index: 0, vertices: [{ longitude: 77.402, latitude: 18.45 }] });
  m = missionReducer(m, { type: 'routeLegChanged', index: 1, vertices: [{ longitude: 77.403, latitude: 18.45 }] });
  expect(missionGeometry(m)?.coordinates).toEqual([[77.4, 18.45], [77.402, 18.45], [77.401, 18.451], [77.403, 18.45], [77.4, 18.45]]);
  expect(isMission(JSON.parse(JSON.stringify(m)))).toBe(true);
  expect(isMission({ ...m, routeLegs: [[]] })).toBe(false);
  expect(missionReducer(m, { type: 'routeLegChanged', index: 1, vertices: [{ longitude: NaN, latitude: 0 }] })).toBe(m);
  expect(missionReducer(m, { type: 'stepAdded', step: step('b') }).routeLegs).toBeUndefined();
  expect(missionReducer(m, { type: 'stepRemoved', id: 'a' }).routeLegs).toBeUndefined();
  expect(missionReducer(m, { type: 'campPlaced', camp }).routeLegs).toBeUndefined();
});

it('replaces every leg at once and refuses a set that does not match the itinerary', () => {
  const m = missionReducer(missionReducer(empty, { type: 'campPlaced', camp }), { type: 'stepAdded', step: step('a') });
  const replaced = missionReducer(m, { type: 'routeLegsReplaced', legs: [[{ longitude: 77.402, latitude: 18.45 }], []] });
  expect(missionGeometry(replaced)?.coordinates).toEqual([[77.4, 18.45], [77.402, 18.45], [77.401, 18.451], [77.4, 18.45]]);
  expect(missionReducer(m, { type: 'routeLegsReplaced', legs: [[]] })).toBe(m);
  expect(missionReducer(empty, { type: 'routeLegsReplaced', legs: [] })).toBe(empty);
});
