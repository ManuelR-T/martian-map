import type { MarsCoordinate } from './index';
import { missionGeometry, validPosition, type Mission } from './mission';

/** Equatorial Mars radius used by the Jezero map and relief grids (not the mean radius). */
export const MARS_RADIUS_METRES = 3_396_190;

export interface Distance {
  readonly metres: number;
  readonly kilometres: number;
}

const distance = (metres: number): Distance => ({ metres, kilometres: metres / 1000 });

/** Estimated horizontal great-circle distance; no elevation or terrain correction. */
export function groundDistanceMetres(
  from: MarsCoordinate,
  to: MarsCoordinate,
  radiusMetres = MARS_RADIUS_METRES,
): number {
  if (!Number.isFinite(radiusMetres) || radiusMetres <= 0) throw new RangeError('Radius must be finite and positive.');
  if (!validPosition(from) || !validPosition(to)) throw new RangeError('Invalid Mars coordinate.');
  const rad = Math.PI / 180;
  const dLat = (to.latitude - from.latitude) * rad;
  const dLon = (to.longitude - from.longitude) * rad;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(from.latitude * rad) * Math.cos(to.latitude * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * radiusMetres * Math.asin(Math.sqrt(Math.max(0, Math.min(1, a))));
}

/** Compatibility name for the direct radiation return calculation. */
export const marsDistanceMetres = groundDistanceMetres;

export interface PolylineDistances {
  /** One entry per consecutive pair of vertices, including zero-length segments. */
  readonly segments: readonly Distance[];
  readonly total: Distance;
}

/** Open polyline: closure, when required, must be present in the input. */
export function polylineDistances(route: readonly MarsCoordinate[], radiusMetres = MARS_RADIUS_METRES): PolylineDistances {
  if (!Number.isFinite(radiusMetres) || radiusMetres <= 0) throw new RangeError('Radius must be finite and positive.');
  if (!route.every(validPosition)) throw new RangeError('Invalid Mars coordinate.');
  const segments = route.slice(1).map((to, index) => distance(groundDistanceMetres(route[index]!, to, radiusMetres)));
  return { segments, total: distance(segments.reduce((sum, segment) => sum + segment.metres, 0)) };
}

export interface MissionDistances extends PolylineDistances {
  readonly exploration: Distance;
  readonly return: Distance;
}

/** Camp → ordered steps → camp. The last segment is the direct return, counted once. */
export function missionDistances(mission: Mission, radiusMetres = MARS_RADIUS_METRES): MissionDistances | null {
  const geometry = missionGeometry(mission);
  if (!geometry) return null;
  const result = polylineDistances(geometry.coordinates.map(([longitude, latitude]) => ({ longitude, latitude })), radiusMetres);
  const returnSegments = (mission.routeLegs?.at(-1)?.length ?? 0) + 1;
  return {
    ...result,
    exploration: distance(result.segments.slice(0, -returnSegments).reduce((sum, segment) => sum + segment.metres, 0)),
    return: distance(result.segments.slice(-returnSegments).reduce((sum, segment) => sum + segment.metres, 0)),
  };
}
