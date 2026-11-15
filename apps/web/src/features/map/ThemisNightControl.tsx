import { localize } from '@marps/ui';
import '../../i18n';
import { useId } from 'react';
import { Moon } from 'lucide-react';
import type { DatasetDescriptor } from '@marps/data';
import { cn } from '@marps/ui';
import type { ThemisNightSettings } from './themisNight';
import { LayerSwitch } from './LayerSwitch';

export interface ThemisNightControlProps {
  dataset: DatasetDescriptor;
  settings: ThemisNightSettings;
  onChange: (next: ThemisNightSettings) => void;
  className?: string;
}

/**
 * Turns the THEMIS night layer on and sets its opacity. The legend is ordinal on purpose:
 * USGS stretched the greys for display, so they are neither temperatures nor thermal inertia.
 */
export const ThemisNightControl = ({ dataset, settings, onChange, className }: ThemisNightControlProps) => {
  const opacityId = useId();
  const percent = Math.round(settings.opacity * 100);
  return (
    <div className={cn('grid gap-2 border bg-card p-3 text-sm text-foreground', className)}>
      <LayerSwitch label={localize("Infrarouge de nuit")} icon={<Moon aria-hidden="true" />} checked={settings.visible} onChange={(visible) => onChange({ ...settings, visible })} />
      {settings.visible && <>
        <div className="flex items-center justify-between">
          <label htmlFor={opacityId}>{localize("Opacité")}</label>
          <output htmlFor={opacityId} className="tabular-nums">{localize(percent)} {localize("%")}</output>
        </div>
        <input
          id={opacityId}
          type="range"
          min={10}
          max={100}
          step={10}
          value={percent}
          onChange={event => onChange({ ...settings, opacity: Number(event.target.value) / 100 })}
          className="h-11 w-full accent-primary"
        />
        <div aria-hidden="true" className="h-4 border bg-gradient-to-r from-black to-white" />
        <p className="flex justify-between gap-4 text-xs"><span>{localize("Sombre : sable, poussière")}</span><span className="text-right">{localize("Clair : roche, sol dur")}</span></p>
        <p className="font-semibold">{localize("Contraste, pas une température.")}</p>
        <p className="text-xs text-muted-foreground">{localize("Mars Odyssey · THEMIS")}{dataset.resolution && ` · ${dataset.resolution.value} ${dataset.resolution.unit}`}<br />{localize("Mosaïque de 2018")}</p>
      </>}
    </div>
  );
};
