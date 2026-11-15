import { useEffect, useMemo, useState } from 'react';
import { loadGeologyUnits, type GeologicUnitShape, type GeologyDataset } from '@marps/data';
import { applyGeologySettings, createGeologyLayer, geologyDefaults } from './geologyLayer';

/**
 * Loads the frozen units the first time the layer is shown, then keeps one layer across map
 * rebuilds so the switch and the map never disagree. `failed` stays set until `retry`.
 */
export const useGeologyLayer = (dataset: GeologyDataset | undefined) => {
  const [settings, setSettings] = useState(geologyDefaults);
  const [units, setUnits] = useState<readonly GeologicUnitShape[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!dataset || !settings.visible || units || failed) return;
    const controller = new AbortController();
    loadGeologyUnits(dataset, controller.signal)
      .then(value => { if (!controller.signal.aborted) setUnits(value); })
      .catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [dataset, settings.visible, units, failed, attempt]);
  const layer = useMemo(() => (dataset && units ? createGeologyLayer(dataset, units) : null), [dataset, units]);
  useEffect(() => {
    if (layer) applyGeologySettings(layer, settings);
  }, [layer, settings]);
  const retry = () => { setFailed(false); setAttempt(value => value + 1); };
  return { layer, settings, setSettings, loading: Boolean(dataset && settings.visible && !units && !failed), failed, retry };
};
