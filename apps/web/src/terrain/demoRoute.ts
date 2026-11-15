import type { SiteDescriptor } from '@marps/data';
import type { MarsCoordinate } from '@marps/mission-core';

export interface RouteStop {
  readonly label: string;
  readonly coordinate: MarsCoordinate;
}

/**
 * Parcours de démonstration tant que le tracé (#12) n'existe pas : les sites dans
 * l'ordre du manifeste, en ligne droite, puis retour au premier. Ce n'est pas un
 * chemin praticable calculé.
 */
export function demoRoute(sites: readonly SiteDescriptor[]): RouteStop[] {
  const first = sites[0];
  if (!first || sites.length < 2) return [];
  return [
    ...sites.map((site) => ({ label: site.name, coordinate: site.coordinate })),
    { label: 'Retour', coordinate: first.coordinate },
  ];
}
