import { localize } from '@marps/ui';
import '../../i18n';
import { Info } from 'lucide-react';
import type { ReactNode } from 'react';
import { jezeroMessages } from './jezeroMessages';

export function MapInformation({ children }: { children: ReactNode }) {
  const title = jezeroMessages.fr.sources;
  return <details className="map-information text-xs text-foreground">
    <summary className="map-info-toggle border bg-card" aria-label={localize(title)} title={localize(title)}><Info aria-hidden="true" className="size-5" /></summary>
    <div className="map-info-content border bg-card p-4">
      <p className="mb-2 font-semibold">{localize(title)}</p>
      {localize(children)}
      <a href="#/sources" className="inline-flex min-h-11 items-center underline">{localize("Sources, hypothèses et limites")}</a>
    </div>
  </details>;
}
