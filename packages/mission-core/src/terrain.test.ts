import { describe, expect, it } from 'vitest';
import {
  MARS_RADIUS_METRES,
  groundDistanceMetres,
  sampleProfile,
  slopeSegments,
  steepPortions,
  type ElevationSampler,
  type MarsCoordinate,
} from './index';

const METRES_PER_DEGREE_LATITUDE = (MARS_RADIUS_METRES * Math.PI) / 180;
const SOUTH = 18.44;
const NORTH = 18.46;
const STEP = 4; // HiRISE relief cell size

const measured = (elevationMetres: number) => ({ elevationMetres, status: 'measured' as const });
const flat: ElevationSampler = () => measured(-2520);
// Rises 10 m for every 20 m walked north: a known 26.57° slope.
const plane: ElevationSampler = ({ latitude }) =>
  measured(-2520 + 0.5 * (latitude - SOUTH) * METRES_PER_DEGREE_LATITUDE);
const northward: MarsCoordinate[] = [
  { longitude: 77.4, latitude: 18.445 },
  { longitude: 77.4, latitude: 18.455 },
];

describe('ground distance on Mars', () => {
  it('measures one degree of latitude as 59.3 km on the Mars sphere, not the 111 km of Earth', () => {
    const distance = groundDistanceMetres({ longitude: 77.4, latitude: 18 }, { longitude: 77.4, latitude: 19 });
    expect(distance).toBeCloseTo(59_275, 0);
  });
});

describe('route profile', () => {
  it('samples the route at least every 4 m of ground distance, ending at its full length', () => {
    const profile = sampleProfile(northward, flat, STEP);
    const steps = profile.slice(1).map((point, index) => point.distanceMetres - (profile[index]?.distanceMetres ?? 0));
    expect(Math.max(...steps)).toBeLessThanOrEqual(STEP);
    expect(profile.at(-1)?.distanceMetres).toBeCloseTo(0.01 * METRES_PER_DEGREE_LATITUDE, 3);
  });

  it('gives a 0° slope on flat terrain', () => {
    for (const segment of slopeSegments(sampleProfile(northward, flat, STEP))) {
      expect(segment.slopeDegrees).toBeCloseTo(0, 6);
    }
  });

  it('finds 26.6° uphill on a plane rising 10 m every 20 m, and -26.6° walking it back down', () => {
    for (const segment of slopeSegments(sampleProfile(northward, plane, STEP))) {
      expect(segment.slopeDegrees).toBeCloseTo(26.565, 1);
    }
    for (const segment of slopeSegments(sampleProfile([...northward].reverse(), plane, STEP))) {
      expect(segment.slopeDegrees).toBeCloseTo(-26.565, 1);
    }
  });

  it('leaves a gap where the relief has no data, instead of inventing an altitude', () => {
    const holed: ElevationSampler = (coordinate) =>
      Math.abs(coordinate.latitude - 18.45) < 0.0005 ? { elevationMetres: null, status: 'no-data' } : flat(coordinate);
    const profile = sampleProfile(northward, holed, STEP);

    expect(profile.some((point) => point.status === 'no-data' && point.elevationMetres === null)).toBe(true);
    expect(slopeSegments(profile).some((segment) => segment.slopeDegrees === null)).toBe(true);
  });

  it('keeps the out-of-coverage status the relief reports for points beyond its edge', () => {
    const bounded: ElevationSampler = (coordinate) =>
      coordinate.latitude > NORTH ? { elevationMetres: null, status: 'out-of-coverage' } : flat(coordinate);
    const profile = sampleProfile([northward[0] as MarsCoordinate, { longitude: 77.4, latitude: 18.47 }], bounded, STEP);
    expect(profile[0]?.status).toBe('measured');
    expect(profile.at(-1)?.status).toBe('out-of-coverage');
  });
});

describe('steep portions', () => {
  it('flags the whole 26.6° climb above a 15° threshold, and nothing above 30°', () => {
    const profile = sampleProfile(northward, plane, STEP);
    const portions = steepPortions(profile, 15);
    expect(portions).toHaveLength(1);
    expect(portions[0]?.startMetres).toBe(0);
    expect(portions[0]?.endMetres).toBeCloseTo(profile.at(-1)?.distanceMetres ?? 0, 6);
    expect(portions[0]?.maxSlopeDegrees).toBeCloseTo(26.565, 1);
    expect(steepPortions(profile, 30)).toEqual([]);
  });

  it('flags a steep descent too, since walking down a steep slope is also a risk', () => {
    expect(steepPortions(sampleProfile([...northward].reverse(), plane, STEP), 15)).toHaveLength(1);
  });

  it('splits a steep stretch at a data gap rather than assuming the slope continues', () => {
    const holed: ElevationSampler = (coordinate) =>
      Math.abs(coordinate.latitude - 18.45) < 0.0005 ? { elevationMetres: null, status: 'no-data' } : plane(coordinate);
    expect(steepPortions(sampleProfile(northward, holed, STEP), 15)).toHaveLength(2);
  });
});
