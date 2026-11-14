import { DATA_BASE_URL } from './coverage';
import type { DatasetDescriptor } from './contracts';
export interface RoverFeature {
  readonly type: 'Feature';
  readonly properties: { readonly sol: number; readonly RMC?: string; readonly fromRMC?: string; readonly toRMC?: string };
  readonly geometry: { readonly type: 'Point' | 'LineString'; readonly coordinates: number[] | number[][] };
}
export interface RoverHistory {
  readonly features: readonly RoverFeature[];
  readonly retrievedAt: string;
  readonly issues: number;
  readonly qualityNotes?: readonly string[];
}
const snapshots = new Map<string, RoverHistory>();
export async function loadRoverHistory(datasets: readonly DatasetDescriptor[], signal?: AbortSignal): Promise<RoverHistory> {
  const selected = ['rover-waypoints', 'rover-traverse'].map(kind => datasets.find(d => d.kind === kind && d.regionId === 'jezero' && d.delivery === 'local' && d.status !== 'unavailable'));
  if (selected.some(d => !d)) throw new Error('Rover history unavailable');
  const cacheKey = selected.every(d => d?.source.fingerprint?.sha256) ? JSON.stringify(selected.map(d => [d!.source.fingerprint.sha256, d!.files])) : null;
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  if (cacheKey && snapshots.has(cacheKey)) return snapshots.get(cacheKey)!;
  const features: RoverFeature[] = [];
  let issues = 0;
  const qualityNotes: string[] = [];
  for (const dataset of selected) {
    for (const file of dataset!.files) {
      if (!file.path.startsWith('jezero/rover/') || file.path.includes('..')) throw new Error('Invalid rover file');
      const response = await fetch(`${DATA_BASE_URL}${file.path}`, { signal });
      if (!response.ok) throw new Error('Rover history load failed');
      const data = await response.json();
      if (file.path.endsWith('quality.json')) {
        if (!Array.isArray(data.discrepancies) || !Array.isArray(data.missingReferences)) throw new Error('Invalid rover quality');
        if (![...data.discrepancies, ...data.missingReferences].every(value => typeof value === 'string')) throw new Error('Invalid rover quality');
        qualityNotes.push(...data.discrepancies, ...data.missingReferences);
        issues = data.discrepancies.length + data.missingReferences.length;
        continue;
      }
      if (data.type !== 'FeatureCollection' || !Array.isArray(data.features) || !data.features.length) throw new Error('Invalid rover history');
      for (const feature of data.features) {
        const expected = dataset!.kind === 'rover-waypoints' ? 'Point' : 'LineString';
        if (feature.type !== 'Feature' || feature.geometry?.type !== expected || !Number.isInteger(feature.properties?.sol) || feature.properties.sol < 0) throw new Error('Invalid rover feature');
        if (expected === 'Point' ? typeof feature.properties.RMC !== 'string' : typeof feature.properties.fromRMC !== 'string' || typeof feature.properties.toRMC !== 'string') throw new Error('Invalid rover identifier');
        const coordinates = expected === 'Point' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
        if (!Array.isArray(coordinates) || coordinates.length < (expected === 'Point' ? 1 : 2) || coordinates.some((point: number[]) => !Array.isArray(point) || point.length < 2 || !point.every(Number.isFinite) || Math.abs(point[0]!) > 180 || Math.abs(point[1]!) > 90)) throw new Error('Invalid rover coordinates');
        features.push(feature);
      }
    }
  }
  const history = { features, issues, qualityNotes, retrievedAt: selected[0]!.source.retrievedAt };
  if (cacheKey && !signal?.aborted) { snapshots.clear(); snapshots.set(cacheKey, history); }
  return history;
}
