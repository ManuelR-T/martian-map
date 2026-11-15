import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import { expect, it, vi } from 'vitest';
import type { DataManifest, DatasetDescriptor } from '@marps/data';
import { PlannerProvider } from '../../state/PlannerProvider';
import { JezeroMap } from './JezeroMap';
import { findThemisNightDataset } from './themisNight';

// This test checks the sector controls; portal placement has its own DOM test.
vi.mock('./MapPanelDock', () => ({ MapPanelDock: ({ children }: { children: ReactNode }) => children }));

const manifest = JSON.parse(readFileSync('apps/web/public/data/manifest.json', 'utf8')) as DataManifest;
const hirise = manifest.datasets.find(item => item.kind === 'imagery')!;
const sector = manifest.regions.find(region => region.id === 'jezero')!.extent;
const render = (themisDataset: DatasetDescriptor | undefined) => renderToStaticMarkup(
  <PlannerProvider><JezeroMap panelHost={null} datasets={manifest.datasets} roverEnabled={false} onRoverToggle={() => {}} dataset={hirise} sector={sector} radius={manifest.planet.radiusMeters} sites={manifest.sites}
    selected={null} onSelect={() => {}} themisDataset={themisDataset} /></PlannerProvider>);

it('offers the night infrared switch in the layer list of the Jezero panel, next to the rover history, off at first', () => {
  expect(render(findThemisNightDataset(manifest, 'jezero'))).toMatch(/aria-label="Calques à afficher".*<button[^>]*role="switch"[^>]*aria-checked="false"[^>]*>.*Infrarouge de nuit.*<button[^>]*role="switch"[^>]*aria-checked="false"[^>]*>.*Historique de Perseverance/);
});

it('shows no night infrared switch when the manifest declares no extract', () => {
  expect(render(undefined)).not.toContain('Infrarouge de nuit');
});
