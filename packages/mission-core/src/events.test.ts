import { describe, expect, it } from 'vitest';
import { calculateMissionBudget, calculateMissionOxygen, createEmptyMission, DEFAULT_OXYGEN_PARAMETERS, isMission, MARS_RADIUS_METRES, missionReducer, missionProgress, radiationReturn, type Mission, type MissionEvent } from './index';
const m: Mission = { ...createEmptyMission('test'),
  camp: { id: 'c', name: 'Camp', regionId: 'test', position: { longitude: 0, latitude: 0 }, provenance: 'simulation', note: '', referenceUrl: null },
  steps: [{ id: 's', name: 'Stop', siteId: null, position: { longitude: 600 / MARS_RADIUS_METRES * 180 / Math.PI, latitude: 0 }, activities: [{ id: 'a', type: 'sampling', durationMinutes: 10, completed: false }] }],
  parameters: { availableSeconds: 40 * 60, reserveSeconds: 5 * 60, speedMetresPerSecond: 1, oxygen: { ...DEFAULT_OXYGEN_PARAMETERS, assumeFlatTerrain: true, speedCoefficient: 0 } },
};
const delay: MissionEvent = { id: 'delay', simulated: true, kind: 'activity-delay', stepId: 's', activityId: 'a', delayMinutes: 10 };
const slow: MissionEvent = { id: 'slow', simulated: true, kind: 'visibility', legIndices: [0, 1], speedFactor: 0.5 };
const add = (mission: Mission, event: MissionEvent) => missionReducer(mission, { type: 'eventAdded', event });
function budget(mission: Mission) { const b = calculateMissionBudget(mission); if (b.status !== 'ready') throw Error(b.status); return b; }
function oxygen(mission: Mission) { const b = calculateMissionOxygen(mission); if (b.status !== 'ready') throw Error(b.status); return b; }
describe('explicit simulated mission events', () => {
  it('adds delays, multiplies slowdowns and crosses the reserve threshold without mutating the plan', () => {
    const before = JSON.stringify(m);
    const delayed = add(add(m, delay), { ...delay, id: 'second', delayMinutes: 5 });
    expect(budget(m).marginMinutes).toBeCloseTo(5);
    expect(budget(delayed).activityMinutes).toBe(25);
    expect(budget(delayed).overBudget).toBe(true);
    const slowed = add(add(delayed, slow), { ...slow, id: 'second-slow', speedFactor: 0.5 });
    expect(budget(slowed).explorationMinutes).toBeCloseTo(40);
    expect(budget(slowed).returnMinutes).toBeCloseTo(40);
    expect(budget(slowed).missionMinutes).toBeCloseTo(105);
    expect(JSON.stringify(m)).toBe(before);
    const cleared = missionReducer(slowed, { type: 'eventsCleared' });
    expect(budget(cleared)).toEqual(budget(m));
    expect(oxygen(cleared)).toEqual(oxygen(m));
    expect(JSON.stringify(cleared)).toBe(before);
  });
  it('targets only selected legs including return detours and counts return once', () => {
    const detour: Mission = { ...m, routeLegs: [[], [{ longitude: 0, latitude: 0.001 }]] };
    const changed = add(detour, { ...slow, legIndices: [1] });
    expect(budget(changed).explorationMinutes).toBe(budget(detour).explorationMinutes);
    expect(budget(changed).returnMinutes).toBeCloseTo(budget(detour).returnMinutes * 2);
    const o = oxygen(changed), original = oxygen(detour);
    expect(o.legs[0]).toEqual(original.legs[0]);
    expect(o.legs.filter(l => l.returnToCamp).reduce((n, l) => n + l.minutes, 0)).toBeCloseTo(budget(changed).returnMinutes);
  });
  it('recalculates stopped oxygen and walking oxygen using the scenario speed', () => {
    expect(oxygen(add(m, delay)).totalGrams - oxygen(m).totalGrams).toBeCloseTo(10);
    expect(oxygen(add(m, slow)).legs[0]!.grams).toBeCloseTo(oxygen(m).legs[0]!.grams * 2);
    const removed = missionReducer(add(add(m, delay), slow), { type: 'eventRemoved', id: delay.id });
    expect(budget(removed)).toEqual(budget(add(m, slow)));
  });
  it('adapts the radiation direct return to the return-leg factor, ignoring abandoned delays and exploration slowdowns', () => {
    expect(radiationReturn(add(m, { ...slow, legIndices: [0] }))!.returnSeconds).toBe(radiationReturn(m)!.returnSeconds);
    expect(radiationReturn(add(add(m, delay), { ...slow, legIndices: [1] }))!.returnSeconds).toBeCloseTo(radiationReturn(m)!.returnSeconds * 2);
    expect(radiationReturn(m)!.abandoned).toHaveLength(1);
  });
  it('keeps completed activities planned, prunes removed targets and clears leg targets on topology changes', () => {
    const active = add(add(m, delay), slow);
    const checked = missionReducer(active, { type: 'activityChanged', stepId: 's', activity: { ...m.steps[0]!.activities[0]!, completed: true } });
    expect(budget(checked)).toEqual(budget(active));
    expect(missionReducer(active, { type: 'activityRemoved', stepId: 's', id: 'a' }).events).toEqual([slow]);
    expect(missionReducer(active, { type: 'campPlaced', camp: { ...m.camp!, name: 'Other' } }).events).toEqual([delay]);
    expect(missionReducer(active, { type: 'stepRemoved', id: 's' }).events).toEqual([]);
  });
  it('keeps helmet remaining time consistent with delays and selected-leg speeds', () => {
    const active = add(add(m, delay), slow);
    // Already at the first stop: outbound walking is excluded from the remainder.
    expect(missionProgress(active)!.remainingMinutes).toBeCloseTo(40);
    const checked = missionReducer(active, { type: 'activityChanged', stepId: 's', activity: { ...m.steps[0]!.activities[0]!, completed: true } });
    expect(missionProgress(checked)!.remainingMinutes).toBeCloseTo(20);
    expect(budget(checked)).toEqual(budget(active));
  });
  it('serializes version 1 scenarios and rejects invalid or ambiguous targets and factors', () => {
    expect(isMission(JSON.parse(JSON.stringify(add(add(m, delay), slow))))).toBe(true);
    for (const event of [{ ...delay, delayMinutes: -1 }, { ...delay, activityId: 'missing' }, { ...slow, speedFactor: 0 }, { ...slow, speedFactor: Infinity }, { ...slow, speedFactor: 1.1 }, { ...slow, legIndices: [2] }, { ...slow, legIndices: [0, 0] }, { ...slow, simulated: false }]) {
      expect(isMission({ ...m, events: [event] })).toBe(false);
    }
    expect(add(add(m, delay), delay)).toEqual(add(m, delay));
  });
});
