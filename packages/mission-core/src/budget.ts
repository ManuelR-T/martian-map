import { activityDurationMinutes, routeSegmentSpeeds } from './events';
import { missionDistances, type MissionDistances } from './distance';
import { isMission, type Mission } from './mission';

export interface CalculatedMissionBudget {
  readonly status: 'ready';
  readonly distances: MissionDistances;
  readonly speedKilometresPerHour: number;
  readonly availableMinutes: number;
  readonly explorationMinutes: number;
  readonly returnMinutes: number;
  /** Exploration plus return; do not subtract the return again. */
  readonly walkingMinutes: number;
  /** All planned visit activities, including completed ones; no elapsed time is measured. */
  readonly activityMinutes: number;
  readonly reserveMinutes: number;
  readonly missionMinutes: number;
  readonly marginMinutes: number;
  readonly overBudget: boolean;
}

export type MissionBudget = CalculatedMissionBudget
  | { readonly status: 'missing-inputs'; readonly missing: readonly ('mission' | 'camp' | 'steps')[] }
  | { readonly status: 'invalid-inputs' };

/** Full planned budget, in minutes. Uses #13's horizontal Mars distances without terrain correction. */
export function calculateMissionBudget(mission: Mission | null): MissionBudget {
  if (!mission) return { status: 'missing-inputs', missing: ['mission'] };
  if (!isMission(mission)) return { status: 'invalid-inputs' };
  const missing: ('camp' | 'steps')[] = [];
  if (!mission.camp) missing.push('camp');
  if (!mission.steps.length) missing.push('steps');
  if (missing.length) return { status: 'missing-inputs', missing };

  const distances = missionDistances(mission)!;
  const speedKilometresPerHour = mission.parameters.speedMetresPerSecond * 3.6;
  const availableMinutes = mission.parameters.availableSeconds / 60;
  const reserveMinutes = mission.parameters.reserveSeconds / 60;
  const speeds = routeSegmentSpeeds(mission);
  const times = distances.segments.map((d, i) => d.metres / speeds[i]! / 60);
  const returnSegments = (mission.routeLegs?.at(-1)?.length ?? 0) + 1;
  const explorationMinutes = times.slice(0, -returnSegments).reduce((sum, t) => sum + t, 0);
  const returnMinutes = times.slice(-returnSegments).reduce((sum, t) => sum + t, 0);
  const walkingMinutes = explorationMinutes + returnMinutes;
  const activityMinutes = mission.steps.reduce((sum, step) => sum
    + step.activities.reduce((minutes, activity) => minutes + activityDurationMinutes(mission, step.id, activity), 0), 0);
  const missionMinutes = walkingMinutes + activityMinutes;
  const marginMinutes = availableMinutes - missionMinutes - reserveMinutes;
  // Valid finite inputs may still overflow when accumulated or divided by a tiny speed.
  if (![speedKilometresPerHour, availableMinutes, reserveMinutes, explorationMinutes, returnMinutes,
    walkingMinutes, activityMinutes, missionMinutes, marginMinutes].every(Number.isFinite)) return { status: 'invalid-inputs' };

  return { status: 'ready', distances, speedKilometresPerHour, availableMinutes, explorationMinutes, returnMinutes,
    walkingMinutes, activityMinutes, reserveMinutes, missionMinutes, marginMinutes, overBudget: marginMinutes < 0 };
}
