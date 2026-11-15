import type { DatasetDescriptor, TerrainAnnotation } from '@marps/data';
import { Button, ProvenanceBadge, localize } from '@marps/ui';
import { useTranslation } from 'react-i18next';
import '../../i18n';
export function TerrainAnnotationSheet({ annotation, imagery, onCenter, onClose }: { annotation: TerrainAnnotation; imagery?: DatasetDescriptor; onCenter: () => void; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const formatNumber = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 2 }).format;
  const data = annotation.properties;
  return <section aria-label={t('Terrain inspection')} className="grid gap-3 border-t pt-3 text-sm">
    <h3 className="font-semibold">{t(data.title)}</h3>
    <p><ProvenanceBadge status="interpreted" /> · {t(data.category)}</p>
    <p>{t(data.observation)}</p>
    <p className="font-semibold">{t('Why inspect?')}</p><p>{t(data.inspectionReason)}</p>
    <p>{t('Interpretation confidence')}: {t(data.confidence.level)}</p><p>{t(data.confidence.reason)}</p>
    {data.limitations.map(limit => <p key={limit}>{t(limit)}</p>)}
    <details><summary className="min-h-11 cursor-pointer py-3 font-semibold">{t('Evidence and uncertainty')}</summary>
      <dl className="grid gap-2 break-words">
        <dt>{t('Source')}</dt><dd>{imagery?.source.credit ?? t('Unknown')}</dd>
        <dt>{t('Instrument')}</dt><dd>{imagery?.instrument ? localize(imagery.instrument) : t('Unknown')}</dd>
        <dt>{t('Image acquisition date / sol')}</dt><dd>{imagery?.acquisition.date ?? t('Unknown')} / {imagery?.acquisition.sol ?? t('Unknown')}</dd>
        <dt>{t('Native image sampling')}</dt><dd>{imagery?.resolution ? formatNumber(imagery.resolution.value) : t('Unknown')} m/pixel</dd>
        <dt>{t('Finest prepared sampling')}</dt><dd>{imagery?.tileset ? formatNumber(imagery.tileset.finestMetresPerPixel) : t('Unknown')} m/pixel</dd>
        <dt>{t('Positioning uncertainty')}</dt><dd>{data.registration.positionalUncertaintyMetres === null ? t('Unknown') : `${formatNumber(data.registration.positionalUncertaintyMetres)} m`}</dd>
        <dt>{t('Version')}</dt><dd>{data.imageryVersion}</dd>
        <dt>{t('Registration')}</dt><dd>{t(data.registration.method)} · {data.registration.checkedAt}<br />{t(data.registration.note)}</dd>
        <dt>{t('Evidence tiles')}</dt><dd>{data.evidenceFiles.join(', ')}</dd>
        <dt>{t('Curated by')}</dt><dd>{t(data.curatedBy)} · {data.curatedAt}</dd>
      </dl>
      <p className="mt-2">{t('External references need connectivity; essential evidence is stored on this device.')}</p>
      {imagery && <a className="inline-flex min-h-11 items-center underline" href={imagery.source.url}>{t('Original imagery source')}</a>}
    </details>
    <div className="flex flex-wrap gap-2"><Button onClick={onCenter}>{t('Center on annotation')}</Button><Button variant="outline" onClick={onClose}>{t('Close inspection')}</Button></div>
  </section>;
}
