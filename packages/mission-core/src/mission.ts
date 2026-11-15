import type { MarsCoordinate } from './index';

export interface MissionRegion {
  readonly id: string;
  readonly name: string;
  readonly center: MarsCoordinate;
}
export interface MissionGeometry {
  readonly type: 'LineString';
  readonly coordinates: readonly (readonly [number, number])[];
}
export interface MissionAssumptions {
  readonly simulation: true;
  readonly route: 'straight-segments';
  readonly terrainValidated: false;
}

export interface Camp {
  readonly id: string;
  readonly name: string;
  readonly regionId: string;
  readonly position: MarsCoordinate;
  readonly provenance: 'simulation';
  readonly note: string;
  readonly referenceUrl: string | null;
}
export const missionTypes = {
  reconnaissance: 'Reconnaissance du terrain',
  observation: 'Observation scientifique',
  photography: 'Relevé photographique',
  sampling: 'Prélèvement d’échantillons',
} as const;
export type MissionType = keyof typeof missionTypes;

export type ActivityType = 'photo' | 'observation' | 'sampling';
export interface MissionActivity {
  readonly id: string;
  readonly type: ActivityType;
  readonly durationMinutes: number;
  readonly completed: boolean;
}
export interface MissionStep {
  readonly id: string;
  readonly name: string;
  readonly position: MarsCoordinate;
  readonly siteId: string | null;
  readonly activities: readonly MissionActivity[];
}
export interface MissionParameters {
  readonly availableSeconds: number;
  readonly speedMetresPerSecond: number;
  readonly reserveSeconds: number;
}
export interface SiteProgress {
  readonly allottedMinutes: number;
  readonly doneTaskIds: readonly string[];
}
export interface Mission {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly name: string;
  /** Absent on older v1 saves. */
  readonly missionType?: MissionType;
  readonly regionId: string;
  readonly camp: Camp | null;
  readonly steps: readonly MissionStep[];
  /** Interior vertices per camp → steps → camp leg; endpoints always follow the stops. */
  readonly routeLegs?: readonly (readonly MarsCoordinate[])[];
  readonly parameters: MissionParameters;
  readonly assumptions: MissionAssumptions;
  readonly siteWork: Readonly<Record<string, SiteProgress>>;
  /** Compact source identities; absent on older v1 saves. No raster or tile content. */
  readonly dataReferences?: readonly { readonly id: string; readonly version: string; readonly sha256: string }[];
}
export function createEmptyMission(regionId: string, id = 'draft'): Mission {
  return { schemaVersion: 1, id, name: missionTypes.reconnaissance, missionType: 'reconnaissance', regionId, camp: null, steps: [],
    parameters: { availableSeconds: 14400, speedMetresPerSecond: 0.5, reserveSeconds: 1800 },
    assumptions: { simulation: true, route: 'straight-segments', terrainValidated: false }, siteWork: {} };
}
export function validPosition(p: MarsCoordinate): boolean {
  return !!p && Number.isFinite(p.longitude) && p.longitude >= -180 && p.longitude <= 180
    && Number.isFinite(p.latitude) && p.latitude >= -90 && p.latitude <= 90;
}
export function validParameters(p: MissionParameters): boolean {
  return [p.availableSeconds, p.speedMetresPerSecond, p.reserveSeconds].every(n => Number.isFinite(n) && n >= 0)
    && p.speedMetresPerSecond > 0 && p.reserveSeconds <= p.availableSeconds;
}
const nonempty = (s: string) => typeof s === 'string' && s.trim().length > 0;
export function validCamp(c: Camp): boolean {
  return !!c && nonempty(c.id) && nonempty(c.name) && nonempty(c.regionId) && validPosition(c.position)
    && c.provenance === 'simulation' && typeof c.note === 'string' && (c.referenceUrl === null || typeof c.referenceUrl === 'string');
}
const validActivity = (a: MissionActivity) => !!a && nonempty(a.id) && ['photo', 'observation', 'sampling'].includes(a.type)
  && Number.isFinite(a.durationMinutes) && a.durationMinutes >= 0 && typeof a.completed === 'boolean';
