import type { MissionRegion } from '@marps/mission-core';
import { loadManifest } from './coverage';
import type { DataManifest, DatasetDescriptor, RegionCoverage, SiteDescriptor } from './contracts';

export type RegionDefinition = MissionRegion;

/**
 * Navigation entries for the detailed regions the manifest declares, centred on their extent.
 * What each region offers comes from its capabilities, never from this list.
 */
export function detailedRegions(coverage: readonly RegionCoverage[]): RegionDefinition[] {
  return coverage.filter(region => region.kind === 'detailed').map(({ id, name, extent }) => ({
    id, name, center: { longitude: (extent.west + extent.east) / 2, latitude: (extent.south + extent.north) / 2 },
  }));
}

export interface Catalog {
  readonly planet?: DataManifest['planet'];
  readonly coverage?: DataManifest['regions'];
  readonly regions: readonly RegionDefinition[];
  readonly datasets: readonly DatasetDescriptor[];
  /** Science sites of the manifest; their sheets are in `siteSheets`. */
  readonly sites: readonly SiteDescriptor[];
  readonly manifest: DataManifest;
}

/**
 * Point d'entrée asynchrone du catalogue : les jeux de données viennent du
 * manifeste figé servi avec l'application, jamais d'une liste codée en dur.
 * Une erreur de lecture remonte à l'interface, qui affiche l'état d'échec.
 */
export async function loadCatalog(): Promise<Catalog> {
  const manifest = await loadManifest();
  return { manifest, planet: manifest.planet, coverage: manifest.regions, regions: detailedRegions(manifest.regions), datasets: manifest.datasets, sites: manifest.sites };
}

export * from './contracts';
export * from './coverage';
export * from './conditions';
export * from './siteSheets';
export * from './terrain';
export * from './rover';
export * from './geology';
export * from './profileSampler';
export * from './routeFinder';

export * from './camps';

export * from './provenance';

export * from './terrainAnnotations';
