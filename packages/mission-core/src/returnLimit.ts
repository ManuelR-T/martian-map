import type { MarsCoordinate } from './index';
import { groundDistanceMetres } from './distance';
import { isMission, type Mission } from './mission';
import { oxygenFlow } from './oxygen';
import { sampleProfile, type ElevationSampler } from './terrain';

export type ReturnState = 'positive' | 'reserve-reached' | 'indeterminate';
export interface ReturnPoint {
  readonly coordinate: MarsCoordinate;
  readonly distanceMetres: number;
  readonly elapsedSeconds: number;
  readonly timeMarginSeconds: number;
  readonly oxygenMarginGrams: number | null;
  readonly state: ReturnState;
  readonly legIndex: number;
  readonly stepId: string | null;
  readonly activityId: string | null;
  readonly activityOffsetSeconds: number;
}
export interface ReturnCrossing extends ReturnPoint {
  readonly id: string;
  readonly constraints: readonly ('time' | 'oxygen')[];
  readonly direction: 'entry' | 'exit';
  readonly bracketMetres: number;
  readonly firstCertain: boolean;
}
export interface ReturnPortion { readonly from: ReturnPoint; readonly to: ReturnPoint; readonly state: ReturnState }
export type MissionReturnLimit = { readonly status: 'missing-inputs' | 'invalid-inputs' | 'too-large' }
  | { readonly status: 'ready'; readonly initial: ReturnPoint; readonly portions: readonly ReturnPortion[];
      readonly crossings: readonly ReturnCrossing[]; readonly indeterminate: boolean; readonly oxygenEnabled: boolean;
      readonly spacingMetres: number | null; readonly flatTerrain: boolean };

/** Roots of linear margins; independent of the order or monotonicity of successive intervals. */
export function thresholdFractions(from: readonly (number | null)[], to: readonly (number | null)[]): number[] {
  return [...new Set(from.flatMap((a, i) => {
    const b = to[i];
    if (a === null || b == null || a === b || (a > 0 && b > 0) || (a < 0 && b < 0)) return [];
    return [-a / (b - a)];
  }))].sort((a, b) => a - b);
}
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const stateOf = (time: number, oxygen: number | null, enabled: boolean): ReturnState =>
  time <= 0 || (enabled && oxygen !== null && oxygen <= 0) ? 'reserve-reached' : enabled && oxygen === null ? 'indeterminate' : 'positive';

