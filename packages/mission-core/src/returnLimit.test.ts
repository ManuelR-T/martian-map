import { describe, expect, it } from 'vitest';
import { createEmptyMission, type Mission } from './mission';
import { MARS_RADIUS_METRES } from './distance';
import { DEFAULT_OXYGEN_PARAMETERS } from './oxygen';
import { calculateMissionReturnLimit, thresholdFractions } from './returnLimit';
const position = (metres: number) => ({ longitude: metres / MARS_RADIUS_METRES * 180 / Math.PI, latitude: 0 });
const mission: Mission = { ...createEmptyMission('test'), camp: { id: 'camp', name: 'Camp', regionId: 'test', position: position(0), provenance: 'simulation', note: '', referenceUrl: null },
  steps: [{ id: 'visit', name: 'Visit', position: position(60), siteId: null, activities: [] }],
  parameters: { availableSeconds: 180, reserveSeconds: 60, speedMetresPerSecond: 1 } };
function ready(value: Mission = mission, terrain?: Parameters<typeof calculateMissionReturnLimit>[1]) {
  const result = calculateMissionReturnLimit(value, terrain);
  if (result.status !== 'ready') throw Error(result.status);
  return result;
}
describe('immediate retreat', () => {
  it('reaches the time reserve at the visit with one reverse prefix', () => {
    const result = ready();
    expect(result.crossings[0]!.distanceMetres).toBeCloseTo(60);
    expect(result.crossings[0]!.timeMarginSeconds).toBeCloseTo(0);
    expect(result.crossings[0]!.constraints).toEqual(['time']);
  });
  it('crosses during an activity without charging future activities', () => {
    const value = { ...mission, parameters: { ...mission.parameters, availableSeconds: 300 }, steps: mission.steps.map(s => ({ ...s, activities: [{ id: 'photo', type: 'photo' as const, durationMinutes: 3, completed: false }, { id: 'later', type: 'photo' as const, durationMinutes: 100, completed: false }] })) };
    const crossing = ready(value).crossings[0]!;
    expect(crossing.activityId).toBe('photo');
    expect(crossing.activityOffsetSeconds).toBeCloseTo(120);
    expect(crossing.distanceMetres).toBeCloseTo(60);
    expect(ready({ ...value, steps: value.steps.map(s => ({ ...s, activities: s.activities.map(a => ({ ...a, completed: true })) })) })).toEqual(ready(value));
  });
  it('detects simultaneous O2/time equality and explicit flat terrain', () => {
    const result = ready({ ...mission, parameters: { ...mission.parameters, returnLimitMode: 'time-and-oxygen', oxygen: { ...DEFAULT_OXYGEN_PARAMETERS, assumeFlatTerrain: true, stockGrams: 6, reserveGrams: 2, speedCoefficient: 0, loadKg: 0 } } });
    expect(result.crossings[0]!.constraints).toEqual(['time', 'oxygen']);
  });
  it('charges uphill retreat separately after outbound descent', () => {
    const value: Mission = { ...mission, parameters: { ...mission.parameters, returnLimitMode: 'time-and-oxygen', oxygen: { ...DEFAULT_OXYGEN_PARAMETERS, stockGrams: 100, reserveGrams: 0, speedCoefficient: 0, loadKg: 0 } } };
    const result = ready(value, { spacingMetres: 20, sample: c => ({ status: 'measured', elevationMetres: -c.longitude * Math.PI / 180 * MARS_RADIUS_METRES * 0.1 }) });
    expect(result.portions.find(p => p.to.distanceMetres >= 59)!.to.oxygenMarginGrams).toBeCloseTo(94.6);
  });
  it('keeps missing O2 or terrain indeterminate, while time-only needs neither', () => {
    expect(ready().indeterminate).toBe(false);
    const combined = { ...mission, parameters: { ...mission.parameters, returnLimitMode: 'time-and-oxygen' as const } };
    expect(ready(combined).indeterminate).toBe(true);
    expect(ready({ ...combined, parameters: { ...combined.parameters, oxygen: DEFAULT_OXYGEN_PARAMETERS } }).indeterminate).toBe(true);
  });
  it('handles zero travel, initial equality, missing and invalid input', () => {
    expect(calculateMissionReturnLimit(null).status).toBe('missing-inputs');
    expect(calculateMissionReturnLimit(createEmptyMission('test')).status).toBe('missing-inputs');
    expect(calculateMissionReturnLimit({ ...mission, parameters: { ...mission.parameters, reserveSeconds: 181 } }).status).toBe('invalid-inputs');
    expect(ready({ ...mission, parameters: { ...mission.parameters, availableSeconds: 60 }, steps: mission.steps.map(s => ({ ...s, position: position(0) })) }).initial.state).toBe('reserve-reached');
    expect(ready({ ...mission, parameters: { ...mission.parameters, availableSeconds: 10000 } }).crossings).toHaveLength(0);
  });
  it('finds all roots without assuming monotonicity and ignores unknown margins', () => {
    expect([thresholdFractions([1], [-1]), thresholdFractions([-1], [1]), thresholdFractions([1], [-1])]).toEqual([[0.5], [0.5], [0.5]]);
    expect(thresholdFractions([null], [1])).toEqual([]);
  });
});

