import type { DatasetDescriptor, DatasetKind } from './contracts';

export type ScientificStatus = 'measured' | 'calculated' | 'simulated' | 'unknown';

const statuses: Record<DatasetKind, ScientificStatus> = {
  imagery: 'measured',
  'rover-waypoints': 'measured',
  'rover-traverse': 'calculated',
  thermal: 'measured',
  weather: 'measured',
  sites: 'measured',
  basemap: 'calculated',
  elevation: 'calculated',
  slope: 'calculated',
  // The manifest's hillshades use fictitious lighting, not an observed illumination.
  hillshade: 'simulated',
};

/** Scientific origin and availability are separate: a partial observation stays measured. */
export function datasetScientificStatus(dataset: DatasetDescriptor): ScientificStatus {
  return dataset.status === 'unavailable' ? 'unknown' : statuses[dataset.kind];
}
