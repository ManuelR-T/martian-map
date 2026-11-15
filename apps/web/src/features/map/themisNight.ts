import { capabilityStatus, type DataManifest, type DatasetDescriptor } from '@marps/data';
import TileLayer from 'ol/layer/Tile';
import type XYZ from 'ol/source/XYZ';
import { createRegionSource } from './marsWmts';

export interface ThemisNightSettings {
  readonly visible: boolean;
  /** 0 to 1. */
  readonly opacity: number;
}

/** Hidden by default: HiRISE stays the reference image, the night layer is context on demand. */
export const themisNightDefaults: ThemisNightSettings = { visible: false, opacity: 0.6 };

/** The frozen night infrared extract of a region, only when the manifest declares it usable there. */
export const findThemisNightDataset = (
  manifest: Pick<DataManifest, 'regions' | 'datasets'>,
  regionId: string,
): DatasetDescriptor | undefined => {
  if (capabilityStatus(manifest, regionId, 'thermal-themis') === 'unavailable') return undefined;
  const ids = manifest.regions.find(region => region.id === regionId)
    ?.capabilities.find(capability => capability.id === 'thermal-themis')?.datasetIds ?? [];
  return manifest.datasets.find(dataset => ids.includes(dataset.id)
    && dataset.kind === 'thermal' && dataset.delivery === 'local' && dataset.tileset);
};

/** Frozen tiles only: no request leaves the app, and nothing is drawn outside the extract. */
export const createThemisNightLayer = (dataset: DatasetDescriptor): TileLayer<XYZ> =>
  new TileLayer({ source: createRegionSource(dataset), ...themisNightDefaults });

/** Puts the switch and slider state on the drawn layer. */
export const applyThemisNightSettings = (layer: TileLayer<XYZ>, settings: ThemisNightSettings): void => {
  layer.setVisible(settings.visible);
  layer.setOpacity(settings.opacity);
};
