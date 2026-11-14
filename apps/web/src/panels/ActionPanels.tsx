import { useId, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface Props<Value extends string> {
  label: string;
  value: Value;
  options: readonly { value: Value; label: string }[];
  disabled?: boolean;
  onChange: (value: Value) => void;
  children: ReactNode;
}

/** Nested collapsible panels. Closing the active panel preserves its draft. */
export function ActionPanels<Value extends string>({ label, value, options, disabled, onChange, children }: Props<Value>) {
  const id = useId();
  const [closedValue, setClosedValue] = useState<Value | null>(null);
  return <div role="group" aria-label={label} className="grid w-full min-w-0">
    {options.map(option => {
      const expanded = value === option.value && closedValue !== option.value;
      return <section key={option.value} aria-labelledby={`${id}-heading-${option.value}`}
        className="flex w-full min-w-0 flex-col border border-x-0 border-t-2 border-t-mars bg-card text-card-foreground">
        <h3 className={`bg-muted ${expanded ? 'border-b' : ''}`}>
          <button id={`${id}-heading-${option.value}`} type="button" aria-expanded={expanded}
            aria-controls={`${id}-panel-${option.value}`} disabled={disabled}
            className="label-caps flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left disabled:opacity-50"
            onClick={() => {
              if (value === option.value) setClosedValue(expanded ? option.value : null);
              else { onChange(option.value); setClosedValue(null); }
            }}
            onKeyDown={event => {
              const index = options.findIndex(item => item.value === option.value);
              const next = event.key === 'ArrowDown' ? (index + 1) % options.length
                : event.key === 'ArrowUp' ? (index + options.length - 1) % options.length
                  : event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : null;
              if (next === null) return;
              event.preventDefault();
              const group = event.currentTarget.closest('[role="group"]');
              const heading = group?.children[next]?.querySelector<HTMLButtonElement>('h3 > button');
              heading?.focus();
            }}>
            <ChevronDown aria-hidden="true" className={`size-4 shrink-0 transition-transform ${expanded ? '' : '-rotate-90'}`} />
            {option.label}
          </button>
        </h3>
        <div role="region" id={`${id}-panel-${option.value}`} aria-labelledby={`${id}-heading-${option.value}`}
          hidden={!expanded} className="min-w-0 p-3">
          {value === option.value && children}
        </div>
      </section>;
    })}
  </div>;
}
