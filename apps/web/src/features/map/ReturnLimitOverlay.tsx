import { Button, localize } from '@marps/ui';
import { useTranslation } from 'react-i18next';
import { useEffect, useMemo, useState } from 'react';
import type Map from 'ol/Map';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { useReturnLimit } from '../../mission/ReturnLimitProvider';
import { returnLimitFeatures } from './returnLimitLayer';
export function ReturnLimitOverlay({ map }: { map: Map | null }) {
  useTranslation();
  const shared = useReturnLimit();
  const layer = useMemo(() => new VectorLayer({ zIndex: 3.5, source: new VectorSource({ wrapX: false }) }), []);
  useEffect(() => {
    if (!map) return;
    map.addLayer(layer);
    return () => { map.removeLayer(layer); };
  }, [map, layer]);
  useEffect(() => {
    const source = layer.getSource()!;
    source.clear();
    if (shared) source.addFeatures(returnLimitFeatures(shared.result, shared.selected));
  }, [layer, shared]);
  const [candidates, setCandidates] = useState<{ source: typeof shared; ids: string[] } | null>(null);
  useEffect(() => {
    if (!map || !shared) return;
    const click = (event: import('ol/MapBrowserEvent').default<PointerEvent | KeyboardEvent | WheelEvent>) => {
      const features = map.getFeaturesAtPixel(event.pixel, { hitTolerance: 18 });
      if (features.some(feature => feature.getId() !== undefined)) return;
      const ids = [...new Set(features.map(feature => feature.get('returnEventId')).filter((id): id is string => typeof id === 'string' && id !== 'initial'))];
      if (ids.length === 1) shared.select(ids[0]!);
      setCandidates(ids.length > 1 ? { source: shared, ids } : null);
    };
    map.on('singleclick', click);
    return () => { map.un('singleclick', click); };
  }, [map, shared]);
  return candidates?.source === shared ? <div className="grid gap-2" aria-label={localize('Thresholds and estimation precision')}>{candidates.ids.map(id => <Button key={id} variant="outline" onClick={() => { shared?.select(id); setCandidates(null); }}>{localize('Reserve entry')} {Number(id) + 1}</Button>)}</div> : null;
}
