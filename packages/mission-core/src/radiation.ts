import { legSpeedFactor } from './events';
import { marsDistanceMetres } from './distance';
export { MARS_RADIUS_METRES, marsDistanceMetres } from './distance';
import type { Mission, MissionStep } from './mission';
import { currentStepIndex } from './progress';

export interface RadiationReturn {
  readonly fromStep: MissionStep;
  readonly fromIndex: number;
  readonly distanceMetres: number;
  readonly returnSeconds: number;
  /** Steps that still had unchecked activities, with how many are dropped. */
  readonly abandoned: readonly { readonly step: MissionStep; readonly activities: number }[];
}

/**
 * Simulated radiation alert during a walk: direct return to camp from the current step.
 * The app has no live position, so the current step is the first one with an unchecked
 * activity (the last step once everything is checked).
 */
export function radiationReturn(mission: Mission, frozenFromIndex?: number): RadiationReturn | null {
  if (!mission.camp || mission.steps.length === 0) return null;
  const fromIndex = frozenFromIndex ?? currentStepIndex(mission);
  if (!Number.isInteger(fromIndex) || fromIndex < 0 || fromIndex >= mission.steps.length) return null;
  const fromStep = mission.steps[fromIndex]!;
  const distanceMetres = marsDistanceMetres(fromStep.position, mission.camp.position);
  const abandoned = mission.steps.slice(fromIndex)
    .map(step => ({ step, activities: step.activities.filter(activity => !activity.completed).length }))
    .filter(entry => entry.activities > 0);
  const returnSeconds = distanceMetres / (mission.parameters.speedMetresPerSecond * legSpeedFactor(mission, mission.steps.length));
  if (!Number.isFinite(returnSeconds)) return null;
  return { fromStep, fromIndex, distanceMetres, returnSeconds, abandoned };
}
