import { localize } from '../localize';
import type { ComponentProps } from 'react';
import { Calculator, CircleHelp, FlaskConical, Ruler, type LucideIcon } from 'lucide-react';

import { cn } from '../lib/utils';
import { Badge } from './ui/badge';

export type ProvenanceStatus = 'measured' | 'calculated' | 'simulated' | 'unknown';

interface ProvenanceDefinition {
  readonly label: string;
  readonly icon: LucideIcon;
  readonly className: string;
}

const definitions: Record<ProvenanceStatus, ProvenanceDefinition> = {
  measured: { label: 'Mesuré', icon: Ruler, className: 'border-success-border bg-success-surface text-success' },
  calculated: { label: 'Calculé', icon: Calculator, className: 'border-info-border bg-info-surface text-info' },
  simulated: {
    label: 'Simulé',
    icon: FlaskConical,
    className: 'border-dashed border-warning-border bg-warning-surface text-warning',
  },
  unknown: { label: 'Inconnu', icon: CircleHelp, className: 'border-dashed border-input bg-transparent text-foreground' },
};

export interface ProvenanceBadgeProps extends Omit<ComponentProps<'span'>, 'children'> {
  status: ProvenanceStatus;
}

/** Indique si une valeur est mesurée, calculée, simulée ou inconnue : mot, icône et bordure. */
export function ProvenanceBadge({ status, className, ...props }: ProvenanceBadgeProps) {
  const definition = definitions[status];
  const Icon = definition.icon;

  return (
    <Badge variant="outline" data-status={status} className={cn(definition.className, className)} {...props}>
      <Icon aria-hidden="true" />
      {localize(definition.label)}
    </Badge>
  );
}
