import { describe, expect, it } from 'vitest';
import { createEmptyMission, type Camp, type Mission, type MissionStep } from './mission';
import { radiationReturn } from './radiation';

// First demo camp of docs/demo/mission-demo.md (PR #51, values since replaced by the Alpha camp) and the three NASA sample sites.
const camp: Camp = { id: 'camp', name: 'Camp', regionId: 'jezero', position: { longitude: 77.4095, latitude: 18.4513 }, provenance: 'simulation', note: '', referenceUrl: null };
const site = (name: string, longitude: number, latitude: number, done: boolean[]): MissionStep => ({
  id: name, name, siteId: name, position: { longitude, latitude },
  activities: done.map((completed, index) => ({ id: `${name}-${index}`, type: 'observation', durationMinutes: 10, completed })),
});
const mission = (skinner: boolean[], wildcat: boolean[], amalik: boolean[], withCamp = true): Mission => ({
  ...createEmptyMission('jezero', 'demo'), camp: withCamp ? camp : null,
  steps: [
    site('Skinner Ridge', 77.40617493, 18.45893136, skinner),
    site('Wildcat Ridge', 77.40588851, 18.45863707, wildcat),
    site('Amalik', 77.40144029, 18.45072631, amalik),
  ],
});

describe('alerte radiation simulée pendant la sortie', () => {
  it("rentre depuis la première étape qui a encore une activité non cochée et abandonne tout ce qui n'est pas coché ensuite", () => {
    const result = radiationReturn(mission([true, true], [true, false, false], [false, false, false]))!;
    expect(result.fromStep.name).toBe('Wildcat Ridge');
    expect(result.abandoned.map(entry => [entry.step.name, entry.activities])).toEqual([['Wildcat Ridge', 2], ['Amalik', 3]]);
  });

  it("donne la distance et le temps du retour direct au camp à la vitesse de la mission", () => {
    // mission-demo.md: Amalik → camp = 454,5 m. Default speed 0,5 m/s → about 15 min.
    const result = radiationReturn(mission([true], [true], [false]))!;
    expect(result.fromStep.name).toBe('Amalik');
    expect(result.distanceMetres).toBeCloseTo(454.5, 0);
    expect(result.returnSeconds).toBeCloseTo(909, 0);
  });

  it('rentre depuis la première étape quand rien n’est encore coché', () => {
    // mission-demo.md: camp → Skinner Ridge = 489,5 m.
    const result = radiationReturn(mission([false], [false], [false]))!;
    expect(result.fromStep.name).toBe('Skinner Ridge');
    expect(result.distanceMetres).toBeCloseTo(489.5, 0);
  });

  it("rentre depuis la dernière étape sans rien abandonner quand tout est coché", () => {
    const result = radiationReturn(mission([true], [true], [true]))!;
    expect(result.fromStep.name).toBe('Amalik');
    expect(result.abandoned).toEqual([]);
  });

  it('ne propose aucun retour sans camp', () => {
    expect(radiationReturn(mission([false], [false], [false], false))).toBeNull();
  });
});