const unique = (ids: readonly string[]) => new Set(ids).size === ids.length;
/** Validates persisted input, including unknown/future versions, before restoration. */
export function isMission(value: unknown): value is Mission {
  try {
    const m = value as Mission;
    return (m.missionType === undefined || Object.hasOwn(missionTypes, m.missionType)) && m.schemaVersion === 1 && nonempty(m.id) && nonempty(m.name) && nonempty(m.regionId)
      && (m.dataReferences === undefined || (Array.isArray(m.dataReferences) && unique(m.dataReferences.map(d => d.id))
        && m.dataReferences.every(d => nonempty(d.id) && nonempty(d.version) && typeof d.sha256 === 'string' && /^[a-f0-9]{64}$/i.test(d.sha256))))
      && (m.camp === null || (validCamp(m.camp) && m.camp.regionId === m.regionId))
      && validParameters(m.parameters) && m.assumptions.simulation === true
      && m.assumptions.route === 'straight-segments' && m.assumptions.terrainValidated === false
      && Array.isArray(m.steps) && unique(m.steps.map(s => s.id)) && m.steps.every(s => nonempty(s.id)
        && nonempty(s.name) && validPosition(s.position) && (s.siteId === null || nonempty(s.siteId))
        && Array.isArray(s.activities) && unique(s.activities.map((a: MissionActivity) => a.id)) && s.activities.every(validActivity))
      && (m.routeLegs === undefined || (Array.isArray(m.routeLegs) && !!m.camp && m.steps.length > 0
        && m.routeLegs.length === m.steps.length + 1 && m.routeLegs.every(leg => Array.isArray(leg) && leg.every(validPosition))))
      && !!m.siteWork && typeof m.siteWork === 'object' && !Array.isArray(m.siteWork)
      && Object.values(m.siteWork).every(w => Number.isFinite(w.allottedMinutes) && w.allottedMinutes >= 0
        && Array.isArray(w.doneTaskIds) && w.doneTaskIds.every(nonempty));
  } catch { return false; }
}
export type MissionAction =
  | { type: 'routeLegChanged'; index: number; vertices: readonly MarsCoordinate[] }
  | { type: 'routeReset' }
  | { type: 'missionRenamed'; name: string }
  | { type: 'missionTypeChanged'; missionType: MissionType }
  | { type: 'campPlaced'; camp: Camp }
  | { type: 'campCleared' }
  | { type: 'stepAdded'; step: MissionStep }
  | { type: 'stepRemoved'; id: string }
  | { type: 'stepMoved'; id: string; to: number }
  | { type: 'activityAdded'; stepId: string; activity: MissionActivity }
  | { type: 'activityChanged'; stepId: string; activity: MissionActivity }
  | { type: 'activityRemoved'; stepId: string; id: string }
  | { type: 'parametersChanged'; parameters: MissionParameters };
/** Invalid transitions leave the previous valid model intact. No DOM or region-specific math. */
export function missionReducer(m: Mission, action: MissionAction): Mission {
  let next = m;
  switch (action.type) {
    case 'routeReset': next = { ...m, routeLegs: undefined }; break;
    case 'routeLegChanged': {
      if (!m.camp || !m.steps.length || !Number.isInteger(action.index) || action.index < 0 || action.index > m.steps.length) return m;
      const legs = m.routeLegs ? [...m.routeLegs] : Array.from({ length: m.steps.length + 1 }, () => [] as readonly MarsCoordinate[]);
      legs[action.index] = action.vertices; next = { ...m, routeLegs: legs }; break;
    }
    case 'missionTypeChanged': {
      if (!Object.hasOwn(missionTypes, action.missionType)) return m;
      const automatic = m.name === 'Nouvelle mission' || m.name === missionTypes[m.missionType ?? 'reconnaissance'];
      next = { ...m, missionType: action.missionType, name: automatic ? missionTypes[action.missionType] : m.name }; break;
    }
    case 'missionRenamed': next = { ...m, name: action.name }; break;
    case 'campCleared': next = { ...m, camp: null }; break;
    case 'campPlaced': next = { ...m, camp: action.camp }; break;
    case 'stepAdded': next = { ...m, steps: [...m.steps, action.step] }; break;
    case 'stepRemoved': next = { ...m, steps: m.steps.filter(s => s.id !== action.id) }; break;
    case 'stepMoved': {
      const index = m.steps.findIndex(s => s.id === action.id);
      if (index < 0 || !Number.isInteger(action.to) || action.to < 0 || action.to >= m.steps.length) return m;
      const steps = [...m.steps]; const [step] = steps.splice(index, 1); steps.splice(action.to, 0, step!);
      next = { ...m, steps }; break;
    }
    case 'parametersChanged': next = { ...m, parameters: action.parameters }; break;
    case 'activityAdded': case 'activityChanged': case 'activityRemoved':
      next = { ...m, steps: m.steps.map(s => s.id !== action.stepId ? s : { ...s, activities:
        action.type === 'activityAdded' ? [...s.activities, action.activity]
          : action.type === 'activityRemoved' ? s.activities.filter(a => a.id !== action.id)
            : s.activities.map(a => a.id === action.activity.id ? action.activity : a) }) }; break;
  }
  if (['campPlaced', 'campCleared', 'stepAdded', 'stepRemoved', 'stepMoved'].includes(action.type)) next = { ...next, routeLegs: undefined };
  return isMission(next) ? next : m;
}
/** A schematic closed route, never a validated navigable path. */
export function missionGeometry(m: Mission): MissionGeometry | null {
  if (!m.camp || !m.steps.length) return null;
  const stops = [m.camp.position, ...m.steps.map(s => s.position), m.camp.position];
  const points = [stops[0]!, ...stops.slice(1).flatMap((stop, index) => [...(m.routeLegs?.[index] ?? []), stop])];
  return { type: 'LineString', coordinates: points.map(p => [p.longitude, p.latitude] as const) };
}
