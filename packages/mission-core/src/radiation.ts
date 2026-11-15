import type { MarsCoordinate } from './index';
import type { Mission, MissionStep } from './mission';

/** Mars equatorial radius (IAU/MOLA), the sphere of the demo mission distances (PR #51, docs/demo/mission-demo.md). */
export const MARS_RADIUS_METRES = 3_396_190;

/** Great-circle distance on the Mars sphere (haversine). */
export function marsDistanceMetres(a: MarsCoordinate, b: MarsCoordinate): number {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLon = (b.longitude - a.longitude) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * MARS_RADIUS_METRES * Math.asin(Math.min(1, Math.sqrt(h)));
}

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
export function radiationReturn(mission: Mission): RadiationReturn | null {
  if (!mission.camp || mission.steps.length === 0) return null;
  const pending = mission.steps.findIndex(step => step.activities.some(activity => !activity.completed));
  const fromIndex = pending === -1 ? mission.steps.length - 1 : pending;
  const fromStep = mission.steps[fromIndex]!;
  const distanceMetres = marsDistanceMetres(fromStep.position, mission.camp.position);
  const abandoned = mission.steps.slice(fromIndex)
    .map(step => ({ step, activities: step.activities.filter(activity => !activity.completed).length }))
    .filter(entry => entry.activities > 0);
  return { fromStep, fromIndex, distanceMetres, returnSeconds: distanceMetres / mission.parameters.speedMetresPerSecond, abandoned };
}