it('uses edited prefix geometry and preserves unknown oxygen after a terrain gap', () => {
  const edited: Mission = { ...mission, routeLegs: [[{ longitude: position(30).longitude, latitude: position(30).longitude }], []] };
  expect(ready(edited).crossings[0]!.coordinate).not.toEqual(ready().crossings[0]!.coordinate);
  const combined: Mission = { ...mission, parameters: { ...mission.parameters, returnLimitMode: 'time-and-oxygen', oxygen: DEFAULT_OXYGEN_PARAMETERS } };
  const result = ready(combined, { spacingMetres: 10, sample: c => c.longitude > position(20).longitude && c.longitude < position(40).longitude ? { status: 'no-data', elevationMetres: null } : { status: 'measured', elevationMetres: 0 } });
  expect(result.portions.at(-1)!.to.oxygenMarginGrams).toBeNull();
  expect(result.crossings[0]!.firstCertain).toBe(false);
});

it('keeps future return edits out of earlier retreat estimates', () => {
  const first = ready().crossings[0]!;
  const result = ready({ ...mission, routeLegs: [[], [{ longitude: 0, latitude: 0.001 }]] });
  expect(result.crossings[0]).toEqual(first);
});
it('finds an oxygen-only threshold inside a stopped activity', () => {
  const value: Mission = { ...mission, steps: mission.steps.map(s => ({ ...s, activities: [{ id: 'sample', type: 'sampling', durationMinutes: 10, completed: false }] })), parameters: { ...mission.parameters, availableSeconds: 10000, returnLimitMode: 'time-and-oxygen', oxygen: { ...DEFAULT_OXYGEN_PARAMETERS, stockGrams: 8, reserveGrams: 2, assumeFlatTerrain: true, speedCoefficient: 0, loadKg: 0 } } };
  const crossing = ready(value).crossings[0]!;
  expect(crossing.constraints).toEqual(['oxygen']);
  expect(crossing.activityOffsetSeconds).toBeCloseTo(120);
});
it('bounds tablet work and rejects overflowing costs instead of returning partial margins', () => {
  const value: Mission = { ...mission, parameters: { ...mission.parameters, returnLimitMode: 'time-and-oxygen', oxygen: DEFAULT_OXYGEN_PARAMETERS } };
  expect(calculateMissionReturnLimit(value, { spacingMetres: 0.0001, sample: () => ({ status: 'measured', elevationMetres: 0 }) }).status).toBe('too-large');
  expect(calculateMissionReturnLimit({ ...mission, parameters: { ...mission.parameters, speedMetresPerSecond: Number.MIN_VALUE } }).status).toBe('invalid-inputs');
});
