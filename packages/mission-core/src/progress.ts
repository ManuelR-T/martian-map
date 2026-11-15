import { groundDistanceMetres } from './distance';
import type { Mission, MissionActivity, MissionStep } from './mission';

/**
 * The app has no live position: the current step is the first one with an unchecked
 * activity (the last step once everything is checked). Shared by every tracking view.
 */
export function currentStepIndex(mission: Mission): number {
  const pending = mission.steps.findIndex(step => step.activities.some(activity => !activity.completed));
  return pending === -1 ? mission.steps.length - 1 : pending;
}

export interface MissionProgress {
  readonly stepIndex: number;
  readonly step: MissionStep;
  /** First unchecked activity of the current step; null once the whole plan is checked. */
  readonly activity: MissionActivity | null;
  /** Position of `activity` among the activities of its step, from 0. */
  readonly activityIndex: number;
  /** Null when the camp follows the current step. */
  readonly nextStep: MissionStep | null;
  /** Planned route from the camp to the current step: where the route profile places it. */
  readonly travelledMetres: number;
  /** Planned route from the current step to the next one, or to the camp. */
  readonly nextLegMetres: number;
  readonly completedActivities: number;
  readonly totalActivities: number;
  /** Every activity is checked: only the return to camp is left. */
  readonly finished: boolean;
  /**
   * Planned minutes left from the current step: unchecked activities, then the walk to the
   * remaining steps and back to camp. A plan figure, like the budget: no elapsed time is measured.
   */
  readonly remainingMinutes: number;
}

/** Manual progress through the plan, from the same mission the budget is computed on. */
export function missionProgress(mission: Mission | null): MissionProgress | null {
  if (!mission?.camp || mission.steps.length === 0) return null;
  const stepIndex = currentStepIndex(mission);
  const step = mission.steps[stepIndex]!;
  const stops = [mission.camp.position, ...mission.steps.map(s => s.position), mission.camp.position];
  // Leg k joins stop k to stop k + 1 through its route vertices; step i is stop i + 1.
  const legMetres = (k: number) => {
    const points = [stops[k]!, ...(mission.routeLegs?.[k] ?? []), stops[k + 1]!];
    return points.slice(1).reduce((sum, to, index) => sum + groundDistanceMetres(points[index]!, to), 0);
  };
  let travelledMetres = 0;
  for (let k = 0; k <= stepIndex; k += 1) travelledMetres += legMetres(k);
  let walkMetres = 0;
  for (let k = stepIndex + 1; k <= mission.steps.length; k += 1) walkMetres += legMetres(k);
  const activities = mission.steps.flatMap(s => s.activities);
  const pending = activities.filter(a => !a.completed);
  const activityIndex = step.activities.findIndex(a => !a.completed);
  return {
    stepIndex, step, activityIndex, travelledMetres,
    activity: step.activities[activityIndex] ?? null,
    nextStep: mission.steps[stepIndex + 1] ?? null,
    nextLegMetres: legMetres(stepIndex + 1),
    completedActivities: activities.length - pending.length,
    totalActivities: activities.length,
    finished: pending.length === 0,
    remainingMinutes: pending.reduce((sum, a) => sum + a.durationMinutes, 0) + walkMetres / mission.parameters.speedMetresPerSecond / 60,
  };
}
