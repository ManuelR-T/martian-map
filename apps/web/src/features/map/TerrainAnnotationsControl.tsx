import type { TerrainAnnotationCollection } from '@marps/data';
import { Button } from '@marps/ui';
import { useTranslation } from 'react-i18next';
import { LayerSwitch } from './LayerSwitch';
export function TerrainAnnotationsControl({ enabled, onToggle, collection, hits, onSelect, loading, failed, retry, inView }: {
  enabled: boolean; onToggle: () => void; collection: TerrainAnnotationCollection | null; hits: readonly string[] | null;
  onSelect: (id: string) => void; loading: boolean; failed: boolean; retry: () => void; inView: boolean;
}) {
  const { t } = useTranslation();
  return <div className="grid gap-2 text-sm">
    <LayerSwitch label={t('Terrain to inspect')} checked={enabled} onChange={onToggle} />
    {enabled && <>
      <p>{t('Triangles mark visual interpretations, not measured hazards. Unannotated terrain has not been assessed.')}</p>
      {loading && <p role="status">{t('Loading prepared annotations…')}</p>}
      {failed && <div role="alert"><p>{t('Annotations unavailable. The rest of the map remains usable.')}</p><Button onClick={retry}>{t('Retry annotations')}</Button></div>}
      {collection && <>
        <p role="status">{t('Prepared annotations')}: {collection.features.length}{!inView && ` · ${t('No annotations in this view')}`}</p>
        {hits && hits.length > 1 && <p className="font-semibold">{t('Several annotations overlap. Choose one below.')}</p>}
        <ul className="grid gap-1" aria-label={t('Prepared annotations')}>
          {collection.features.map(annotation => <li key={annotation.id}><button type="button" data-annotation-row={annotation.id} aria-pressed={hits?.length === 1 && hits[0] === annotation.id} onClick={() => onSelect(annotation.id)} className="min-h-11 w-full cursor-pointer border px-3 py-2 text-left aria-pressed:border-primary">
            {t(annotation.properties.title)}{hits && hits.length > 1 && hits.includes(annotation.id) && ` · ${t('At tapped position')}`}
          </button></li>)}
        </ul>
      </>}
    </>}
  </div>;
}
