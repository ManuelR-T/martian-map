import { useEffect, useMemo, useRef, useState } from 'react';
import type Map from 'ol/Map';
import { loadTerrainAnnotations, type DataManifest, type TerrainAnnotationCollection } from '@marps/data';
import { createTerrainAnnotationLayer } from './terrainAnnotationLayer';
import { TerrainAnnotationsControl } from './TerrainAnnotationsControl';
import { TerrainAnnotationSheet } from './TerrainAnnotationSheet';
export function TerrainAnnotations({ map, manifest, enabled, onToggle, hits, onHitsChange, onClose, fetcher }: {
  map: Map | null; manifest: DataManifest; enabled: boolean; onToggle: () => void;
  hits: readonly string[] | null; onHitsChange: (ids: readonly string[] | null) => void; onClose: () => void; fetcher?: typeof fetch;
}) {
  const [collection, setCollection] = useState<TerrainAnnotationCollection | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [inView, setInView] = useState(true);
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!enabled || collection) return;
    const controller = new AbortController();
    loadTerrainAnnotations(manifest, 'jezero', controller.signal, fetcher).then(value => {
      if (!controller.signal.aborted) setCollection(value);
    }).catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [enabled, collection, manifest, attempt, fetcher]);
  const layer = useMemo(() => collection ? createTerrainAnnotationLayer(collection) : null, [collection]);
  useEffect(() => {
    if (!map || !layer) return;
    map.addLayer(layer);
    const update = () => {
      const extent = map.getView().calculateExtent(map.getSize());
      setInView((layer.getSource()?.getFeaturesInExtent(extent).length ?? 0) > 0);
    };
    map.on('moveend', update); update();
    return () => { map.un('moveend', update); map.removeLayer(layer); };
  }, [map, layer]);
  useEffect(() => { layer?.setVisible(enabled); }, [layer, enabled]);
  const selected = enabled && hits?.length === 1 ? collection?.features.find(feature => feature.id === hits[0]) : undefined;
  useEffect(() => { layer?.set('selectedAnnotationId', selected?.id); layer?.changed(); }, [layer, selected]);
  const close = () => {
    onHitsChange(null);
    const row = Array.from(host.current?.querySelectorAll<HTMLButtonElement>('[data-annotation-row]') ?? []).find(button => button.dataset.annotationRow === selected?.id);
    if (row) row.focus({ preventScroll: true }); else onClose();
  };
  return <div ref={host}>
    <TerrainAnnotationsControl enabled={enabled} onToggle={() => { onHitsChange(null); onToggle(); }} collection={collection} hits={hits} onSelect={id => onHitsChange([id])} loading={!collection && !failed} failed={failed} retry={() => { setFailed(false); setAttempt(value => value + 1); }} inView={inView} />
    {selected && <TerrainAnnotationSheet annotation={selected} imagery={manifest.datasets.find(dataset => dataset.id === selected.properties.imageryDatasetId)} onClose={close} onCenter={() => {
      const geometry = layer?.getSource()?.getFeatureById(`annotation:${selected.id}`)?.getGeometry();
      if (map && geometry) map.getView().fit(geometry.getExtent(), { size: map.getSize(), maxZoom: map.getView().getMaxZoom(), padding: [90, 60, 100, 60] });
    }} />}
  </div>;
}
