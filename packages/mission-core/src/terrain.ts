import type { MarsCoordinate } from './index';

import { groundDistanceMetres } from './distance';
export { MARS_RADIUS_METRES, groundDistanceMetres } from './distance';

export type ProfileStatus = 'measured' | 'no-data' | 'out-of-coverage';

/** Elevation read at one point; null unless measured, so a gap is never filled. */
export interface ElevationSample {
  readonly elevationMetres: number | null;
  readonly status: ProfileStatus;
}

/** Reads the relief at a coordinate. Provided by the data layer, which knows the grid. */
export type ElevationSampler = (coordinate: MarsCoordinate) => ElevationSample;

export interface ProfilePoint extends ElevationSample {
  /** Ground distance from the start of the route. */
  readonly distanceMetres: number;
  readonly coordinate: MarsCoordinate;
  /** Index of the route vertex this point sits on, so stops can be placed on the profile. */
  readonly vertexIndex?: number;
}

/** Slope between two consecutive profile points, positive uphill. Null across a gap. */
export interface SlopeSegment {
  readonly startMetres: number;
  readonly endMetres: number;
  readonly slopeDegrees: number | null;
}

/** Consecutive stretch steeper than the threshold, uphill or downhill. */
export interface SteepPortion {
  readonly startMetres: number;
  readonly endMetres: number;
  readonly maxSlopeDegrees: number;
}

/**
 * Samples the route every `spacingMetres` of ground distance, plus every vertex.
 * Use the cell size of the relief: a finer step would invent detail the data lacks.
 * Positions inside a segment are interpolated in lon/lat, exact enough at walk scale.
 */
export function sampleProfile(
  route: readonly MarsCoordinate[],
  sample: ElevationSampler,
  spacingMetres: number,
): ProfilePoint[] {
  if (!(spacingMetres > 0)) throw new RangeError('Spacing must be positive.');
  const points: ProfilePoint[] = [];
  let travelled = 0;
  const push = (coordinate: MarsCoordinate, distanceMetres: number, vertexIndex?: number) =>
    points.push({ coordinate, distanceMetres, ...sample(coordinate), ...(vertexIndex === undefined ? {} : { vertexIndex }) });

  route.forEach((vertex, index) => {
    const from = route[index - 1];
    if (!from) {
      push(vertex, 0, 0);
      return;
    }
    const length = groundDistanceMetres(from, vertex);
    const steps = Math.ceil(length / spacingMetres);
    for (let step = 1; step <= steps; step += 1) {
      const t = step / steps;
      push(
        {
          longitude: from.longitude + (vertex.longitude - from.longitude) * t,
          latitude: from.latitude + (vertex.latitude - from.latitude) * t,
        },
        travelled + length * t,
        step === steps ? index : undefined,
      );
    }
    travelled += length;
  });
  return points;
}

/** Slope of each step: rise over ground distance, in degrees. */
export function slopeSegments(profile: readonly ProfilePoint[]): SlopeSegment[] {
  const segments: SlopeSegment[] = [];
  for (let index = 1; index < profile.length; index += 1) {
    const from = profile[index - 1] as ProfilePoint;
    const to = profile[index] as ProfilePoint;
    const run = to.distanceMetres - from.distanceMetres;
    if (run <= 0) continue;
    const slopeDegrees =
      from.elevationMetres === null || to.elevationMetres === null
        ? null
        : (Math.atan((to.elevationMetres - from.elevationMetres) / run) * 180) / Math.PI;
    segments.push({ startMetres: from.distanceMetres, endMetres: to.distanceMetres, slopeDegrees });
  }
  return segments;
}

/** Stretches where the slope, uphill or downhill, exceeds the threshold. A gap ends a stretch. */
export function steepPortions(profile: readonly ProfilePoint[], thresholdDegrees: number): SteepPortion[] {
  const portions: SteepPortion[] = [];
  let current: { startMetres: number; endMetres: number; maxSlopeDegrees: number } | null = null;
  for (const segment of slopeSegments(profile)) {
    const steepness = segment.slopeDegrees === null ? null : Math.abs(segment.slopeDegrees);
    if (steepness !== null && steepness > thresholdDegrees) {
      if (current && current.endMetres === segment.startMetres) {
        current.endMetres = segment.endMetres;
        current.maxSlopeDegrees = Math.max(current.maxSlopeDegrees, steepness);
      } else {
        if (current) portions.push(current);
        current = { startMetres: segment.startMetres, endMetres: segment.endMetres, maxSlopeDegrees: steepness };
      }
    } else if (current) {
      portions.push(current);
      current = null;
    }
  }
  if (current) portions.push(current);
  return portions;
}

/** Route coordinates of each steep portion, to draw on the map exactly where the profile flags it. */
export function steepStretches(profile: readonly ProfilePoint[], portions: readonly SteepPortion[]): MarsCoordinate[][] {
  // Portion bounds are distances of profile points, so the comparison is exact.
  return portions.map((portion) =>
    profile
      .filter((point) => point.distanceMetres >= portion.startMetres && point.distanceMetres <= portion.endMetres)
      .map((point) => point.coordinate),
  );
}

/** Position on the route at a distance from its start; null outside the route. */
export function pointAtDistance(profile: readonly ProfilePoint[], metres: number): MarsCoordinate | null {
  const end = profile.at(-1);
  if (!end || metres < 0 || metres > end.distanceMetres) return null;
  const index = profile.findIndex((point) => point.distanceMetres >= metres);
  const to = profile[index] as ProfilePoint;
  const from = profile[index - 1];
  if (!from || to.distanceMetres === metres) return to.coordinate;
  // Consecutive points lie on one straight leg (stops are profile points), so linear is exact.
  const t = (metres - from.distanceMetres) / (to.distanceMetres - from.distanceMetres);
  return {
    longitude: from.coordinate.longitude + (to.coordinate.longitude - from.coordinate.longitude) * t,
    latitude: from.coordinate.latitude + (to.coordinate.latitude - from.coordinate.latitude) * t,
  };
}
