import type { ReactNode } from 'react';
import { jezeroMessages } from './jezeroMessages';

export function MapInformation({ children }: { children: ReactNode }) {
  const title = jezeroMessages.fr.sources;
  return <details className="map-information text-xs text-foreground">
    <summary className="map-info-toggle border bg-card" aria-label={title} title={title}>i</summary>
    <div className="map-info-content border bg-card p-4">
      <p className="mb-2 font-semibold">{title}</p>
      {children}
    </div>
  </details>;
}
