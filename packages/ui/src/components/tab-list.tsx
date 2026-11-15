import { localize } from '../localize';
import { useRef, type KeyboardEvent } from 'react';

import { cn } from '../lib/utils';

export interface TabOption<Value extends string> {
  readonly value: Value;
  readonly label: string;
}

export interface TabListProps<Value extends string> {
  /** Nom accessible de la liste, par exemple « Sections de la mission ». */
  label: string;
  value: Value;
  options: readonly TabOption<Value>[];
  onValueChange: (value: Value) => void;
  /** Identifiant d'un onglet, à reprendre dans `aria-labelledby` du panneau qu'il commande. */
  tabId: (value: Value) => string;
  /** Identifiant du panneau commandé. */
  panelId: string;
  className?: string;
}

/**
 * Onglets d'un panneau : chaque onglet montre une section. Les flèches passent d'un
 * onglet à l'autre, et seul l'onglet actif est dans l'ordre de tabulation.
 */
export function TabList<Value extends string>({ label, value, options, onValueChange, tabId, panelId, className }: TabListProps<Value>) {
  const list = useRef<HTMLDivElement>(null);
  const move = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = options.findIndex((option) => option.value === value);
    const target = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: options.length - 1 }[event.key];
    if (target === undefined) return;
    event.preventDefault();
    const next = options[(target + options.length) % options.length]!;
    onValueChange(next.value);
    list.current?.querySelector<HTMLElement>(`#${CSS.escape(tabId(next.value))}`)?.focus();
  };
  return (
    <div
      ref={list}
      role="tablist"
      data-slot="tab-list"
      aria-label={localize(label)}
      onKeyDown={move}
      className={cn('flex w-full items-stretch gap-0.5 border border-input bg-card/70 p-0.5', className)}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            id={tabId(option.value)}
            aria-selected={selected}
            aria-controls={panelId}
            tabIndex={selected ? 0 : -1}
            onClick={() => onValueChange(option.value)}
            className={cn(
              'label-caps relative inline-flex min-h-11 min-w-0 flex-auto cursor-pointer items-center justify-center px-2 py-1 text-center leading-tight text-foreground transition-[color,background-color,box-shadow] duration-200 focus-visible:z-10',
              'hover:bg-accent hover:text-accent-foreground',
              'aria-selected:bg-mars aria-selected:text-mars-foreground aria-selected:shadow-ember',
            )}
          >
            {localize(option.label)}
          </button>
        );
      })}
    </div>
  );
}
