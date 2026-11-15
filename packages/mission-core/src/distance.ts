import type { MarsCoordinate } from './index';
import { missionGeometry, validPosition, type Mission } from './mission';

/** Mars reference sphere used by the Jezero manifest and relief grids, in metres. */
export const MARS_RADIUS_METRES = 3_396_190;

export interface Distance {
  readonly metres: number;
  readonly kilometres: number;
}
export interface MissionDistances {
  readonly radiusMetres: number;
  /** Ordered camp–visits legs followed by exactly one last-visit–camp leg. */
  readonly segments: readonly Distance[];
  readonly exploration: Distance;
  readonly return: Distance;
  readonly total: Distance;
}
const distance = (metres: number): Distance => ({ metres, kilometres: metres / 1000 });
const radians = (degrees: number) => degrees * Math.PI / 180;

/** Shortest great-circle horizontal estimate, without elevation or terrain correction. */
export function groundDistanceMetres(from: MarsCoordinate, to: MarsCoordinate, radiusMetres = MARS_RADIUS_METRES): number {
  if (!Number.isFinite(radiusMetres) || radiusMetres <= 0) throw new RangeError('Radius must be finite and positive.');
  if (!validPosition(from) || !validPosition(to)) throw new RangeError('Invalid planetocentric coordinates.');
  const dLat = radians(to.latitude - from.latitude);
  const dLon = radians(to.longitude - from.longitude);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * radiusMetres * Math.asin(Math.sqrt(Math.max(0, Math.min(1, a))));
}

/** Null until a camp and at least one visit define a closed mission polyline. */
export function missionDistances(mission: Mission, radiusMetres = MARS_RADIUS_METRES): MissionDistances | null {
  const geometry = missionGeometry(mission);
  if (!geometry) return null;
  const vertices = geometry.coordinates.map(([longitude, latitude]) => ({ longitude, latitude }));
  const segments = vertices.slice(1).map((to, index) => distance(groundDistanceMetres(vertices[index]!, to, radiusMetres)));
  const exploration = distance(segments.slice(0, -1).reduce((sum, leg) => sum + leg.metres, 0));
  const home = segments.at(-1)!;
  return { radiusMetres, segments, exploration, return: home, total: distance(exploration.metres + home.metres) };
}
