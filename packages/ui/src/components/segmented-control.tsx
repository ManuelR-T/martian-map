import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { RadioGroup } from 'radix-ui';

import { cn } from '../lib/utils';

export interface SegmentedOption<Value extends string> {
  readonly value: Value;
  readonly label: string;
  readonly icon?: ReactNode;
}

export interface SegmentedControlProps<Value extends string> {
  /** Nom accessible du groupe, par exemple « Vue de la carte ». */
  label: string;
  value: Value;
  options: readonly SegmentedOption<Value>[];
  onValueChange: (value: Value) => void;
  className?: string;
}

/**
 * Sélecteur de mode, sous forme de groupe radio : les flèches du clavier
 * changent d'option et une option reste toujours active. La case active est
 * pleine, rayonne et porte une coche.
 */
export function SegmentedControl<Value extends string>({
  label,
  value,
  options,
  onValueChange,
  className,
}: SegmentedControlProps<Value>) {
  return (
    <RadioGroup.Root
      data-slot="segmented-control"
      aria-label={label}
      orientation="horizontal"
      value={value}
      onValueChange={(next) => {
        const option = options.find((candidate) => candidate.value === next);
        if (option) onValueChange(option.value);
      }}
      className={cn('inline-flex w-fit items-stretch gap-0.5 border border-input bg-card/70 p-0.5', className)}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <RadioGroup.Item
            key={option.value}
            value={option.value}
            data-slot="segmented-control-item"
            className={cn(
              'label-caps relative inline-flex h-10 min-w-0 shrink-0 items-center justify-center gap-1.5 px-3.5 whitespace-nowrap text-foreground transition-[color,background-color,box-shadow] duration-200 focus-visible:z-10',
              'hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50',
              'data-[state=checked]:bg-mars data-[state=checked]:text-mars-foreground data-[state=checked]:shadow-ember',
              '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
            )}
          >
            {selected ? <Check aria-hidden="true" /> : option.icon}
            {option.label}
          </RadioGroup.Item>
        );
      })}
    </RadioGroup.Root>
  );
}
