import { describe, expect, it } from 'vitest';
import {
  calculateBudget,
  calculateOxygen,
  createEmptyMission,
  distanceMetres,
  missionReducer,
  parseMission,
  routeSegments,
  validateMission,
  MARS_RADIUS_METRES,
  type Mission,
} from './index';
const camp = { latitude: 0, longitude: 0 };
const step = {
  id: 'a',
  name: 'A',
  position: { latitude: 0, longitude: 1 },
  activities: [{ id: 'photo', type: 'photo' as const, durationSeconds: 300 }],
};
function fixture(): Mission {
  return { ...createEmptyMission('jezero'), camp, steps: [step] };
}
describe('mission versionnée et édition', () => {
  it('conserve le camp, les activités et les hypothèses dans un aller-retour JSON', () => {
    const m = fixture();
    expect(parseMission(JSON.stringify(m))).toEqual(m);
    for (const raw of [
      '{}',
      'null',
      '{',
      JSON.stringify({ ...m, schemaVersion: 99 }),
    ])
      expect(() => parseMission(raw)).toThrow();
  });
  it('permet des visites répétées, déplace le camp et réordonne sans muter', () => {
    const m = fixture();
    const added = missionReducer(m, {
      type: 'addStep',
      step: { ...step, id: 'b', activities: [] },
    });
    const moved = missionReducer(added, {
      type: 'moveStep',
      id: 'b',
      offset: -1,
    });
    expect(moved.steps.map((s) => s.id)).toEqual(['b', 'a']);
    expect(m.steps).toHaveLength(1);
    expect(
      missionReducer(moved, {
        type: 'camp',
        position: { latitude: 1, longitude: 2 },
      }).camp,
    ).toEqual({ latitude: 1, longitude: 2 });
    expect(
      missionReducer(moved, { type: 'removeStep', id: 'b' }).steps,
    ).toEqual(m.steps);
  });
  it('refuse coordonnées, identifiants, paramètres et activités invalides', () => {
    const m = fixture();
    for (const speedKmh of [0, -1, Infinity, NaN])
      expect(() =>
        validateMission({ ...m, parameters: { ...m.parameters, speedKmh } }),
      ).toThrow();
    expect(() =>
      validateMission({ ...m, camp: { latitude: 91, longitude: 0 } }),
    ).toThrow();
    expect(() =>
      validateMission({
        ...m,
        parameters: { ...m.parameters, reserveSeconds: 22000 },
      }),
    ).toThrow();
    expect(() => validateMission({ ...m, steps: [step, step] })).toThrow();
    expect(() =>
      validateMission({
        ...m,
        steps: [
          {
            ...step,
            activities: [{ ...step.activities[0]!, durationSeconds: -1 }],
          },
        ],
      }),
    ).toThrow();
  });
});
describe('distances martiennes horizontales', () => {
  it('utilise le rayon Mars 2000 et vérifie un quart de cercle analytique', () => {
    expect(distanceMetres(camp, camp)).toBe(0);
    expect(distanceMetres(camp, { latitude: 0, longitude: 90 })).toBeCloseTo(
      (Math.PI * MARS_RADIUS_METRES) / 2,
      5,
    );
    expect(
      distanceMetres(camp, { latitude: 0, longitude: 90 }, 100),
    ).toBeCloseTo(50 * Math.PI);
  });
  it('est symétrique et prend le chemin court à l’antiméridien', () => {
    const a = { latitude: 10, longitude: 179 };
    const b = { latitude: 10, longitude: -179 };
    expect(distanceMetres(a, b)).toBe(distanceMetres(b, a));
    expect(distanceMetres(a, b)).toBeLessThan(120000);
    expect(distanceMetres(camp, { latitude: 0, longitude: 360 })).toBeCloseTo(
      0,
    );
  });
  it('change la distance quand l’ordre de trois étapes change', () => {
    const m = {
      ...fixture(),
      steps: [
        step,
        {
          ...step,
          id: 'b',
          activities: [],
          position: { latitude: 2, longitude: 1 },
        },
        {
          ...step,
          id: 'c',
          activities: [],
          position: { latitude: 0, longitude: 3 },
        },
      ],
    };
    expect(calculateBudget(m)!.totalMetres).not.toBeCloseTo(
      calculateBudget(
        missionReducer(m, { type: 'moveStep', id: 'b', offset: -1 }),
      )!.totalMetres,
    );
  });
});
describe('budget et événements', () => {
  it('distingue exploration et retour et compte les unités une fois', () => {
    const m = fixture();
    const b = calculateBudget(m)!;
    const d = distanceMetres(camp, step.position);
    expect(b.totalMetres).toBeCloseTo(2 * d);
    expect(b.returnMetres).toBeCloseTo(d);
    expect(b.totalKilometres).toBeCloseTo((2 * d) / 1000);
    expect(b.walkingSeconds).toBeCloseTo(((2 * d) / 1000 / 2) * 3600);
    expect(b.marginSeconds).toBeCloseTo(21600 - b.walkingSeconds - 300 - 3600);
    expect(calculateBudget(createEmptyMission('jezero'))).toBeNull();
  });
  it('recalcule après activité, vitesse et déplacement du camp', () => {
    const m = fixture();
    const b = calculateBudget(m)!;
    const noActivity = missionReducer(m, {
      type: 'activities',
      stepId: 'a',
      activities: [],
    });
    expect(
      calculateBudget(noActivity)!.marginSeconds - b.marginSeconds,
    ).toBeCloseTo(300);
    expect(
      calculateBudget(
        missionReducer(m, { type: 'camp', position: step.position }),
      )!.returnMetres,
    ).toBe(0);
    expect(
      calculateBudget({ ...m, parameters: { ...m.parameters, speedKmh: 4 } })!
        .walkingSeconds,
    ).toBeCloseTo(b.walkingSeconds / 2);
  });
  it('cumule les retards et ralentissements puis annule exactement', () => {
    const m = {
      ...fixture(),
      steps: [{ ...step, position: { latitude: 0, longitude: 0.001 } }],
    };
    const b = calculateBudget(m)!;
    let changed = missionReducer(m, {
      type: 'addEvent',
      event: { id: 'd1', type: 'delay', activityId: 'photo', seconds: 30000 },
    });
    changed = missionReducer(changed, {
      type: 'addEvent',
      event: { id: 'd2', type: 'delay', activityId: 'photo', seconds: 120 },
    });
    for (const id of ['s1', 's2'])
      changed = missionReducer(changed, {
        type: 'addEvent',
        event: {
          id,
          type: 'slowdown',
          factor: 2,
          segmentIds: routeSegments(m).map((s) => s.id),
        },
      });
    expect(b.marginSeconds).toBeGreaterThan(0);
    expect(calculateBudget(changed)!.marginSeconds).toBeLessThan(0);
    expect(calculateBudget(changed)!.walkingSeconds).toBeCloseTo(
      b.walkingSeconds * 4,
    );
    expect(calculateBudget(changed)!.activitySeconds).toBe(30420);
    for (const id of ['d1', 'd2', 's1', 's2'])
      changed = missionReducer(changed, { type: 'removeEvent', id });
    expect(changed).toEqual(m);
    expect(calculateBudget(changed)).toEqual(b);
  });
  it('retire les événements orphelins après suppression des cibles', () => {
    const m = missionReducer(fixture(), {
      type: 'addEvent',
      event: { id: 'd', type: 'delay', activityId: 'photo', seconds: 1 },
    });
    expect(missionReducer(m, { type: 'removeStep', id: 'a' }).events).toEqual(
      [],
    );
  });
});
describe('O₂ optionnel simulé', () => {
  function enabled(): Mission {
    const m = fixture();
    return {
      ...m,
      parameters: {
        ...m.parameters,
        oxygen: { ...m.parameters.oxygen, enabled: true },
      },
    };
  }
  it('reste désactivé par défaut et distingue NoData de terrain plat explicite', () => {
    expect(calculateOxygen(fixture()).status).toBe('disabled');
    const m = enabled();
    expect(calculateOxygen(m).status).toBe('unavailable');
    expect(
      calculateOxygen(
        m,
        Object.fromEntries(routeSegments(m).map((s) => [s.id, null])),
      ).status,
    ).toBe('unavailable');
    expect(
      calculateOxygen({
        ...m,
        parameters: {
          ...m.parameters,
          oxygen: { ...m.parameters.oxygen, flatTerrain: true },
        },
      }).status,
    ).toBe('ready');
  });
  it('calcule chaque direction, les activités, le stock et la réserve', () => {
    const m = enabled();
    const segments = routeSegments(m);
    const b = calculateBudget(m)!;
    const r = calculateOxygen(m, {
      [segments[0]!.id]: 0.1,
      [segments[1]!.id]: -0.1,
    });
    expect(r.status).toBe('ready');
    if (r.status !== 'ready') return;
    expect(r.consumption).toHaveLength(3);
    expect(r.consumption[0]!.rate).toBeGreaterThan(r.consumption[1]!.rate);
    const expected =
      1.5 * 1.5 * 1.1 * (b.segments[0]!.seconds / 60) +
      1.5 * 1.1 * 1.1 * (b.returnSeconds / 60) +
      0.8 * 5;
    expect(r.totalGrams).toBeCloseTo(expected);
    expect(r.remainingGrams).toBeCloseTo(1000 - expected);
    expect(r.marginGrams).toBeCloseTo(800 - expected);
    const added = missionReducer(m, {
      type: 'activities',
      stepId: 'a',
      activities: [
        ...step.activities,
        { id: 'obs', type: 'observation', durationSeconds: 60 },
      ],
    });
    const after = calculateOxygen(added, {
      [segments[0]!.id]: 0.1,
      [segments[1]!.id]: -0.1,
    });
    if (after.status === 'ready')
      expect(after.totalGrams - r.totalGrams).toBeCloseTo(0.8);
  });
  it('refuse les paramètres invalides et ne suppose pas un bilan monotone avec la vitesse', () => {
    const m = enabled();
    for (const stockGrams of [-1, Infinity, NaN])
      expect(() =>
        validateMission({
          ...m,
          parameters: {
            ...m.parameters,
            oxygen: { ...m.parameters.oxygen, stockGrams },
          },
        }),
      ).toThrow();
    expect(() =>
      validateMission({
        ...m,
        parameters: {
          ...m.parameters,
          oxygen: { ...m.parameters.oxygen, reserveGrams: 1001 },
        },
      }),
    ).toThrow();
    const amount = (speedKmh: number) => {
      const r = calculateOxygen({
        ...m,
        parameters: {
          ...m.parameters,
          speedKmh,
          oxygen: { ...m.parameters.oxygen, flatTerrain: true },
        },
      });
      return r.status === 'ready' ? r.totalGrams : 0;
    };
    expect(amount(4)).toBeLessThan(amount(2));
    expect(amount(20)).toBeGreaterThan(amount(4));
  });
});

it('garde le bilan O₂ fini aux bornes des coefficients autorisés', () => {
  const m = fixture();
  const r = calculateOxygen({ ...m, parameters: { ...m.parameters, oxygen: { ...m.parameters.oxygen, enabled: true, flatTerrain: true, loadCoefficient: 1e9, loadKg: 1e9 } } });
  expect(r.status).toBe('ready');
  if (r.status === 'ready') expect(Number.isFinite(r.totalGrams)).toBe(true);
});
