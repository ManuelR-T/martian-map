import { capabilityStatus, DATA_BASE_URL } from './coverage';
import type { DataManifest, DatasetDescriptor, GeologicMap } from './contracts';

/** One published unit, clipped to the region: lon/lat rings, exterior first. */
export interface GeologicUnitShape {
  readonly symbol: string;
  readonly polygons: readonly (readonly (readonly [number, number])[])[][];
}

export type GeologyDataset = DatasetDescriptor & { readonly geology: GeologicMap };

/** The frozen geologic map of a region, only when the manifest declares it usable there. */
export function findGeologyDataset(manifest: Pick<DataManifest, 'regions' | 'datasets'>, regionId: string): GeologyDataset | undefined {
  if (capabilityStatus(manifest, regionId, 'geology') === 'unavailable') return undefined;
  const ids = manifest.regions.find(region => region.id === regionId)?.capabilities.find(capability => capability.id === 'geology')?.datasetIds ?? [];
  return manifest.datasets.find((dataset): dataset is GeologyDataset => ids.includes(dataset.id)
    && dataset.kind === 'geology' && dataset.delivery === 'local' && dataset.geology !== undefined && dataset.files.length === 1);
}

const isPosition = (value: unknown): value is [number, number] =>
  Array.isArray(value) && value.length === 2 && value.every(Number.isFinite)
  && Math.abs(value[0] as number) <= 180 && Math.abs(value[1] as number) <= 90;

/** Reads the frozen units; anything not drawn from the legend is rejected rather than shown unlabelled. */
export async function loadGeologyUnits(dataset: GeologyDataset, signal?: AbortSignal, fetcher: typeof fetch = fetch): Promise<GeologicUnitShape[]> {
  const path = dataset.files[0]!.path;
  if (!path.startsWith('jezero/geology/') || path.includes('..')) throw new Error('Invalid geology file');
  const response = await fetcher(`${DATA_BASE_URL}${path}`, { signal });
  if (!response.ok) throw new Error('Geology load failed');
  const data = await response.json();
  if (data?.type !== 'FeatureCollection' || !Array.isArray(data.features)) throw new Error('Invalid geology collection');
  const legend = new Set(dataset.geology.units.map(unit => unit.symbol));
  return data.features.map((feature: { properties?: { symbol?: unknown }; geometry?: { type?: unknown; coordinates?: unknown } }) => {
    const symbol = feature.properties?.symbol;
    if (typeof symbol !== 'string' || !legend.has(symbol)) throw new Error('Geologic unit missing from the legend');
    const coordinates = feature.geometry?.coordinates;
    if (feature.geometry?.type !== 'MultiPolygon' || !Array.isArray(coordinates) || coordinates.length === 0
      || !coordinates.every(polygon => Array.isArray(polygon) && polygon.length > 0
        && polygon.every(ring => Array.isArray(ring) && ring.length >= 4 && ring.every(isPosition)))) {
      throw new Error('Invalid geologic unit geometry');
    }
    return { symbol, polygons: coordinates };
  });
}
