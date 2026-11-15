import type { DataManifest, DatasetDescriptor } from './contracts';
import { capabilityStatus, DATA_BASE_URL } from './coverage';

type Position = readonly [number, number];
export interface TerrainAnnotation {
  readonly type: 'Feature';
  readonly id: string;
  readonly geometry: { readonly type: 'Point'; readonly coordinates: Position } | { readonly type: 'Polygon'; readonly coordinates: readonly (readonly Position[])[] };
  readonly properties: {
    readonly regionId: string;
    readonly category: 'dune' | 'block-field' | 'scarp';
    readonly title: string;
    readonly observation: string;
    readonly inspectionReason: string;
    readonly limitations: readonly string[];
    readonly confidence: { readonly level: 'low' | 'medium' | 'high'; readonly reason: string };
    readonly imageryDatasetId: string;
    readonly imageryVersion: string;
    readonly imagerySourceSha256: string;
    readonly evidenceFiles: readonly string[];
    readonly evidenceSha256: Readonly<Record<string, string>>;
    readonly curatedBy: string;
    readonly curatedAt: string;
    readonly registration: { readonly checkedAt: string; readonly method: string; readonly note: string; readonly positionalUncertaintyMetres: number | null };
  };
}
export interface TerrainAnnotationCollection { readonly type: 'FeatureCollection'; readonly features: readonly TerrainAnnotation[] }
type Manifest = Pick<DataManifest, 'regions' | 'datasets'>;
const fail = (): never => { throw new Error('Invalid terrain annotations'); };
const object = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : fail();
const text = (value: unknown) => typeof value === 'string' && value.trim().length > 0;
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.length > 0 && value.every(text);
const localPath = (value: string) => /^jezero\/hirise\/\d+\/\d+\/\d+\.png$/.test(value);
export function findTerrainAnnotationDataset(manifest: Manifest, regionId: string): DatasetDescriptor | undefined {
  if (regionId !== 'jezero' || capabilityStatus(manifest, regionId, 'terrain-annotations') === 'unavailable') return undefined;
  const ids = manifest.regions.find(region => region.id === regionId)?.capabilities.find(capability => capability.id === 'terrain-annotations')?.datasetIds ?? [];
  return manifest.datasets.find(dataset => ids.includes(dataset.id) && dataset.regionId === regionId && dataset.kind === 'terrain-annotations' && dataset.delivery === 'local' && dataset.status !== 'unavailable');
}
export function validateTerrainAnnotations(value: unknown, manifest: Manifest): TerrainAnnotationCollection {
  const collection = object(value);
  if (collection.type !== 'FeatureCollection' || !Array.isArray(collection.features)) fail();
  const sector = manifest.regions.find(region => region.id === 'jezero')?.extent;
  if (!sector) return fail();
  const ids = new Set<string>();
  for (const raw of collection.features as unknown[]) {
    const feature = object(raw), properties = object(feature.properties), geometry = object(feature.geometry);
    if (feature.type !== 'Feature' || !text(feature.id) || ids.has(feature.id as string)) fail();
    ids.add(feature.id as string);
    for (const key of ['title', 'observation', 'inspectionReason', 'imageryDatasetId', 'imageryVersion', 'imagerySourceSha256', 'curatedBy', 'curatedAt']) if (!text(properties[key])) fail();
    if (properties.regionId !== 'jezero' || !['dune', 'block-field', 'scarp'].includes(String(properties.category)) || !strings(properties.limitations)) fail();
    const confidence = object(properties.confidence), registration = object(properties.registration);
    if (!['low', 'medium', 'high'].includes(String(confidence.level)) || !text(confidence.reason)) fail();
    for (const key of ['checkedAt', 'method', 'note']) if (!text(registration[key])) fail();
    const uncertainty = registration.positionalUncertaintyMetres;
    if (uncertainty !== null && (typeof uncertainty !== 'number' || !Number.isFinite(uncertainty) || uncertainty <= 0)) fail();
    const imagery = manifest.datasets.find(dataset => dataset.id === properties.imageryDatasetId && dataset.kind === 'imagery' && dataset.regionId === 'jezero' && dataset.delivery === 'local' && dataset.status !== 'unavailable');
    if (!imagery || imagery.version !== properties.imageryVersion || imagery.source.fingerprint.sha256 !== properties.imagerySourceSha256) fail();
    const evidence = properties.evidenceFiles;
    const evidenceHashes = object(properties.evidenceSha256);
    if (!strings(evidence) || evidence.some(path => !localPath(path) || !imagery!.files.some(file => file.path === path && file.sha256 === evidenceHashes[path]))) fail();
    const position = (value: unknown): Position => {
      if (!Array.isArray(value) || value.length !== 2 || !value.every(Number.isFinite)) return fail();
      const [longitude, latitude] = value as [number, number];
      if (longitude < sector.west || longitude > sector.east || latitude < sector.south || latitude > sector.north) fail();
      return [longitude, latitude];
    };
    if (geometry.type === 'Point') position(geometry.coordinates);
    else if (geometry.type === 'Polygon') {
      if (!Array.isArray(geometry.coordinates) || geometry.coordinates.length !== 1 || !Array.isArray(geometry.coordinates[0])) fail();
      const ring = (geometry.coordinates as unknown[][])[0]!.map(position);
      if (ring.length < 4 || JSON.stringify(ring[0]) !== JSON.stringify(ring.at(-1))) fail();
      let area = 0;
      for (let index = 0; index < ring.length - 1; index++) {
        const start = ring[index]!, end = ring[index + 1]!;
        area += (start[0] - ring[0]![0]) * (end[1] - ring[0]![1]) - (end[0] - ring[0]![0]) * (start[1] - ring[0]![1]);
        const cross = (a: Position, b: Position, c: Position) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
        for (let other = index + 2; other < ring.length - 1; other++) {
          if (index === 0 && other === ring.length - 2) continue;
          const a = ring[other]!, b = ring[other + 1]!;
          if (cross(start, end, a) * cross(start, end, b) <= 0 && cross(a, b, start) * cross(a, b, end) <= 0
            && Math.max(Math.min(start[0], end[0]), Math.min(a[0], b[0])) <= Math.min(Math.max(start[0], end[0]), Math.max(a[0], b[0]))
            && Math.max(Math.min(start[1], end[1]), Math.min(a[1], b[1])) <= Math.min(Math.max(start[1], end[1]), Math.max(a[1], b[1]))) fail();
        }
      }
      if (Math.abs(area) < 1e-14) fail();
    } else fail();
  }
  return value as TerrainAnnotationCollection;
}
export async function loadTerrainAnnotations(manifest: Manifest, regionId: string, signal?: AbortSignal, fetcher: typeof fetch = fetch): Promise<TerrainAnnotationCollection> {
  const dataset = findTerrainAnnotationDataset(manifest, regionId);
  if (!dataset || dataset.files.length !== 1 || dataset.files[0]?.path !== 'jezero/annotations/terrain.geojson') throw new Error('Terrain annotations unavailable');
  signal?.throwIfAborted();
  const response = await fetcher(`${DATA_BASE_URL}${dataset.files[0].path}`, { signal });
  if (!response.ok) throw new Error('Terrain annotations load failed');
  const result = validateTerrainAnnotations(await response.json(), manifest);
  signal?.throwIfAborted();
  return result;
}
