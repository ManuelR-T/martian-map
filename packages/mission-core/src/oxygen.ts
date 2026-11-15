import { activityDurationMinutes, routeSegmentSpeeds } from './events';
import { calculateMissionBudget } from './budget';
import { missionGeometry, type Mission } from './mission';
import { groundDistanceMetres } from './distance';
import { sampleProfile, slopeSegments, type ElevationSampler } from './terrain';

export interface OxygenParameters {
  readonly modelVersion: 1;
  readonly stockGrams: number;
  readonly reserveGrams: number;
  readonly loadKg: number;
  readonly referenceGramsPerMinute: number;
  readonly activityGramsPerMinute: number;
  readonly referenceSpeedMetresPerSecond: number;
  readonly speedCoefficient: number;
  readonly uphillCoefficient: number;
  readonly downhillCoefficient: number;
  readonly loadCoefficientPerKg: number;
  readonly assumeFlatTerrain: boolean;
}
/** All defaults are simulated scenario values, without physiological calibration. */
export const DEFAULT_OXYGEN_PARAMETERS: OxygenParameters = {
  modelVersion: 1, stockGrams: 1000, reserveGrams: 200, loadKg: 20,
  referenceGramsPerMinute: 2, activityGramsPerMinute: 1,
  referenceSpeedMetresPerSecond: 0.5, speedCoefficient: 1,
  uphillCoefficient: 5, downhillCoefficient: 2, loadCoefficientPerKg: 0.01,
  assumeFlatTerrain: false,
};
export function validOxygenParameters(value: unknown): value is OxygenParameters {
  if (!value || typeof value !== 'object') return false;
  const p = value as OxygenParameters;
  return p.modelVersion === 1 && typeof p.assumeFlatTerrain === 'boolean'
    && [p.stockGrams, p.reserveGrams, p.loadKg, p.referenceGramsPerMinute, p.activityGramsPerMinute,
      p.speedCoefficient, p.uphillCoefficient, p.downhillCoefficient, p.loadCoefficientPerKg]
      .every(n => Number.isFinite(n) && n >= 0)
    && Number.isFinite(p.referenceSpeedMetresPerSecond) && p.referenceSpeedMetresPerSecond > 0
    && p.reserveGrams <= p.stockGrams;
}
/** Signed grade = rise / horizontal run. Downhill has its own nonnegative cost. */
export function oxygenFlow(p: OxygenParameters, speed: number, slopeDegrees: number): number {
  if (!validOxygenParameters(p) || !Number.isFinite(speed) || speed <= 0
    || !Number.isFinite(slopeDegrees) || Math.abs(slopeDegrees) >= 90) return NaN;
  const grade = Math.tan(slopeDegrees * Math.PI / 180);
  const speedFactor = 1 + p.speedCoefficient * (speed / p.referenceSpeedMetresPerSecond - 1) ** 2;
  const slopeFactor = 1 + p.uphillCoefficient * Math.max(0, grade) + p.downhillCoefficient * Math.max(0, -grade);
  return p.referenceGramsPerMinute * speedFactor * slopeFactor * (1 + p.loadCoefficientPerKg * p.loadKg);
}
export type OxygenBudget = { readonly status: 'invalid-inputs' | 'missing-inputs' | 'terrain-unavailable' }
  | { readonly status: 'ready'; readonly modelVersion: 1; readonly flatTerrain: boolean;
      readonly legs: readonly { readonly returnToCamp: boolean; readonly grams: number; readonly minutes: number }[];
      readonly activities: readonly { readonly stepId: string; readonly activityId: string; readonly grams: number }[];
      readonly totalGrams: number; readonly remainingGrams: number; readonly marginGrams: number; readonly overBudget: boolean };

/** Horizontal durations match the time model. Closed itinerary includes exactly one return. */
export function calculateMissionOxygen(mission: Mission | null, terrain?: { sample: ElevationSampler; spacingMetres: number }): OxygenBudget {
  if (!mission) return { status: 'missing-inputs' };
  const time = calculateMissionBudget(mission);
  if (time.status !== 'ready') return { status: time.status };
  const p = mission.parameters.oxygen ?? DEFAULT_OXYGEN_PARAMETERS;
  if (!validOxygenParameters(p)) return { status: 'invalid-inputs' };
  if (!p.assumeFlatTerrain && (!terrain || !Number.isFinite(terrain.spacingMetres) || terrain.spacingMetres <= 0)) return { status: 'terrain-unavailable' };
  const route = missionGeometry(mission)!.coordinates.map(([longitude, latitude]) => ({ longitude, latitude }));
  const returnSegments = (mission.routeLegs?.at(-1)?.length ?? 0) + 1;
  const legs: { returnToCamp: boolean; grams: number; minutes: number }[] = [];
  const speeds = routeSegmentSpeeds(mission);
  for (let i = 1; i < route.length; i++) {
    const from = route[i - 1]!, to = route[i]!;
    const speed = speeds[i - 1]!;
    const distance = groundDistanceMetres(from, to);
    let grams = 0;
    if (p.assumeFlatTerrain) grams = oxygenFlow(p, speed, 0) * distance / speed / 60;
    else if (distance > 0) {
      const profile = sampleProfile([from, to], coordinate => {
        const sample = terrain!.sample(coordinate);
        return sample.status === 'measured' && Number.isFinite(sample.elevationMetres)
          ? sample : { status: 'no-data', elevationMetres: null };
      }, terrain!.spacingMetres);
      for (const segment of slopeSegments(profile)) {
        if (segment.slopeDegrees === null) return { status: 'terrain-unavailable' };
        grams += oxygenFlow(p, speed, segment.slopeDegrees) * (segment.endMetres - segment.startMetres) / speed / 60;
      }
    }
    legs.push({ returnToCamp: i >= route.length - returnSegments, grams, minutes: distance / speed / 60 });
  }
  const activities = mission.steps.flatMap(step => step.activities.map(a => ({ stepId: step.id, activityId: a.id, grams: activityDurationMinutes(mission, step.id, a) * p.activityGramsPerMinute })));
  const totalGrams = legs.reduce((sum, leg) => sum + leg.grams, 0) + activities.reduce((sum, a) => sum + a.grams, 0);
  const remainingGrams = p.stockGrams - totalGrams;
  const marginGrams = remainingGrams - p.reserveGrams;
  if (![totalGrams, remainingGrams, marginGrams, ...legs.flatMap(l => [l.grams, l.minutes])].every(Number.isFinite)) return { status: 'invalid-inputs' };
  return { status: 'ready', modelVersion: 1, flatTerrain: p.assumeFlatTerrain, legs, activities, totalGrams, remainingGrams, marginGrams, overBudget: marginGrams < 0 };
}
