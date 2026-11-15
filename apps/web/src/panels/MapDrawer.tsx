import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X, type LucideIcon } from 'lucide-react';

/** Volet non modal : la carte reste utilisable pendant la consultation. */
export function MapDrawer({ label, icon: Icon, side, open, onOpenChange, children }: {
  label: string;
  icon: LucideIcon;
  side: 'left' | 'right';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const content = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) content.current?.focus();
  }, [open]);

  function close() {
    onOpenChange(false);
    trigger.current?.focus();
  }

  return <div className={`map-drawer map-drawer-${side}`}>
    <button
      ref={trigger}
      type="button"
      className="map-drawer-trigger glass"
      aria-label={label}
      title={label}
      aria-expanded={open}
      aria-controls={id}
      onClick={() => onOpenChange(!open)}
    >
      <Icon aria-hidden="true" className="size-5" />
    </button>
    <div
      ref={content}
      id={id}
      role="region"
      aria-label={label}
      tabIndex={-1}
      hidden={!open}
      className="map-drawer-content"
      onKeyDown={(event) => {
        if (event.key === 'Escape') { event.stopPropagation(); close(); }
      }}
    >
      <button type="button" className="map-drawer-close" aria-label={`Fermer : ${label}`} onClick={close}>
        <X aria-hidden="true" className="size-5" />
      </button>
      {children}
    </div>
  </div>;
}
