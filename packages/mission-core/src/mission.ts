import type { MarsCoordinate } from './index';

export const MISSION_SCHEMA_VERSION = 1;
/** Mars 2000 sphere used by the frozen manifest (not the volumetric mean radius). */
export const MARS_RADIUS_METRES = 3_396_190;
export type ActivityType = 'photo' | 'observation' | 'sampling';
export interface Activity {
  readonly id: string;
  readonly type: ActivityType;
  readonly durationSeconds: number;
}
export interface MissionStep {
  readonly id: string;
  readonly name: string;
  readonly position: MarsCoordinate;
  readonly siteId?: string;
  readonly activities: readonly Activity[];
}
export interface OxygenParameters {
  readonly enabled: boolean;
  readonly flatTerrain: boolean;
  readonly stockGrams: number;
  readonly reserveGrams: number;
  readonly loadKg: number;
  readonly referenceGramsPerMinute: number;
  readonly restingGramsPerMinute: number;
  readonly referenceSpeedKmh: number;
  readonly speedCoefficient: number;
  readonly uphillCoefficient: number;
  readonly downhillCoefficient: number;
  readonly loadCoefficient: number;
}
export interface MissionParameters {
  readonly availableSeconds: number;
  readonly reserveSeconds: number;
  readonly speedKmh: number;
  readonly oxygen: OxygenParameters;
}
export type MissionEvent =
  | {
      readonly id: string;
      readonly type: 'delay';
      readonly activityId: string;
      readonly seconds: number;
    }
  | {
      readonly id: string;
      readonly type: 'slowdown';
      readonly segmentIds: readonly string[];
      readonly factor: number;
    };
export interface DataReference {
  readonly id: string;
  readonly version: string;
  readonly sourceUrl: string;
}
export interface Mission {
  readonly schemaVersion: 1;
  readonly objective?: string;
  readonly id: string;
  readonly name: string;
  readonly regionId: string;
  readonly radiusMetres: number;
  readonly camp: MarsCoordinate | null;
  readonly steps: readonly MissionStep[];
  readonly parameters: MissionParameters;
  readonly events: readonly MissionEvent[];
  readonly assumptions: readonly string[];
  readonly dataReferences: readonly DataReference[];
}
export function createEmptyMission(regionId: string): Mission {
  return {
    schemaVersion: 1,
    id: 'mission',
    name: 'Sortie scientifique',
    regionId,
    radiusMetres: MARS_RADIUS_METRES,
    camp: null,
    steps: [],
    events: [],
    dataReferences: [],
    assumptions: [
      'Simulation pédagogique : aucun dimensionnement de scaphandre.',
      'Durées et vitesse simulées ; marche constante, activités successives.',
      'Budget de terrain hors préparation des combinaisons et opérations de sas.',
      'Distances horizontales sur la sphère Mars 2000 ; segments directs sans recherche de chemin.',
    ],
    parameters: {
      availableSeconds: 21600,
      reserveSeconds: 3600,
      speedKmh: 2,
      oxygen: {
        enabled: false,
        flatTerrain: false,
        stockGrams: 1000,
        reserveGrams: 200,
        loadKg: 10,
        referenceGramsPerMinute: 1.5,
        restingGramsPerMinute: 0.8,
        referenceSpeedKmh: 2,
        speedCoefficient: 0.5,
        uphillCoefficient: 5,
        downhillCoefficient: 1,
        loadCoefficient: 0.01,
      },
    },
  };
}
export function nonNegative(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0 || value > 1e9)
    throw new RangeError(`${label} : valeur finie entre 0 et 10⁹ requise.`);
}
export function validateCoordinate(p: MarsCoordinate): void {
  if (
    !p ||
    !Number.isFinite(p.latitude) ||
    Math.abs(p.latitude) > 90 ||
    !Number.isFinite(p.longitude) ||
    p.longitude < -180 ||
    p.longitude > 360
  )
    throw new RangeError(
      'Coordonnées invalides (latitude −90…90°, longitude −180…360°).',
    );
}
function nonEmpty(value: string): void {
  if (typeof value !== 'string' || !value.trim())
    throw new Error('Texte ou identifiant vide.');
}
function unique(ids: readonly string[]): void {
  ids.forEach(nonEmpty);
  if (new Set(ids).size !== ids.length)
    throw new Error('Identifiants dupliqués.');
}
export function validateOxygenParameters(o: OxygenParameters): void {
  if (typeof o.enabled !== 'boolean' || typeof o.flatTerrain !== 'boolean')
    throw new Error('Option O₂ invalide.');
  for (const key of [
    'stockGrams',
    'reserveGrams',
    'loadKg',
    'referenceGramsPerMinute',
    'restingGramsPerMinute',
    'referenceSpeedKmh',
    'speedCoefficient',
    'uphillCoefficient',
    'downhillCoefficient',
    'loadCoefficient',
  ] as const)
    nonNegative(o[key], key);
  if (o.reserveGrams > o.stockGrams || o.referenceSpeedKmh < 1e-6)
    throw new Error('Réserve O₂ ou vitesse de référence invalide.');
}
export function validateMission(m: Mission): Mission {
  if (m.schemaVersion !== 1)
    throw new Error('Version de mission incompatible.');
  [m.id, m.name, m.regionId].forEach(nonEmpty);
  if (m.objective !== undefined && typeof m.objective !== 'string')
    throw new Error('Objectif invalide.');
  nonNegative(m.radiusMetres, 'Rayon');
  if (!m.radiusMetres) throw new Error('Rayon nul.');
  if (m.camp !== null) validateCoordinate(m.camp);
  unique(m.steps.map((s) => s.id));
  unique(m.steps.flatMap((s) => s.activities.map((a) => a.id)));
  m.steps.forEach((s) => {
    nonEmpty(s.name);
    validateCoordinate(s.position);
    if (s.siteId !== undefined) nonEmpty(s.siteId);
    s.activities.forEach((a) => {
      if (!['photo', 'observation', 'sampling'].includes(a.type))
        throw new Error('Activité inconnue.');
      nonNegative(a.durationSeconds, 'Durée');
    });
  });
  const p = m.parameters;
  nonNegative(p.availableSeconds, 'Durée disponible');
  nonNegative(p.reserveSeconds, 'Réserve');
  nonNegative(p.speedKmh, 'Vitesse');
  if (p.speedKmh < 1e-6 || p.reserveSeconds > p.availableSeconds)
    throw new Error(
      'Vitesse nulle ou réserve supérieure à la durée disponible.',
    );
  validateOxygenParameters(p.oxygen);
  unique(m.events.map((e) => e.id));
  const segments = new Set(routeSegments(m).map((s) => s.id));
  m.events.forEach((e) => {
    if (e.type === 'delay') {
      nonNegative(e.seconds, 'Retard');
      if (!m.steps.some((s) => s.activities.some((a) => a.id === e.activityId)))
        throw new Error('Activité absente.');
    } else if (e.type === 'slowdown') {
      if (!Number.isFinite(e.factor) || e.factor < 1)
        throw new Error('Facteur de ralentissement inférieur à 1.');
      unique(e.segmentIds);
      if (!e.segmentIds.length || e.segmentIds.some((id) => !segments.has(id)))
        throw new Error('Segment absent.');
    } else throw new Error('Événement inconnu.');
  });
  for (const segment of segments) {
    const factor = m.events.reduce(
      (f, e) =>
        e.type === 'slowdown' && e.segmentIds.includes(segment)
          ? f * e.factor
          : f,
      1,
    );
    if (!Number.isFinite(factor) || factor > 1e9)
      throw new Error('Cumul des ralentissements hors domaine (maximum 10⁹).');
  }
  if (
    !Array.isArray(m.assumptions) ||
    m.assumptions.some((a) => typeof a !== 'string')
  )
    throw new Error('Hypothèses invalides.');
  m.dataReferences.forEach((r) => {
    nonEmpty(r.id);
    nonEmpty(r.version);
    nonEmpty(r.sourceUrl);
  });
  return m;
}
export function parseMission(json: string): Mission {
  try {
    return validateMission(JSON.parse(json) as Mission);
  } catch (error) {
    throw new Error(
      `Mission illisible : ${error instanceof Error ? error.message : 'données corrompues'}`,
      { cause: error },
    );
  }
}
export interface RouteSegment {
  readonly id: string;
  readonly from: MarsCoordinate;
  readonly to: MarsCoordinate;
  readonly returning: boolean;
}
export function routeSegments(m: Mission): RouteSegment[] {
  if (!m.camp || !m.steps.length) return [];
  const nodes = [
    { id: 'camp', position: m.camp },
    ...m.steps.map((s) => ({ id: `step:${s.id}`, position: s.position })),
    { id: 'camp', position: m.camp },
  ];
  return nodes.slice(1).map((node, i) => ({
    id: `${nodes[i]!.id}>${node.id}`,
    from: nodes[i]!.position,
    to: node.position,
    returning: i === nodes.length - 2,
  }));
}
export type MissionAction =
  | { type: 'replace'; mission: Mission }
  | { type: 'rename'; name: string }
  | { type: 'camp'; position: MarsCoordinate }
  | { type: 'parameters'; parameters: MissionParameters }
  | { type: 'addStep'; step: MissionStep }
  | { type: 'removeStep'; id: string }
  | { type: 'moveStep'; id: string; offset: -1 | 1 }
  | { type: 'activities'; stepId: string; activities: readonly Activity[] }
  | { type: 'addEvent'; event: MissionEvent }
  | { type: 'removeEvent'; id: string };
