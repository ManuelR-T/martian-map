import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import EsriJSON from 'ol/format/EsriJSON';
import { marsProjection } from './marsWmts';
import atlas from '../../../public/atlas/manifest.json';

const root = 'apps/web/public/atlas/';
describe('frozen worldwide atlas', () => {
  it('preserves all declared file fingerprints and sizes offline', () => {
    for (const file of atlas.files) {
      const bytes = readFileSync(root + file.path);
      expect(bytes.byteLength, file.path).toBe(file.bytes);
      expect(createHash('sha256').update(bytes).digest('hex'), file.path).toBe(file.sha256);
    }
  });
  it('reads native Mars geology without an Earth reprojection and retains units', () => {
    const data = JSON.parse(readFileSync(root + 'geology.json', 'utf8'));
    expect(data.spatialReference.wkid).toBe(104971);
    const features = new EsriJSON().readFeatures(data, { dataProjection: marsProjection, featureProjection: marsProjection });
    expect(features).toHaveLength(1311);
    const colors = JSON.parse(readFileSync(root + 'geology-colors.json', 'utf8'));
    for (const feature of features) {
      const extent = feature.getGeometry()!.getExtent();
      expect(extent[0]).toBeGreaterThanOrEqual(-180);
      expect(extent[2]).toBeLessThanOrEqual(180);
      expect(extent[1]).toBeGreaterThanOrEqual(-90);
      expect(extent[3]).toBeLessThanOrEqual(90);
      expect(feature.get('UnitDesc')).toBeTruthy();
      expect(colors[feature.get('Unit')]).toHaveLength(4);
    }
    expect(features.some(feature => feature.getGeometry()!.intersectsCoordinate([77.58, 18.44]))).toBe(true);
  });
  it('keeps the actual HRSC sampling distinct from its source and excludes TES poles', () => {
    expect(atlas.hrsc.displayMetresPerPixel).toBeCloseTo(16671.875);
    expect(atlas.hrsc.sourceMetresPerPixel).toBe(2000);
    expect(atlas.hrsc.extent[0]).toBeCloseTo(-180, 0);
    expect(atlas.tes.extent).toEqual([-180, -60, 180, 60]);
    expect(atlas.tes.height / atlas.tes.pixelsPerDegree).toBe(120);
  });
});
