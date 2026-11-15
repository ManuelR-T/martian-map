import { describe, expect, it } from 'vitest';
import { calculateMissionOxygen, DEFAULT_OXYGEN_PARAMETERS as defaults, oxygenFlow, validOxygenParameters } from './oxygen';
import { createEmptyMission, isMission, type Mission } from './mission';
import { calculateMissionBudget } from './budget';
import { MARS_RADIUS_METRES } from './distance';
const mission: Mission = { ...createEmptyMission('test'),
  camp: { id: 'camp', name: 'Camp', regionId: 'test', position: { longitude: 0, latitude: 0 }, provenance: 'simulation', note: '', referenceUrl: null },
  steps: [{ id: 'stop', name: 'Stop', position: { longitude: 60 / MARS_RADIUS_METRES * 180 / Math.PI, latitude: 0 }, siteId: null,
    activities: [{ id: 'a', type: 'photo', durationMinutes: 10, completed: false }] }],
  parameters: { availableSeconds: 3600, reserveSeconds: 0, speedMetresPerSecond: 1, oxygen: { ...defaults, assumeFlatTerrain: true, loadKg: 0, speedCoefficient: 0 } } };
function ready(m = mission, terrain?: Parameters<typeof calculateMissionOxygen>[1]) {
  const result = calculateMissionOxygen(m, terrain);
  expect(result.status).toBe('ready');
  if (result.status !== 'ready') throw Error(result.status);
  return result;
}
describe('oxygen model v1', () => {
  it('uses grams/minute, includes exactly one return and protects the reserve', () => {
    const r = ready();
    expect(r.legs).toHaveLength(2);
    expect(r.legs.filter(l => l.returnToCamp)).toHaveLength(1);
    expect(r.totalGrams).toBeCloseTo(14); // two one-minute legs at 2 g/min + ten minutes at 1 g/min
    expect(r.remainingGrams).toBeCloseTo(986);
    expect(r.marginGrams).toBeCloseTo(786);
    const poor = ready({ ...mission, parameters: { ...mission.parameters, oxygen: { ...mission.parameters.oxygen!, stockGrams: 15, reserveGrams: 2 } } });
    expect(poor.marginGrams).toBeCloseTo(-1);
    expect(poor.overBudget).toBe(true);
  });
  it('adds stopped activities independently of walking and completion', () => {
    const added = { ...mission, steps: mission.steps.map(s => ({ ...s, activities: [...s.activities, { ...s.activities[0]!, id: 'b', completed: true }] })) };
    expect(ready(added).totalGrams - ready().totalGrams).toBeCloseTo(10);
  });
  it('evaluates uphill and return downhill separately on the actual mission route', () => {
    const m = { ...mission, parameters: { ...mission.parameters, oxygen: { ...mission.parameters.oxygen!, assumeFlatTerrain: false } } };
    const r = ready(m, { spacingMetres: 20, sample: c => ({ status: 'measured', elevationMetres: c.longitude * MARS_RADIUS_METRES * Math.PI / 180 * 0.1 }) });
    expect(r.legs[0]!.grams).toBeCloseTo(3);
    expect(r.legs[1]!.grams).toBeCloseTo(2.4);
    expect(r.flatTerrain).toBe(false);
  });
  it('includes edited detours and every return segment once, matching the time budget', () => {
    const m: Mission = { ...mission, routeLegs: [
      [{ longitude: 0, latitude: 0.001 }],
      [{ longitude: mission.steps[0]!.position.longitude, latitude: -0.001 }],
    ] };
    const result = ready(m);
    const time = calculateMissionBudget(m);
    if (time.status !== 'ready') throw Error(time.status);
    expect(result.legs).toHaveLength(4);
    expect(result.totalGrams).toBeCloseTo(time.walkingMinutes * 2 + 10);
    expect(result.legs.filter(l => l.returnToCamp).reduce((sum, l) => sum + l.minutes, 0)).toBeCloseTo(time.returnMinutes);
    expect(result.totalGrams).toBeGreaterThan(ready().totalGrams);
    const withRelief = { ...m, parameters: { ...m.parameters, oxygen: { ...m.parameters.oxygen!, assumeFlatTerrain: false } } };
    expect(calculateMissionOxygen(withRelief, { spacingMetres: 20, sample: c => Math.abs(c.latitude) > 0.0005
      ? { status: 'no-data', elevationMetres: null } : { status: 'measured', elevationMetres: 0 } }).status).toBe('terrain-unavailable');
  });
  it('preserves gaps and requires explicit flat terrain', () => {
    const m = { ...mission, parameters: { ...mission.parameters, oxygen: { ...defaults, assumeFlatTerrain: false } } };
    expect(calculateMissionOxygen(m).status).toBe('terrain-unavailable');
    expect(calculateMissionOxygen(m, { spacingMetres: 10, sample: () => ({ status: 'no-data', elevationMetres: null }) }).status).toBe('terrain-unavailable');
    expect(ready().flatTerrain).toBe(true);
  });
  it('responds to speed, slope and load at equal duration without assuming monotonic totals', () => {
    expect(oxygenFlow(defaults, 1, 0)).toBeGreaterThan(oxygenFlow(defaults, 0.5, 0));
    expect(oxygenFlow(defaults, 0.5, 10)).toBeGreaterThan(oxygenFlow(defaults, 0.5, 0));
    expect(oxygenFlow({ ...defaults, loadKg: 40 }, 0.5, 0)).toBeGreaterThan(oxygenFlow(defaults, 0.5, 0));
    const total = (speed: number) => ready({ ...mission, parameters: { ...mission.parameters, speedMetresPerSecond: speed, oxygen: { ...defaults, assumeFlatTerrain: true } } }).totalGrams;
    expect(total(0.5)).toBeLessThan(total(0.1));
    expect(total(0.5)).toBeLessThan(total(2));
  });
  it.each([NaN, Infinity, -1])('rejects invalid values %s and invalid persisted scenarios', value => {
    for (const key of ['stockGrams', 'reserveGrams', 'loadKg', 'referenceGramsPerMinute', 'activityGramsPerMinute', 'speedCoefficient', 'uphillCoefficient', 'downhillCoefficient', 'loadCoefficientPerKg', 'referenceSpeedMetresPerSecond']) {
      const oxygen = { ...defaults, [key]: value };
      expect(validOxygenParameters(oxygen)).toBe(false);
      expect(isMission({ ...mission, parameters: { ...mission.parameters, oxygen } })).toBe(false);
    }
  });
  it('rejects invalid reserve, version, speed, and overflow', () => {
    expect(calculateMissionOxygen({ ...mission, parameters: null as unknown as Mission['parameters'] }).status).toBe('invalid-inputs');
    expect(validOxygenParameters({ ...defaults, reserveGrams: 1001 })).toBe(false);
    expect(validOxygenParameters({ ...defaults, modelVersion: 2 })).toBe(false);
    expect(validOxygenParameters({ ...defaults, referenceSpeedMetresPerSecond: 0 })).toBe(false);
    expect(calculateMissionOxygen({ ...mission, parameters: { ...mission.parameters, oxygen: { ...defaults, assumeFlatTerrain: true, referenceGramsPerMinute: Number.MAX_VALUE } } }).status).toBe('invalid-inputs');
  });
  it('defaults older scenarios to model v1 and survives JSON serialization without affecting time budgets', () => {
    expect(ready(JSON.parse(JSON.stringify(mission)))).toEqual(ready());
    const old = { ...mission, parameters: { availableSeconds: 3600, reserveSeconds: 0, speedMetresPerSecond: 1 } };
    expect(calculateMissionOxygen(old).status).toBe('terrain-unavailable');
    expect(calculateMissionOxygen(null).status).toBe('missing-inputs');
    expect(createEmptyMission('test').parameters.oxygen).toEqual(defaults);
    expect(calculateMissionBudget(old)).toEqual(calculateMissionBudget(mission));
    expect(isMission(old)).toBe(true);
  });
});
