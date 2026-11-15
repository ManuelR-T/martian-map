import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import type { DataManifest, DatasetDescriptor } from '@marps/data';
import { JezeroMap } from './JezeroMap';
import { findThemisNightDataset } from './themisNight';

const manifest = JSON.parse(readFileSync('apps/web/public/data/manifest.json', 'utf8')) as DataManifest;
const hirise = manifest.datasets.find(item => item.kind === 'imagery')!;
const sector = manifest.regions.find(region => region.id === 'jezero')!.extent;
const render = (themisDataset: DatasetDescriptor | undefined) => renderToStaticMarkup(
  <JezeroMap datasets={manifest.datasets} roverEnabled={false} onRoverToggle={() => {}} dataset={hirise} sector={sector} radius={manifest.planet.radiusMeters} sites={manifest.sites}
    selected={null} onSelect={() => {}} themisDataset={themisDataset} />);

it('offers the night infrared switch in the Couches section of the Jezero panel, next to the rover history, off at first', () => {
  expect(render(findThemisNightDataset(manifest, 'jezero'))).toMatch(/aria-label="Couches".*<button[^>]*role="switch"[^>]*aria-checked="false"[^>]*>.*Infrarouge de nuit.*Historique de Perseverance/);
});

it('shows no night infrared switch when the manifest declares no extract', () => {
  expect(render(undefined)).not.toContain('Infrarouge de nuit');
});
