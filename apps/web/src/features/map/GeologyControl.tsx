import { localize, Button, cn } from '@marps/ui';
import '../../i18n';
import { useId } from 'react';
import { Layers } from 'lucide-react';
import type { GeologyDataset, SiteDescriptor } from '@marps/data';
import type { GeologySettings } from './geologyLayer';
import { LayerSwitch } from './LayerSwitch';

export interface GeologyControlProps {
  dataset: GeologyDataset;
  sites: readonly SiteDescriptor[];
  settings: GeologySettings;
  onChange: (next: GeologySettings) => void;
  loading: boolean;
  failed: boolean;
  onRetry: () => void;
  className?: string;
}

/**
 * Shows the interpretive units with their legend, credits and registration limit. A stop gets
 * a unit only when the data assigns one; otherwise every unit within the offset is listed.
 */
export const GeologyControl = ({ dataset, sites, settings, onChange, loading, failed, onRetry, className }: GeologyControlProps) => {
  const opacityId = useId();
  const percent = Math.round(settings.opacity * 100);
  const { geology } = dataset;
  const offset = geology.registration.offsetMetres;
  const unitName = new Map(geology.units.map(unit => [unit.symbol, unit.name]));
  return (
    <div className={cn('grid gap-2 border bg-card p-3 text-sm text-foreground', className)}>
      <LayerSwitch label={localize("Carte géologique")} icon={<Layers aria-hidden="true" />} checked={settings.visible} onChange={(visible) => onChange({ ...settings, visible })} />
      {settings.visible && <>
        <p className="font-semibold">{localize("Carte interprétative, pas une mesure.")}</p>
        {loading && <p role="status">{localize("Chargement de la carte géologique…")}</p>}
        {failed && <p role="status"><Button className="min-h-11" onClick={onRetry}>{localize("Carte géologique indisponible. Réessayer")}</Button></p>}
        <div className="flex items-center justify-between">
          <label htmlFor={opacityId}>{localize("Opacité")}</label>
          <output htmlFor={opacityId} className="tabular-nums">{localize(percent)} {localize("%")}</output>
        </div>
        <input id={opacityId} type="range" min={10} max={100} step={10} value={percent}
          onChange={event => onChange({ ...settings, opacity: Number(event.target.value) / 100 })} className="h-11 w-full accent-primary" />
        <ul className="grid gap-1" aria-label={localize("Unités géologiques")}>
          {geology.units.map(unit => (
            <li key={unit.symbol} className="flex items-start gap-2">
              <span aria-hidden="true" className="mt-1 inline-block size-3 shrink-0 border" style={{ background: unit.colour }} />
              <span><strong>{unit.symbol}</strong> {localize("·")} {localize(unit.name)} {localize("·")} {localize(unit.period)}
                {unit.sectorShare > 0 && <> {localize("·")} {localize(Math.round(unit.sectorShare * 100))} {localize("% du secteur")}</>}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs">{localize("Contacts possiblement décalés de {{v0}} à {{v1}} m par rapport aux mosaïques Mars 2020 : aucun recalage appliqué.", { v0: offset.min, v1: offset.max })}</p>
        <div className="text-xs">
          <p className="font-semibold">{localize("Unité sous chaque arrêt")}</p>
          <ul>
            {geology.sites.map(entry => {
              const site = sites.find(candidate => candidate.id === entry.siteId);
              if (!site) return null;
              return <li key={entry.siteId}>{site.name}{localize(":")} {entry.assignedSymbol
                ? `${entry.assignedSymbol} (${localize(unitName.get(entry.assignedSymbol))})`
                : <>{localize("indéterminée, à moins de {{v0}} m de", { v0: offset.max })} {entry.candidates.map(candidate => candidate.symbol).join(', ')}</>}</li>;
            })}
          </ul>
        </div>
        <p className="text-xs text-muted-foreground">
          {localize(geology.authors)} {localize("·")} {localize(geology.published)} {localize("·")} {localize("échelle 1:{{v0}}", { v0: geology.scale })}<br />
          <a className="underline" href={geology.recordUrl}>{localize("USGS, carte SIM 3464")}</a>
        </p>
      </>}
    </div>
  );
};
