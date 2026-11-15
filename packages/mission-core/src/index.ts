/** Planetocentric coordinates in degrees; longitude is positive east. */
export interface MarsCoordinate {
  readonly longitude: number;
  readonly latitude: number;
}

/** Durations at module boundaries are expressed in seconds. */
export function minutesToSeconds(minutes: number): number {
  if (!Number.isFinite(minutes) || minutes < 0) {
    throw new RangeError('Duration must be finite and non-negative.');
  }
  return minutes * 60;
}

export * from './mission';
export * from './radiation';
export {
  pointAtDistance,
  sampleProfile,
  slopeSegments,
  steepPortions,
  steepStretches,
} from './terrain';
export type {
  ElevationSample,
  ElevationSampler,
  ProfilePoint,
  ProfileStatus,
  SlopeSegment,
  SteepPortion,
} from './terrain';

export * from './distance';
