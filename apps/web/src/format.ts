import type { MarsCoordinate } from '@marps/mission-core';

const degrees = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Coordonnées planétocentriques lisibles : « 18,44° N, 77,58° E ». Mise en forme seule. */
export function formatCoordinate({ latitude, longitude }: MarsCoordinate): string {
  const northSouth = latitude >= 0 ? 'N' : 'S';
  const eastWest = longitude >= 0 ? 'E' : 'O';
  return `${degrees.format(Math.abs(latitude))}° ${northSouth}, ${degrees.format(Math.abs(longitude))}° ${eastWest}`;
}
