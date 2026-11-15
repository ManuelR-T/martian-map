import { describe, expect, it } from 'vitest';
import { calculateMissionBudget, type CalculatedMissionBudget } from './budget';
import { MARS_RADIUS_METRES } from './distance';
import { createEmptyMission, missionReducer, type Mission } from './mission';

const oneKmLongitude = 1000 / MARS_RADIUS_METRES * 180 / Math.PI;
const mission: Mission = { ...createEmptyMission('test', 'budget'),
  camp: { id: 'camp', name: 'Camp', regionId: 'test', position: { longitude: 0, latitude: 0 }, provenance: 'simulation', note: '', referenceUrl: null },
  steps: [{ id: 'a', name: 'Arrêt', siteId: null, position: { longitude: oneKmLongitude, latitude: 0 },
    activities: [{ id: 'photo', type: 'photo', durationMinutes: 20, completed: false }] }],
  parameters: { availableSeconds: 7200, speedMetresPerSecond: 1, reserveSeconds: 600 } };
const budget = (value: Mission): CalculatedMissionBudget => {
  const result = calculateMissionBudget(value);
  expect(result.status).toBe('ready');
  return result as CalculatedMissionBudget;
};

describe('budget de mission en minutes', () => {
  it('convertit m/s en km/h et secondes en minutes, avec un retour compté une fois', () => {
    const result = budget(mission);
    expect(result.speedKilometresPerHour).toBe(3.6);
    expect(result.distances.total.kilometres).toBeCloseTo(2, 10);
    expect(result.explorationMinutes).toBeCloseTo(1000 / 60, 10);
    expect(result.returnMinutes).toBeCloseTo(1000 / 60, 10);
    expect(result.walkingMinutes).toBeCloseTo(2000 / 60, 10);
    expect(result.walkingMinutes).toBeCloseTo(result.explorationMinutes + result.returnMinutes, 10);
    expect(result.activityMinutes).toBe(20);
    expect(result.availableMinutes).toBe(120);
    expect(result.reserveMinutes).toBe(10);
    expect(result.marginMinutes).toBeCloseTo(120 - 2000 / 60 - 20 - 10, 10);
    expect(result.overBudget).toBe(false);
  });

  it('réduit la marge après ajout et changement d’activité, puis la rétablit après retrait', () => {
    const initial = budget(mission);
    const added = missionReducer(mission, { type: 'activityAdded', stepId: 'a', activity: { id: 'sample', type: 'sampling', durationMinutes: 70, completed: false } });
    expect(budget(added).marginMinutes).toBeCloseTo(initial.marginMinutes - 70, 10);
    expect(budget(added).overBudget).toBe(true);
    const changed = missionReducer(added, { type: 'activityChanged', stepId: 'a', activity: { id: 'sample', type: 'sampling', durationMinutes: 10, completed: false } });
    expect(budget(changed).marginMinutes).toBeCloseTo(initial.marginMinutes - 10, 10);
    expect(budget(changed).overBudget).toBe(false);
    expect(budget(missionReducer(changed, { type: 'activityRemoved', stepId: 'a', id: 'sample' }))).toEqual(initial);
  });

  it('recalcule après changement du camp, du parcours, de l’ordre et du dernier retour', () => {
    const added = missionReducer(mission, { type: 'stepAdded', step: { ...mission.steps[0]!, id: 'b', position: { longitude: 3 * oneKmLongitude, latitude: 0 }, activities: [] } });
    expect(budget(added).walkingMinutes).toBeCloseTo(6000 / 60, 8);
    expect(budget(added).returnMinutes).toBeCloseTo(3000 / 60, 8);
    const moved = missionReducer(added, { type: 'stepMoved', id: 'b', to: 0 });
    expect(budget(moved).returnMinutes).toBeCloseTo(1000 / 60, 8);
    expect(budget(moved).explorationMinutes).toBeCloseTo(5000 / 60, 8);
    const changedCamp = missionReducer(added, { type: 'campPlaced', camp: { ...mission.camp!, position: { longitude: 2 * oneKmLongitude, latitude: 0 } } });
    expect(budget(changedCamp).walkingMinutes).toBeCloseTo(4000 / 60, 8);
    expect(budget(missionReducer(added, { type: 'stepRemoved', id: 'b' }))).toEqual(budget(mission));
  });

  it('recalcule vitesse, durée disponible et réserve sans arrondir les calculs', () => {
    const changed = missionReducer(mission, { type: 'parametersChanged', parameters: { availableSeconds: 3600, speedMetresPerSecond: 0.5, reserveSeconds: 1200 } });
    expect(budget(changed).walkingMinutes).toBeCloseTo(2 * budget(mission).walkingMinutes, 10);
    expect(budget(changed).marginMinutes).toBeCloseTo(60 - 4000 / 60 - 20 - 20, 10);
    expect(budget(changed).overBudget).toBe(true);
  });

  it('distingue les entrées manquantes d’un dépassement et autorise une visite sans activité', () => {
    expect(calculateMissionBudget(null)).toEqual({ status: 'missing-inputs', missing: ['mission'] });
    expect(calculateMissionBudget(createEmptyMission('test'))).toEqual({ status: 'missing-inputs', missing: ['camp', 'steps'] });
    expect(calculateMissionBudget({ ...mission, camp: null })).toEqual({ status: 'missing-inputs', missing: ['camp'] });
    expect(calculateMissionBudget({ ...mission, steps: [] })).toEqual({ status: 'missing-inputs', missing: ['steps'] });
    expect(budget({ ...mission, steps: [{ ...mission.steps[0]!, activities: [] }] }).activityMinutes).toBe(0);
  });

  it.each([0, -1, NaN, Infinity])('refuse la vitesse invalide %s sans utiliser de valeur de remplacement', speedMetresPerSecond => {
    expect(calculateMissionBudget({ ...mission, parameters: { ...mission.parameters, speedMetresPerSecond } })).toEqual({ status: 'invalid-inputs' });
  });

  it('refuse les durées, coordonnées ou activités invalides et les débordements numériques', () => {
    for (const parameters of [{ ...mission.parameters, availableSeconds: NaN }, { ...mission.parameters, reserveSeconds: -1 },
      { ...mission.parameters, reserveSeconds: 8000 }, { ...mission.parameters, speedMetresPerSecond: Number.MIN_VALUE }]) {
      expect(calculateMissionBudget({ ...mission, parameters })).toEqual({ status: 'invalid-inputs' });
    }
    expect(calculateMissionBudget({ ...mission, steps: [{ ...mission.steps[0]!, position: { longitude: 181, latitude: 0 } }] })).toEqual({ status: 'invalid-inputs' });
    for (const durationMinutes of [-1, NaN, Infinity]) {
      expect(calculateMissionBudget({ ...mission, steps: [{ ...mission.steps[0]!, activities: [{ ...mission.steps[0]!.activities[0]!, durationMinutes }] }] })).toEqual({ status: 'invalid-inputs' });
    }
    expect(calculateMissionBudget({ ...mission, steps: [{ ...mission.steps[0]!, activities: ['a', 'b'].map(id => ({ id, type: 'photo', durationMinutes: Number.MAX_VALUE, completed: false })) }] })).toEqual({ status: 'invalid-inputs' });
  });

  it('accepte une marge exactement nulle et détecte un dépassement même inférieur à une seconde', () => {
    const zero: Mission = { ...mission, steps: [{ ...mission.steps[0]!, position: mission.camp!.position, activities: [] }],
      parameters: { availableSeconds: 0, reserveSeconds: 0, speedMetresPerSecond: 1 } };
    expect(budget(zero).marginMinutes).toBe(0);
    expect(budget(zero).overBudget).toBe(false);
    expect(budget({ ...zero, steps: [{ ...zero.steps[0]!, activities: [{ id: 'tiny', type: 'photo', durationMinutes: 0.001, completed: false }] }] }).overBudget).toBe(true);
  });

  it('ne libère pas du temps en cochant une activité et ne somme pas les allocations des fiches', () => {
    const tracked = { ...mission, steps: [{ ...mission.steps[0]!, activities: [{ ...mission.steps[0]!.activities[0]!, completed: true }] }],
      siteWork: { site: { allottedMinutes: 500, doneTaskIds: [] } } };
    expect(budget(tracked)).toEqual(budget(mission));
    expect(mission.steps[0]!.activities[0]!.completed).toBe(false);
  });
});

it('includes edited outbound and return legs in the budget exactly once', () => {
  const outbound = missionReducer(mission, { type: 'routeLegChanged', index: 0,
    vertices: [{ longitude: -oneKmLongitude, latitude: 0 }] });
  const drawn = missionReducer(outbound, { type: 'routeLegChanged', index: 1,
    vertices: [{ longitude: 2 * oneKmLongitude, latitude: 0 }] });
  const result = budget(drawn);
  expect(result.explorationMinutes).toBeCloseTo(3000 / 60, 10);
  expect(result.returnMinutes).toBeCloseTo(3000 / 60, 10);
  expect(result.walkingMinutes).toBeCloseTo(6000 / 60, 10);
  expect(result.marginMinutes).toBeCloseTo(120 - 100 - 20 - 10, 10);
  expect(result.overBudget).toBe(true);
  expect(budget(missionReducer(drawn, { type: 'routeReset' }))).toEqual(budget(mission));
});
