import { useDrawerPerspective } from './useDrawerPerspective';
import { localize } from '@marps/ui';
import '../i18n';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X, type LucideIcon } from 'lucide-react';

/** Volet non modal : la carte reste utilisable pendant la consultation. */
export function MapDrawer({ label, shortLabel, icon: Icon, side, open, onOpenChange, children }: {
  label: string;
  /** Libellé affiché sur le bouton replié : un mot, lisible sans infobulle. */
  shortLabel?: string;
  icon: LucideIcon;
  side: 'left' | 'right';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  const frame = useRef<HTMLDivElement>(null);
  useDrawerPerspective(frame, open);
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef(false);

  useEffect(() => {
    if (open && content.current) {
      content.current.focus();
    } else if (restoreFocus.current) {
      trigger.current?.focus();
      restoreFocus.current = false;
    }
  }, [open]);

  function close() {
    restoreFocus.current = true;
    onOpenChange(false);
  }

  return <div ref={frame} className={`map-drawer map-drawer-${side}`} data-state={open ? 'open' : 'closed'}>
    <div className="map-drawer-visual">
    <button
      ref={trigger}
      type="button"
      className="map-drawer-trigger glass"
      hidden={open}
      aria-label={localize(label)}
      title={localize(label)}
      aria-expanded={open}
      aria-controls={id}
      onClick={() => onOpenChange(!open)}
    >
      <Icon aria-hidden="true" className="size-5 shrink-0" />
      {shortLabel && <span aria-hidden="true" className="label-caps">{localize(shortLabel)}</span>}
    </button>
    <div
      ref={content}
      id={id}
      role="region"
      aria-label={localize(label)}
      tabIndex={-1}
      inert={!open}
      aria-hidden={!open}
      className="map-drawer-content"
      onKeyDown={(event) => {
        if (event.key === 'Escape') { event.stopPropagation(); close(); }
      }}
    >
      {/* Le repère et la croix accompagnent la carte dans le rail. */}
      <span aria-hidden="true" className="map-drawer-card-icon"><Icon className="size-5" /></span>
      <button type="button" className="map-drawer-close" aria-label={localize("Fermer : {{v0}}", { v0: label })} title={localize("Fermer : {{v0}}", { v0: label })} onClick={close}>
        <X aria-hidden="true" className="size-5" />
      </button>
      <div className="map-drawer-body">{localize(children)}</div>
    </div>
    </div>
  </div>;
}
