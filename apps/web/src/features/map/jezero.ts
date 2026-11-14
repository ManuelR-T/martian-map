import type { DatasetDescriptor, Extent } from '@marps/data';
export function marsHorizontalResolution(degrees: number, latitude: number, radius: number): number {
  return degrees * Math.PI / 180 * radius * Math.cos(latitude * Math.PI / 180);
}
export function containsPosition(extent: Extent, longitude: number, latitude: number): boolean {
  return longitude >= extent.west && longitude <= extent.east && latitude >= extent.south && latitude <= extent.north;
}
export function resolveJezeroTile(dataset: DatasetDescriptor, [z, x, y]: readonly number[]): { kind: 'prepared' | 'remote'; url: string } | undefined {
  if (z === undefined || x === undefined || y === undefined || ![z, x, y].every(Number.isInteger)) return;
  const matrix = dataset.wmts?.matrices.find(item => Number(item.id) === z);
  if (!matrix || x < 0 || y < 0 || x >= matrix.width || y >= matrix.height) return;
  const span = 360 / matrix.width;
  const west = -180 + x * span;
  const north = 90 - y * span;
  const bounds = dataset.wmts!.extent;
  if (west >= bounds.east || west + span <= bounds.west || north <= bounds.south || north - span >= bounds.north) return;
  const prepared = dataset.tileset?.ranges.some(range => range.z === z && x >= range.colMin && x <= range.colMax && y >= range.rowMin && y <= range.rowMax);
  const template = prepared ? `${import.meta.env.BASE_URL}data/${dataset.tileset!.urlTemplate}` : dataset.source.tileUrlTemplate;
  if (!template) return;
  return { kind: prepared ? 'prepared' : 'remote', url: template.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y)) };
}
