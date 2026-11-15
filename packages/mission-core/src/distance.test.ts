import { describe, expect, it } from 'vitest';
import { groundDistanceMetres, MARS_RADIUS_METRES, missionDistances, polylineDistances } from './distance';
import { createEmptyMission, missionReducer, type Camp, type MissionStep } from './mission';

const point = (longitude: number, latitude = 0) => ({ longitude, latitude });

describe('distances horizontales martiennes', () => {
  it('utilise le rayon équatorial de Jezero et des unités explicites', () => {
    expect(MARS_RADIUS_METRES).toBe(3_396_190);
    const result = polylineDistances([point(0), point(1)]);
    expect(result.total.metres).toBeCloseTo(MARS_RADIUS_METRES * Math.PI / 180, 6);
    expect(result.total.kilometres).toBe(result.total.metres / 1000);
  });
  it('mesure un quart de grand cercle sur une sphère connue', () => {
    expect(groundDistanceMetres(point(0), point(90), 100)).toBeCloseTo(50 * Math.PI, 10);
    expect(groundDistanceMetres(point(0), point(0, 90), 100)).toBeCloseTo(50 * Math.PI, 10);
    expect(groundDistanceMetres(point(0), point(180), 100)).toBeCloseTo(100 * Math.PI, 10);
  });
  it('est nulle pour deux positions identiques et symétrique', () => {
    const a = point(77.4, 18.45), b = point(77.41, 18.46);
    expect(groundDistanceMetres(a, a)).toBe(0);
    expect(groundDistanceMetres(a, b)).toBe(groundDistanceMetres(b, a));
    expect(polylineDistances([a, a]).segments).toEqual([{ metres: 0, kilometres: 0 }]);
    expect(polylineDistances([]).total.metres).toBe(0);
    expect(polylineDistances([a]).total.metres).toBe(0);
  });
  it('traverse l’antiméridien par le chemin court', () => {
    expect(groundDistanceMetres(point(179), point(-179), 100)).toBeCloseTo(100 * Math.PI / 90, 10);
    expect(groundDistanceMetres(point(180), point(-180))).toBeCloseTo(0, 6);
  });
  it('somme chaque segment dans l’ordre et conserve la longueur par inversion', () => {
    const route = [point(0), point(1), point(3), point(2)];
    const result = polylineDistances(route, 100);
    expect(result.segments.map(s => s.metres)).toEqual([1, 2, 1].map(n => groundDistanceMetres(point(0), point(n), 100)));
    expect(result.total.metres).toBeCloseTo(polylineDistances([...route].reverse(), 100).total.metres, 10);
    expect(polylineDistances([route[0]!, route[2]!, route[1]!, route[3]!], 100).total.metres).toBeGreaterThan(result.total.metres);
  });
  it('refuse un rayon ou des coordonnées invalides', () => {
    for (const radius of [0, -1, Infinity, NaN]) {
      expect(() => groundDistanceMetres(point(0), point(1), radius)).toThrow(RangeError);
      expect(() => polylineDistances([], radius)).toThrow(RangeError);
    }
    for (const invalid of [point(NaN), point(181), point(0, 91)]) {
      expect(() => groundDistanceMetres(point(0), invalid)).toThrow(RangeError);
      expect(() => polylineDistances([invalid])).toThrow(RangeError);
    }
  });
});

it('distingue exploration et retour après déplacement et suppression des étapes', () => {
  const camp: Camp = { id: 'camp', name: 'Camp', regionId: 'test', position: point(0), provenance: 'simulation', note: '', referenceUrl: null };
  const step = (id: string, longitude: number): MissionStep => ({ id, name: id, position: point(longitude), siteId: null, activities: [] });
  let mission = createEmptyMission('test');
  expect(missionDistances(mission)).toBeNull();
  mission = missionReducer(mission, { type: 'campPlaced', camp });
  expect(missionDistances(mission)).toBeNull();
  mission = missionReducer(mission, { type: 'stepAdded', step: step('a', 1) });
  const one = missionDistances(mission)!;
  expect(one.exploration).toEqual(one.return);
  expect(one.total.metres).toBe(one.return.metres * 2);
  mission = missionReducer(mission, { type: 'stepAdded', step: step('b', 3) });
  const two = missionDistances(mission)!;
  expect(two.segments).toHaveLength(3);
  expect(two.total.metres).toBeCloseTo(two.exploration.metres + two.return.metres, 8);
  expect(two.return.metres).toBeCloseTo(groundDistanceMetres(point(3), point(0)), 8);
  mission = missionReducer(mission, { type: 'stepMoved', id: 'b', to: 0 });
  expect(missionDistances(mission)!.return).toEqual(one.return);
  expect(missionDistances(mission)!.exploration.metres).toBeGreaterThan(two.exploration.metres);
  mission = missionReducer(mission, { type: 'stepRemoved', id: 'b' });
  expect(missionDistances(mission)).toEqual(one);
});

it('counts every drawn return segment exactly once', () => {
  const mission = { ...createEmptyMission('jezero'), camp: { id: 'c', name: 'c', regionId: 'jezero', position: { longitude: 0, latitude: 0 }, provenance: 'simulation' as const, note: '', referenceUrl: null }, steps: [{ id: 's', name: 's', position: { longitude: 1, latitude: 0 }, siteId: null, activities: [] }], routeLegs: [[], [{ longitude: 2, latitude: 0 }]] };
  const result = missionDistances(mission, 100)!;
  expect(result.return.metres).toBeCloseTo(3 * Math.PI / 180 * 100);
  expect(result.total.metres).toBeCloseTo(result.exploration.metres + result.return.metres);
});
