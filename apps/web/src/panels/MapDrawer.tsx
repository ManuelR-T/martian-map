import { localize } from '@marps/ui';
import '../i18n';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Maximize2, Minimize2, X, type LucideIcon } from 'lucide-react';

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
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  const resizeLabel = localize(expanded ? "Réduire : {{v0}}" : "Agrandir : {{v0}}", { v0: label });
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

  return <div className={`map-drawer map-drawer-${side}`} data-state={open ? 'open' : 'closed'} data-expanded={expanded}>
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
      <button type="button" className="map-drawer-resize" aria-label={resizeLabel} title={resizeLabel} aria-pressed={expanded} aria-controls={id} onClick={() => setExpanded(value => !value)}>
        {expanded ? <Minimize2 aria-hidden="true" className="size-4" /> : <Maximize2 aria-hidden="true" className="size-4" />}
      </button>
      <button type="button" className="map-drawer-close" aria-label={localize("Fermer : {{v0}}", { v0: label })} title={localize("Fermer : {{v0}}", { v0: label })} onClick={close}>
        <X aria-hidden="true" className="size-5" />
      </button>
      <div className="map-drawer-body">{localize(children)}</div>
    </div>
  </div>;
}