/** Planned elapsed time, never telemetry. Retreat always reverses the traveled prefix. */
export function calculateMissionReturnLimit(mission: Mission | null, terrain?: { sample: ElevationSampler; spacingMetres: number }): MissionReturnLimit {
  if (!mission) return { status: 'missing-inputs' };
  if (!isMission(mission)) return { status: 'invalid-inputs' };
  if (!mission.camp || !mission.steps.length) return { status: 'missing-inputs' };
  const parameters = mission.parameters;
  const oxygenEnabled = parameters.returnLimitMode === 'time-and-oxygen';
  const oxygen = parameters.oxygen;
  const flatTerrain = oxygen?.assumeFlatTerrain === true;
  const terrainValid = !!terrain && Number.isFinite(terrain.spacingMetres) && terrain.spacingMetres > 0;
  const stops = [mission.camp.position, ...mission.steps.map(s => s.position), mission.camp.position];
  let elapsedSeconds = 0, distanceMetres = 0, consumed = 0, reverseConsumed = 0;
  let oxygenKnown = !oxygenEnabled || !!oxygen;
  let samples = 0;
  const portions: ReturnPortion[] = [];
  const crossings: ReturnCrossing[] = [];
  const point = (coordinate: MarsCoordinate, legIndex: number, stepId: string | null, activityId: string | null = null, activityOffsetSeconds = 0): ReturnPoint => {
    const timeMarginSeconds = parameters.availableSeconds - elapsedSeconds - distanceMetres / parameters.speedMetresPerSecond - parameters.reserveSeconds;
    const oxygenMarginGrams = oxygenEnabled && oxygenKnown && oxygen ? oxygen.stockGrams - consumed - reverseConsumed - oxygen.reserveGrams : null;
    return { coordinate, legIndex, stepId, activityId, activityOffsetSeconds, distanceMetres, elapsedSeconds, timeMarginSeconds, oxygenMarginGrams, state: stateOf(timeMarginSeconds, oxygenMarginGrams, oxygenEnabled) };
  };
  const initial = point(stops[0]!, 0, null);
  let unknownSeen = oxygenEnabled && !oxygenKnown;
  const append = (from: ReturnPoint, to: ReturnPoint) => {
    const interpolate = (t: number): ReturnPoint => {
      const timeMarginSeconds = mix(from.timeMarginSeconds, to.timeMarginSeconds, t);
      const oxygenMarginGrams = from.oxygenMarginGrams !== null && to.oxygenMarginGrams !== null ? mix(from.oxygenMarginGrams, to.oxygenMarginGrams, t) : null;
      return { ...to, coordinate: { longitude: mix(from.coordinate.longitude, to.coordinate.longitude, t), latitude: mix(from.coordinate.latitude, to.coordinate.latitude, t) },
        distanceMetres: mix(from.distanceMetres, to.distanceMetres, t), elapsedSeconds: mix(from.elapsedSeconds, to.elapsedSeconds, t),
        activityOffsetSeconds: mix(from.activityOffsetSeconds, to.activityOffsetSeconds, t), timeMarginSeconds, oxygenMarginGrams,
        state: stateOf(timeMarginSeconds, oxygenMarginGrams, oxygenEnabled) };
    };
    const roots = thresholdFractions([from.timeMarginSeconds, ...(oxygenEnabled ? [from.oxygenMarginGrams] : [])], [to.timeMarginSeconds, ...(oxygenEnabled ? [to.oxygenMarginGrams] : [])]);
    for (const t of roots) {
      const at = interpolate(t);
      const constraints: ('time' | 'oxygen')[] = [];
      if (Math.abs(at.timeMarginSeconds) < 1e-8) constraints.push('time');
      if (oxygenEnabled && at.oxygenMarginGrams !== null && Math.abs(at.oxygenMarginGrams) < 1e-8) constraints.push('oxygen');
      const direction = constraints.some(constraint => constraint === 'time' ? to.timeMarginSeconds < from.timeMarginSeconds : to.oxygenMarginGrams! < from.oxygenMarginGrams!) ? 'entry' : 'exit';
      const previous = crossings.at(-1);
      if (!previous || previous.elapsedSeconds !== at.elapsedSeconds || previous.direction !== direction) crossings.push({ ...at, timeMarginSeconds: constraints.includes('time') ? 0 : at.timeMarginSeconds, oxygenMarginGrams: constraints.includes('oxygen') ? 0 : at.oxygenMarginGrams, state: 'reserve-reached', id: String(crossings.length), constraints, direction, bracketMetres: to.distanceMetres - from.distanceMetres, firstCertain: !unknownSeen && (!oxygenEnabled || at.oxygenMarginGrams !== null) });
    }
    const cuts = [0, ...roots.filter(t => t > 0 && t < 1), 1];
    for (let i = 1; i < cuts.length; i++) portions.push({ from: interpolate(cuts[i - 1]!), to: interpolate(cuts[i]!), state: interpolate((cuts[i - 1]! + cuts[i]!) / 2).state });
    if (oxygenEnabled && to.oxygenMarginGrams === null) unknownSeen = true;
  };
  for (let legIndex = 0; legIndex < stops.length - 1; legIndex++) {
    const vertices = [stops[legIndex]!, ...(mission.routeLegs?.[legIndex] ?? []), stops[legIndex + 1]!];
    const step = mission.steps[legIndex];
    for (let vertex = 1; vertex < vertices.length; vertex++) {
      const fromCoordinate = vertices[vertex - 1]!, toCoordinate = vertices[vertex]!;
      const length = groundDistanceMetres(fromCoordinate, toCoordinate);
      const sampleTerrain = oxygenEnabled && !!oxygen && !flatTerrain && terrainValid;
      const count = sampleTerrain ? Math.ceil(length / terrain!.spacingMetres) + 1 : 2;
      samples += count;
      if (samples > 50000) return { status: 'too-large' };
      const profile = sampleTerrain ? sampleProfile([fromCoordinate, toCoordinate], terrain!.sample, terrain!.spacingMetres)
        : [{ coordinate: fromCoordinate, distanceMetres: 0, elevationMetres: null, status: 'no-data' as const }, { coordinate: toCoordinate, distanceMetres: length, elevationMetres: null, status: 'no-data' as const }];
      for (let i = 1; i < profile.length; i++) {
        const a = profile[i - 1]!, b = profile[i]!;
        const run = b.distanceMetres - a.distanceMetres;
        const from = point(a.coordinate, legIndex, step?.id ?? null);
        const seconds = run / parameters.speedMetresPerSecond;
        elapsedSeconds += seconds; distanceMetres += run;
        if (oxygenEnabled && run > 0 && oxygen) {
          const measured = a.status === 'measured' && b.status === 'measured' && a.elevationMetres !== null && b.elevationMetres !== null && Number.isFinite(a.elevationMetres) && Number.isFinite(b.elevationMetres);
          if (!flatTerrain && !measured) oxygenKnown = false;
          if (oxygenKnown) {
            const slope = flatTerrain ? 0 : Math.atan((b.elevationMetres! - a.elevationMetres!) / run) * 180 / Math.PI;
            consumed += oxygenFlow(oxygen, parameters.speedMetresPerSecond, slope) * seconds / 60;
            reverseConsumed += oxygenFlow(oxygen, parameters.speedMetresPerSecond, -slope) * seconds / 60;
          }
        }
        append(from, point(b.coordinate, legIndex, step?.id ?? null));
      }
    }
    for (const activity of step?.activities ?? []) {
      const from = point(step!.position, legIndex, step!.id, activity.id);
      const seconds = activity.durationMinutes * 60;
      elapsedSeconds += seconds;
      if (oxygenEnabled && oxygen) consumed += oxygen.activityGramsPerMinute * activity.durationMinutes;
      append(from, point(step!.position, legIndex, step!.id, activity.id, seconds));
    }
  }
  if (![elapsedSeconds, distanceMetres, consumed, reverseConsumed, ...portions.flatMap(p => [p.to.timeMarginSeconds, p.to.oxygenMarginGrams ?? 0])].every(Number.isFinite)) return { status: 'invalid-inputs' };
  return { status: 'ready', initial, portions, crossings, indeterminate: unknownSeen, oxygenEnabled, spacingMetres: oxygenEnabled && !flatTerrain && terrainValid ? terrain!.spacingMetres : null, flatTerrain };
}
