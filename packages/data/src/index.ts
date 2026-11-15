import type { MissionRegion } from '@marps/mission-core';
import { loadManifest } from './coverage';
import type { DataManifest, DatasetDescriptor, SiteDescriptor } from './contracts';

export type RegionDefinition = MissionRegion;

/** Navigation metadata only. Scientific coverage comes from the manifest, never from this list. */
export const regions = [
  { id: 'jezero', name: 'Jezero', center: { longitude: 77.58, latitude: 18.44 } },
] as const satisfies readonly RegionDefinition[];

export interface Catalog {
  readonly planet?: DataManifest['planet'];
  readonly coverage?: DataManifest['regions'];
  readonly regions: readonly RegionDefinition[];
  readonly datasets: readonly DatasetDescriptor[];
  /** Science sites of the manifest; their sheets are in `siteSheets`. */
  readonly sites: readonly SiteDescriptor[];
}

/**
 * Point d'entrée asynchrone du catalogue : les jeux de données viennent du
 * manifeste figé servi avec l'application, jamais d'une liste codée en dur.
 * Une erreur de lecture remonte à l'interface, qui affiche l'état d'échec.
 */
export async function loadCatalog(): Promise<Catalog> {
  const manifest = await loadManifest();
  return { planet: manifest.planet, coverage: manifest.regions, regions, datasets: manifest.datasets, sites: manifest.sites };
}

export * from './contracts';
export * from './coverage';
export * from './siteSheets';
export * from './terrain';
export * from './rover';
export * from './camps';
