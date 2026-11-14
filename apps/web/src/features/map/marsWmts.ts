import type { DatasetDescriptor } from '@marps/data';
import XYZ from 'ol/source/XYZ';
import TileGrid from 'ol/tilegrid/TileGrid';
import Projection from 'ol/proj/Projection';
import { addProjection } from 'ol/proj';
import WMTS from 'ol/source/WMTS';
import WMTSTileGrid from 'ol/tilegrid/WMTS';

export const marsProjection = new Projection({
  code: 'MARS:104905', units: 'degrees', extent: [-180, -90, 180, 90],
  worldExtent: [-180, -90, 180, 90], global: true,
});
addProjection(marsProjection);
export const resolutions = Array.from({ length: 8 }, (_, level) => 360 / (512 * 2 ** level));
export function createGlobalMarsSource(dataset?: DatasetDescriptor): WMTS {
  return new WMTS({
    url: dataset?.source.tileUrlTemplate?.replace('{z}', '{TileMatrix}').replace('{y}', '{TileRow}').replace('{x}', '{TileCol}') ?? 'https://trek.nasa.gov/tiles/Mars/EQ/Mars_MGS_MOLA_ClrShade_merge_global_463m/1.0.0/{Style}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.jpg',
    layer: 'Mars_MGS_MOLA_ClrShade_merge_global_463m', style: 'default',
    matrixSet: 'default028mm', format: 'image/jpeg', requestEncoding: 'REST',
    projection: marsProjection, wrapX: false, crossOrigin: 'anonymous',
    attributions: dataset?.source.credit ?? 'NASA / JPL-Caltech / GSFC — MGS MOLA, NASA Trek',
    tileGrid: new WMTSTileGrid({
      extent: [-180, -90, 180, 90], origin: [-180, 90], resolutions,
      matrixIds: resolutions.map((_, level) => String(level)), tileSize: 256,
      sizes: resolutions.map((_, level) => [2 ** (level + 1), 2 ** level]),
    }),
  });
}

export function createRegionSource(dataset: DatasetDescriptor): XYZ {
  const tiles = dataset.tileset;
  if (!tiles || dataset.delivery !== 'local') throw new Error('Local imagery tiles are unavailable.');
  const levels = tiles.ranges.map(range => range.z);
  return new XYZ({
    projection: marsProjection, wrapX: false, attributions: dataset.source.credit,
    tileGrid: new TileGrid({ origin: [-180, 90], extent: [-180, -90, 180, 90],
      resolutions: Array.from({ length: Math.max(...levels) + 1 }, (_, z) => 360 / (tiles.tileSize * 2 ** (z + 1))),
      minZoom: Math.min(...levels), tileSize: tiles.tileSize }),
    tileUrlFunction: ([z, x, y]) => {
      if (z === undefined || x === undefined || y === undefined) return undefined;
      const range = tiles.ranges.find(range => range.z === z);
      if (!range || x < range.colMin || x > range.colMax || y < range.rowMin || y > range.rowMax) return undefined;
      return `${import.meta.env.BASE_URL}data/${tiles.urlTemplate.replace('{z}', String(z)).replace('{y}', String(y)).replace('{x}', String(x))}`;
    },
  });
}
