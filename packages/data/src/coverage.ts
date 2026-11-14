import { MANIFEST_SCHEMA_VERSION, type DataManifest, type DataStatus } from './contracts';

export const DATA_BASE_URL = '/data/';

const rank: Record<DataStatus, number> = { unavailable: 0, partial: 1, available: 2 };

/**
 * Status of a capability, limited by its weakest dataset. Anything not declared for
 * that exact region is unavailable: a basemap never enables detailed data.
 */
export function capabilityStatus(manifest: DataManifest, regionId: string, capabilityId: string): DataStatus {
  const capability = manifest.regions
    .find((region) => region.id === regionId)
    ?.capabilities.find((candidate) => candidate.id === capabilityId);
  if (!capability || capability.datasetIds.length === 0) return 'unavailable';

  let weakest = capability.status;
  for (const datasetId of capability.datasetIds) {
    const dataset = manifest.datasets.find((candidate) => candidate.id === datasetId);
    const status = dataset?.regionId === regionId ? dataset.status : 'unavailable';
    if (rank[status] < rank[weakest]) weakest = status;
  }
  return weakest;
}

/** Reads the frozen manifest served with the app; rejects a format this code does not know. */
export async function loadManifest(baseUrl = DATA_BASE_URL, fetcher: typeof fetch = fetch): Promise<DataManifest> {
  const response = await fetcher(`${baseUrl}manifest.json`);
  if (!response.ok) throw new Error(`Data manifest unavailable (HTTP ${response.status}).`);
  const manifest = (await response.json()) as DataManifest;
  if (manifest.schemaVersion !== MANIFEST_SCHEMA_VERSION) {
    throw new Error(`Unsupported data manifest version ${String(manifest.schemaVersion)}.`);
  }
  return manifest;
}
