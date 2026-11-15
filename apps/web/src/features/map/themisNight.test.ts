import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { DataManifest } from '@marps/data';
import { applyThemisNightSettings, createThemisNightLayer, findThemisNightDataset, themisNightDefaults } from './themisNight';
import { marsProjection } from './marsWmts';

const manifest = JSON.parse(readFileSync('apps/web/public/data/manifest.json', 'utf8')) as DataManifest;
const themis = findThemisNightDataset(manifest, 'jezero')!;
const hirise = manifest.datasets.find(item => item.kind === 'imagery')!;
const grid = () => createThemisNightLayer(themis).getSource()!.getTileGrid()!;
const tileAt = (longitude: number, latitude: number) =>
  grid().getTileCoordForCoordAndZ([longitude, latitude], 9) as [number, number, number];
const tileUrl = (coordinate: [number, number, number]) =>
  createThemisNightLayer(themis).getSource()!.getTileUrlFunction()(coordinate, 1, marsProjection);

/** Tile extent as NASA declares it in a frozen WMTS capabilities document. */
const declaredExtent = (capabilitiesPath: string, level: number, col: number, row: number) => {
  // Trek documents keep commented-out matrices: ignore them.
  const xml = readFileSync(capabilitiesPath, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  const matrix = [...xml.matchAll(/<TileMatrix>([\s\S]*?)<\/TileMatrix>/g)]
    .map(match => match[1]!)
    .find(body => new RegExp(`<ows:Identifier>${level}</ows:Identifier>`).test(body))!;
  const [west, north] = matrix.match(/<TopLeftCorner>([^<]+)<\/TopLeftCorner>/)![1]!.trim().split(/\s+/).map(Number);
  const span = 360 / Number(matrix.match(/<MatrixWidth>([\d.]+)<\/MatrixWidth>/)![1]);
  return [west! + col * span, north! - (row + 1) * span, west! + (col + 1) * span, north! - row * span];
};

describe('THEMIS night infrared layer', () => {
  it('is offered for Jezero only, never on the global map', () => {
    expect(themis.kind).toBe('thermal');
    expect(findThemisNightDataset(manifest, 'global')).toBeUndefined();
    const withoutThemis = { ...manifest, regions: manifest.regions.map(region => ({ ...region,
      capabilities: region.capabilities.map(capability => capability.id === 'thermal-themis'
        ? { ...capability, status: 'unavailable' as const, datasetIds: [] } : capability) })) };
    expect(findThemisNightDataset(withoutThemis, 'jezero')).toBeUndefined();
  });

  it('places each stop on the same ground as NASA THEMIS and HiRISE tiles', () => {
    for (const site of manifest.sites) {
      const [z, col, row] = tileAt(site.coordinate.longitude, site.coordinate.latitude);
      expect([z, col, row]).toEqual([9, 732, 203]);
      const drawn = grid().getTileCoordExtent([z, col, row]);
      expect(drawn).toEqual(declaredExtent('apps/web/public/data/jezero/themis/WMTSCapabilities.xml', 9, col, row));
      expect(drawn).toEqual(declaredExtent('apps/web/public/data/jezero/hirise/WMTSCapabilities.xml', 9, col, row));
    }
  });

  it('covers everything the HiRISE map can show, with frozen tiles only', () => {
    const { west, south, east, north } = hirise.wmts!.extent;
    for (const [longitude, latitude] of [[west, north], [east, north], [west, south], [east, south]]) {
      const [z, col, row] = tileAt(longitude!, latitude!);
      const url = tileUrl([z, col, row]);
      expect(url).toMatch(/^\/data\/jezero\/themis\/9\/\d+\/\d+\.png$/);
      expect(existsSync(`apps/web/public${url}`)).toBe(true);
    }
  });

  it('requests nothing outside the frozen extract, and never NASA', () => {
    expect(tileUrl([9, 732, 203])).toBe('/data/jezero/themis/9/203/732.png');
    expect(tileUrl([9, 733, 203])).toBeUndefined();
    expect(tileUrl([9, 732, 204])).toBeUndefined();
    expect(tileUrl([8, 366, 101])).toBeUndefined();
    expect(tileUrl([10, 1464, 406])).toBeUndefined();
  });

  it('starts hidden at 60 % opacity, so HiRISE stays the reference image', () => {
    const layer = createThemisNightLayer(themis);
    expect(themisNightDefaults).toEqual({ visible: false, opacity: 0.6 });
    expect(layer.getVisible()).toBe(false);
    expect(layer.getOpacity()).toBe(0.6);
  });

  it('draws what the switch and the slider say: on, 30 %, then off', () => {
    const layer = createThemisNightLayer(themis);
    applyThemisNightSettings(layer, { visible: true, opacity: 0.6 });
    expect([layer.getVisible(), layer.getOpacity()]).toEqual([true, 0.6]);
    applyThemisNightSettings(layer, { visible: true, opacity: 0.3 });
    expect([layer.getVisible(), layer.getOpacity()]).toEqual([true, 0.3]);
    applyThemisNightSettings(layer, { visible: false, opacity: 0.3 });
    expect(layer.getVisible()).toBe(false);
  });
});