export function missionReducer(m: Mission, action: MissionAction): Mission {
  let next = m;
  switch (action.type) {
    case 'replace':
      return validateMission(action.mission);
    case 'rename':
      next = { ...m, name: action.name };
      break;
    case 'camp':
      next = { ...m, camp: action.position };
      break;
    case 'parameters':
      next = { ...m, parameters: action.parameters };
      break;
    case 'addStep':
      next = { ...m, steps: [...m.steps, action.step] };
      break;
    case 'removeStep':
      next = { ...m, steps: m.steps.filter((s) => s.id !== action.id) };
      break;
    case 'moveStep': {
      const steps = [...m.steps];
      const i = steps.findIndex((s) => s.id === action.id);
      const j = i + action.offset;
      if (i < 0 || j < 0 || j >= steps.length) return m;
      [steps[i], steps[j]] = [steps[j]!, steps[i]!];
      next = { ...m, steps };
      break;
    }
    case 'activities':
      next = {
        ...m,
        steps: m.steps.map((s) =>
          s.id === action.stepId ? { ...s, activities: action.activities } : s,
        ),
      };
      break;
    case 'addEvent':
      next = { ...m, events: [...m.events, action.event] };
      break;
    case 'removeEvent':
      next = { ...m, events: m.events.filter((e) => e.id !== action.id) };
      break;
  }
  // Remove events whose targets vanished after editing the route or activities.
  const ids = new Set(routeSegments(next).map((s) => s.id));
  const activities = new Set(
    next.steps.flatMap((s) => s.activities.map((a) => a.id)),
  );
  if (action.type !== 'addEvent')
    next = {
      ...next,
      events: next.events.filter((e) =>
        e.type === 'delay'
          ? activities.has(e.activityId)
          : e.segmentIds.every((id) => ids.has(id)),
      ),
    };
  return validateMission(next);
}
