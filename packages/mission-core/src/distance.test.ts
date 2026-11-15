import { describe, expect, it } from 'vitest';
import { createEmptyMission, groundDistanceMetres, MARS_RADIUS_METRES, missionDistances, missionReducer, type MissionStep } from './index';

const origin = { longitude: 0, latitude: 0 };
const east = { longitude: 90, latitude: 0 };
const step = (id: string, longitude: number): MissionStep => ({ id, name: id, position: { longitude, latitude: 0 }, siteId: null, activities: [] });
const mission = {
  ...createEmptyMission('test'),
  camp: { id: 'camp', name: 'Camp', regionId: 'test', position: origin, provenance: 'simulation' as const, note: '', referenceUrl: null },
  steps: [step('a', 10), step('b', 30), step('c', 20)],
};

describe('horizontal spherical distances', () => {
  it('measures zero, symmetry and analytical quarter/half circles on a known sphere', () => {
    expect(groundDistanceMetres(origin, origin)).toBe(0);
    expect(groundDistanceMetres(origin, east, 100)).toBeCloseTo(50 * Math.PI, 10);
    expect(groundDistanceMetres(origin, { longitude: 180, latitude: 0 }, 100)).toBeCloseTo(100 * Math.PI, 10);
    expect(groundDistanceMetres(origin, east)).toBe(groundDistanceMetres(east, origin));
    expect(groundDistanceMetres(origin, east)).toBeCloseTo(MARS_RADIUS_METRES * Math.PI / 2, 7);
  });
  it('takes the short path over the antimeridian in either direction', () => {
    const a = { longitude: 179, latitude: 0 };
    const b = { longitude: -179, latitude: 0 };
    expect(groundDistanceMetres(a, b, 100)).toBeCloseTo(100 * Math.PI / 90, 10);
    expect(groundDistanceMetres(a, b)).toBe(groundDistanceMetres(b, a));
  });
  it.each([0, -1, NaN, Infinity])('rejects invalid radius %s', radius => {
    expect(() => groundDistanceMetres(origin, east, radius)).toThrow(RangeError);
  });
  it('rejects invalid coordinates', () => {
    for (const position of [{ longitude: NaN, latitude: 0 }, { longitude: 0, latitude: 91 }]) {
      expect(() => groundDistanceMetres(origin, position)).toThrow(RangeError);
    }
  });
});

describe('closed mission polyline', () => {
  it('reports every segment and separates exploration from exactly one return', () => {
    const result = missionDistances(mission, 180 / Math.PI)!;
    expect(result.segments.map(s => s.metres)).toEqual(expect.arrayContaining([expect.closeTo(10), expect.closeTo(20)]));
    expect(result.segments).toHaveLength(4);
    expect(result.exploration.metres).toBeCloseTo(40);
    expect(result.return.metres).toBeCloseTo(20);
    expect(result.total.metres).toBeCloseTo(60);
    expect(result.total.kilometres).toBeCloseTo(0.06);
    expect(result.total.metres).toBe(result.exploration.metres + result.return.metres);
    for (const value of [...result.segments, result.exploration, result.return, result.total]) expect(value.kilometres).toBe(value.metres / 1000);
  });
  it('recalculates after visit reordering without mutating the input', () => {
    const reordered = missionReducer(mission, { type: 'stepMoved', id: 'c', to: 1 });
    expect(missionDistances(reordered, 180 / Math.PI)?.total.metres).toBeCloseTo(60);
    expect(missionDistances(reordered, 180 / Math.PI)?.exploration.metres).toBeCloseTo(30);
    expect(mission.steps.map(s => s.id)).toEqual(['a', 'b', 'c']);
  });
  it('preserves total length on reversal and changes it for a different visiting order', () => {
    const reversed = { ...mission, steps: [...mission.steps].reverse() };
    expect(missionDistances(reversed)?.total.metres).toBeCloseTo(missionDistances(mission)!.total.metres);
    const longer = { ...mission, steps: [step('a', 10), step('b', -10), step('c', 30)] };
    const reordered = missionReducer(longer, { type: 'stepMoved', id: 'b', to: 0 });
    expect(missionDistances(longer)!.total.metres).toBeGreaterThan(missionDistances(reordered)!.total.metres);
  });
  it('keeps repeated vertices and a zero-length closed route', () => {
    const result = missionDistances({ ...mission, steps: [step('a', 0)] })!;
    expect(result.segments).toEqual([{ metres: 0, kilometres: 0 }, { metres: 0, kilometres: 0 }]);
    expect(result.total.metres).toBe(0);
  });
  it('distinguishes missing geometry from zero distance', () => {
    expect(missionDistances({ ...mission, camp: null })).toBeNull();
    expect(missionDistances({ ...mission, steps: [] })).toBeNull();
  });
});
