import type { MarsCoordinate } from '@marps/mission-core';
import type { DataManifest, DataStatus, DatasetDescriptor, RasterGrid } from './contracts';
import { DATA_BASE_URL } from './coverage';

/** Values of a frozen grid, with the descriptor that says what they measure and where. */
export interface TerrainGrid {
  readonly dataset: DatasetDescriptor;
  readonly raster: RasterGrid;
  readonly values: Float32Array;
}

export interface GridCell {
  readonly row: number;
  readonly column: number;
}

const usable: Record<DataStatus, number> = { unavailable: 0, partial: 1, available: 2 };

/**
 * Grid to use for a region: a complete grid is preferred to one with holes, then the
 * finest cell wins. This is how the CTX 20 m grid takes over when HiRISE is unusable.
 * Null when the region has no usable grid of that kind: a global basemap never qualifies.
 */
export function terrainDataset(
  manifest: DataManifest,
  regionId: string,
  kind: 'elevation' | 'slope',
): DatasetDescriptor | null {
  const candidates = manifest.datasets.filter(
    (dataset) => dataset.regionId === regionId && dataset.kind === kind && dataset.raster && dataset.status !== 'unavailable',
  );
  candidates.sort(
    (a, b) => usable[b.status] - usable[a.status] || a.raster!.pixelSizeMetres - b.raster!.pixelSizeMetres,
  );
  return candidates[0] ?? null;
}

/** Cell containing the coordinate, or null outside the grid. */
export function cellAt(raster: RasterGrid, coordinate: MarsCoordinate): GridCell | null {
  const { radiusMetres } = raster.projection;
  const x = radiusMetres * (coordinate.longitude * Math.PI) / 180;
  const y = radiusMetres * (coordinate.latitude * Math.PI) / 180;
  const column = Math.floor((x - raster.origin.x) / raster.pixelSizeMetres);
  const row = Math.floor((raster.origin.y - y) / raster.pixelSizeMetres);
  return row >= 0 && row < raster.height && column >= 0 && column < raster.width ? { row, column } : null;
}

/**
 * Value of the cell containing the coordinate, without interpolation. Null outside the
 * grid or on NoData: an unknown elevation or slope is never reported as 0.
 */
export function sampleGrid(grid: TerrainGrid, coordinate: MarsCoordinate): number | null {
  const cell = cellAt(grid.raster, coordinate);
  if (!cell) return null;
  const value = grid.values[cell.row * grid.raster.width + cell.column]!;
  return Number.isNaN(value) ? null : value;
}

/** Reads the bytes of a frozen grid; rejects a layout this code cannot place on Mars. */
export function decodeGrid(dataset: DatasetDescriptor, buffer: ArrayBuffer): TerrainGrid {
  const { raster } = dataset;
  if (!raster) throw new Error(`Dataset ${dataset.id} is not a grid.`);
  const { name, centralMeridian, standardParallel } = raster.projection;
  if (name !== 'equirectangular' || centralMeridian !== 0 || standardParallel !== 0) {
    throw new Error(`Dataset ${dataset.id} uses an unsupported projection.`);
  }
  const cellCount = raster.width * raster.height;
  if (buffer.byteLength !== cellCount * Float32Array.BYTES_PER_ELEMENT) {
    throw new Error(`Dataset ${dataset.id}: ${buffer.byteLength} bytes do not hold ${raster.width} x ${raster.height} cells.`);
  }
  const view = new DataView(buffer);
  const values = new Float32Array(cellCount);
  for (let index = 0; index < cellCount; index += 1) {
    values[index] = view.getFloat32(index * Float32Array.BYTES_PER_ELEMENT, true);
  }
  return { dataset, raster, values };
}

/** Loads a frozen elevation or slope grid served with the app. */
export async function loadGrid(
  dataset: DatasetDescriptor,
  baseUrl = DATA_BASE_URL,
  fetcher: typeof fetch = fetch,
): Promise<TerrainGrid> {
  const file = dataset.files[0];
  if (!file) throw new Error(`Dataset ${dataset.id} has no frozen file.`);
  const response = await fetcher(`${baseUrl}${file.path}`);
  if (!response.ok) throw new Error(`Grid ${dataset.id} unavailable (HTTP ${response.status}).`);
  return decodeGrid(dataset, await response.arrayBuffer());
}
