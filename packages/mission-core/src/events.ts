import type { Mission, MissionActivity } from './mission';

export type MissionEvent = { readonly id: string; readonly simulated: true } & (
  | { readonly kind: 'activity-delay'; readonly stepId: string; readonly activityId: string; readonly delayMinutes: number }
  | { readonly kind: 'visibility'; readonly legIndices: readonly number[]; readonly speedFactor: number }
);
/** Targets are logical camp → steps → camp legs, including all their edited vertices. */
export function validMissionEvents(mission: Mission): boolean {
  const events = mission.events;
  return events === undefined || (Array.isArray(events) && new Set(events.map(e => e?.id)).size === events.length && events.every(e => {
    if (!e || typeof e.id !== 'string' || !e.id.trim() || e.simulated !== true) return false;
    if (e.kind === 'activity-delay') return Number.isFinite(e.delayMinutes) && e.delayMinutes >= 0
      && mission.steps.some(s => s.id === e.stepId && s.activities.some(a => a.id === e.activityId));
    return e.kind === 'visibility' && !!mission.camp && mission.steps.length > 0
      && Number.isFinite(e.speedFactor) && e.speedFactor > 0 && e.speedFactor <= 1
      && Array.isArray(e.legIndices) && e.legIndices.length > 0 && new Set(e.legIndices).size === e.legIndices.length
      && e.legIndices.every((i: number) => Number.isInteger(i) && i >= 0 && i <= mission.steps.length);
  }));
}
/** Delays add; visibility factors multiply. Both last until explicitly removed, with no elapsed-time inference. */
export function activityDurationMinutes(mission: Mission, stepId: string, activity: MissionActivity): number {
  return activity.durationMinutes + (mission.events ?? []).reduce((sum, e) => sum
    + (e.kind === 'activity-delay' && e.stepId === stepId && e.activityId === activity.id ? e.delayMinutes : 0), 0);
}
export function legSpeedFactor(mission: Mission, index: number): number {
  return (mission.events ?? []).reduce((factor, e) => factor * (e.kind === 'visibility' && e.legIndices.includes(index) ? e.speedFactor : 1), 1);
}
/** One speed per geometric edge. Return detours share the final logical leg's factor. */
export function routeSegmentSpeeds(mission: Mission): number[] {
  return Array.from({ length: mission.steps.length + 1 }, (_, i) =>
    Array.from({ length: (mission.routeLegs?.[i]?.length ?? 0) + 1 }, () => mission.parameters.speedMetresPerSecond * legSpeedFactor(mission, i))).flat();
}
