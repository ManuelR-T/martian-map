import { useEffect, useMemo, useState } from 'react';
import type { DatasetDescriptor } from '@marps/data';
import { applyThemisNightSettings, createThemisNightLayer, themisNightDefaults } from './themisNight';

/**
 * One layer per dataset, kept across map rebuilds so the switch and the map never disagree.
 * The caller inserts `layer` above its imagery layers and below its vector layers.
 */
export const useThemisNightLayer = (dataset: DatasetDescriptor | undefined) => {
  const layer = useMemo(() => (dataset ? createThemisNightLayer(dataset) : null), [dataset]);
  const [settings, setSettings] = useState(themisNightDefaults);
  useEffect(() => {
    if (layer) applyThemisNightSettings(layer, settings);
  }, [layer, settings]);
  return { layer, settings, setSettings };
};
