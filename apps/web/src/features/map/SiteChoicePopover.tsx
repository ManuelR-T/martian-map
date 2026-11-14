import { useLayoutEffect, useRef } from 'react';
import type { SiteDescriptor } from '@marps/data';
import { Button } from '@marps/ui';
import { jezeroMessages } from './jezeroMessages';

export interface SiteChoice {
  readonly sites: readonly SiteDescriptor[];
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

export function SiteChoicePopover({ choice, onSelect, onClose }: {
  choice: SiteChoice;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = ref.current!;
    element.showPopover();
    const size = element.getBoundingClientRect();
    const above = choice.top - size.height - 12;
    element.style.left = `${Math.max(8, Math.min((choice.left + choice.right - size.width) / 2, window.innerWidth - size.width - 8))}px`;
    element.style.top = `${Math.max(8, Math.min(above >= 8 ? above : choice.bottom + 12, window.innerHeight - size.height - 8))}px`;
    element.querySelector<HTMLButtonElement>('button')?.focus();
  }, [choice]);
  const messages = jezeroMessages.fr;
  return <div ref={ref} popover="auto" role="dialog" aria-label={messages.chooseSite}
    className="site-choice-popover border bg-card p-4 text-foreground"
    onToggle={event => { if (event.newState === 'closed') onClose(); }}>
    <p className="mb-2 font-semibold">{messages.chooseSite}</p>
    <div className="grid gap-2">
      {choice.sites.map(site => <Button key={site.id} variant="outline" onClick={() => { onSelect(site.id); onClose(); }}>{site.name}</Button>)}
      <Button variant="ghost" onClick={onClose}>{messages.cancel}</Button>
    </div>
  </div>;
}
