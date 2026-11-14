import type { MarsCoordinate } from '@marps/mission-core';

export interface RegionDefinition {
  readonly id: string;
  readonly name: string;
  readonly center: MarsCoordinate;
}

export interface DatasetDescriptor {
  readonly id: string;
  readonly regionId: string;
  readonly title: string;
  readonly sourceUrl: string;
  readonly localPath: string;
  readonly attribution: string;
}

/** Navigation metadata only; no scientific dataset has been integrated yet. */
export const regions = [
  { id: 'jezero', name: 'Jezero', center: { longitude: 77.58, latitude: 18.44 } },
] as const satisfies readonly RegionDefinition[];

export const datasets: readonly DatasetDescriptor[] = [];

export interface Catalog {
  readonly regions: readonly RegionDefinition[];
  readonly datasets: readonly DatasetDescriptor[];
}

/**
 * Point d'entrée asynchrone du catalogue : l'interface gère déjà l'attente et
 * l'échec, que le manifeste préparé par #6 soit embarqué ou récupéré.
 */
export async function loadCatalog(): Promise<Catalog> {
  return { regions, datasets };
}
