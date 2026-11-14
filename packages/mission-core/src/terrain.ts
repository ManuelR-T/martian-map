import type { MarsCoordinate } from './index';

/** Mean Mars radius used by the NASA M20 map configuration and the relief grids. */
export const MARS_RADIUS_METRES = 3_396_190;

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

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/** Great-circle ground distance on the Mars sphere (haversine). Minimal version until #13. */
export function groundDistanceMetres(from: MarsCoordinate, to: MarsCoordinate): number {
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) * Math.cos(toRadians(to.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * MARS_RADIUS_METRES * Math.asin(Math.min(1, Math.sqrt(a)));
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
