import type { DatasetDescriptor, DatasetKind } from './contracts';

export type ScientificStatus = 'measured' | 'calculated' | 'simulated' | 'interpreted' | 'unknown';

const statuses: Record<DatasetKind, ScientificStatus> = {
  imagery: 'measured',
  'terrain-annotations': 'interpreted',
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
  // Units and contacts are the authors' reading of orbital images, not a measurement.
  geology: 'interpreted',
};

/** Scientific origin and availability are separate: a partial observation stays measured. */
export function datasetScientificStatus(dataset: DatasetDescriptor): ScientificStatus {
  return dataset.status === 'unavailable' ? 'unknown' : statuses[dataset.kind];
}
