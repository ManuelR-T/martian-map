import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** Tous les calques partagent le volet, y compris sur mobile, sans couvrir la carte au démarrage. */
export function MapPanelDock({ host, children }: { host: HTMLElement | null; children: ReactNode }) {
  return host ? createPortal(children, host) : null;
}
