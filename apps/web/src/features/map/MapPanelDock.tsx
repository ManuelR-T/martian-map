import { useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const desktopQuery = '(min-width: 1280px) and (min-height: 601px)';
const subscribe = (listener: () => void) => {
  const media = window.matchMedia(desktopQuery);
  media.addEventListener('change', listener);
  return () => media.removeEventListener('change', listener);
};
const isDesktop = () => window.matchMedia(desktopQuery).matches;

/** Desktop map panels share the sidebar's flow and scrolling; compact layouts keep the map overlay. */
export function MapPanelDock({ host, children }: { host: HTMLElement | null; children: ReactNode }) {
  const desktop = useSyncExternalStore(subscribe, isDesktop, () => false);
  return desktop && host ? createPortal(children, host) : children;
}
