import { describe, expect, it } from 'vitest';
import { calculateMissionBudget } from './budget';
import { createEmptyMission, type Camp, type Mission, type MissionStep } from './mission';
import { missionProgress } from './progress';
import { radiationReturn } from './radiation';

const camp: Camp = { id: 'camp', name: 'Camp', regionId: 'jezero', position: { longitude: 77.4095, latitude: 18.4513 }, provenance: 'simulation', note: '', referenceUrl: null };
const site = (name: string, longitude: number, latitude: number, done: boolean[]): MissionStep => ({
  id: name, name, siteId: name, position: { longitude, latitude },
  activities: done.map((completed, index) => ({ id: `${name}-${index}`, type: 'observation', durationMinutes: 10, completed })),
});
const mission = (skinner: boolean[], wildcat: boolean[], amalik: boolean[]): Mission => ({
  ...createEmptyMission('jezero', 'demo'), camp,
  steps: [
    site('Skinner Ridge', 77.40617493, 18.45893136, skinner),
    site('Wildcat Ridge', 77.40588851, 18.45863707, wildcat),
    site('Amalik', 77.40144029, 18.45072631, amalik),
  ],
});
const ready = (m: Mission) => { const budget = calculateMissionBudget(m); if (budget.status !== 'ready') throw new Error(budget.status); return budget; };

describe('progression manuelle de la sortie', () => {
  it('place l’équipage à la première étape qui a une activité non cochée, comme l’alerte radiation', () => {
    const m = mission([true, true], [true, false, false], [false]);
    const progress = missionProgress(m)!;
    expect(progress.step.name).toBe('Wildcat Ridge');
    expect(progress.stepIndex).toBe(radiationReturn(m)!.fromIndex);
    expect(progress.activity?.id).toBe('Wildcat Ridge-1');
    expect(progress.activityIndex).toBe(1);
    expect(progress.nextStep?.name).toBe('Amalik');
    expect([progress.completedActivities, progress.totalActivities, progress.finished]).toEqual([3, 6, false]);
  });

  it('ne diverge pas du budget : le reste prévu est le plan moins la marche et les activités déjà faites', () => {
    const start = mission([false], [false], [false]);
    const budget = ready(start);
    const speed = start.parameters.speedMetresPerSecond * 60;
    const outbound = budget.distances.segments[0]!.metres / speed;
    expect(missionProgress(start)!.remainingMinutes).toBeCloseTo(budget.missionMinutes - outbound, 6);
    const second = missionProgress(mission([true], [false], [false]))!;
    expect(second.remainingMinutes).toBeCloseTo(budget.missionMinutes - outbound - 10 - budget.distances.segments[1]!.metres / speed, 6);
    expect(second.nextLegMetres).toBeCloseTo(budget.distances.segments[2]!.metres, 6);
    expect(second.legsMetres.reduce((a, b) => a + b, 0)).toBeCloseTo(budget.distances.total.metres, 6);
    expect(second.travelledMetres).toBeCloseTo(budget.distances.segments[0]!.metres + budget.distances.segments[1]!.metres, 6);
  });

  it('ne laisse que le retour au camp une fois tout coché', () => {
    const done = mission([true], [true], [true]);
    const progress = missionProgress(done)!;
    expect([progress.step.name, progress.activity, progress.nextStep, progress.finished]).toEqual(['Amalik', null, null, true]);
    expect(progress.remainingMinutes).toBeCloseTo(ready(done).returnMinutes, 6);
    expect(progress.nextLegMetres).toBeCloseTo(radiationReturn(done)!.distanceMetres, 6);
  });

  it('suit le tracé modifié du parcours', () => {
    const base = mission([true], [true], [true]);
    const detour: Mission = { ...base, routeLegs: [[], [], [], [{ longitude: 77.40, latitude: 18.44 }]] };
    expect(missionProgress(detour)!.remainingMinutes).toBeCloseTo(ready(detour).returnMinutes, 6);
    expect(missionProgress(detour)!.remainingMinutes).toBeGreaterThan(missionProgress(base)!.remainingMinutes);
  });

  it('ne suit rien sans camp ni étape', () => {
    expect(missionProgress(null)).toBeNull();
    expect(missionProgress(createEmptyMission('jezero'))).toBeNull();
    expect(missionProgress({ ...mission([false], [false], [false]), camp: null })).toBeNull();
  });
});
