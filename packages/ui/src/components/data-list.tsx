import type { ComponentProps, ReactNode } from 'react';

import { cn } from '../lib/utils';

/** Liste libellé/valeur pour les fiches de site et les métadonnées de source. */
export function DataList({ className, ...props }: ComponentProps<'dl'>) {
  return <dl data-slot="data-list" className={cn('m-0 grid gap-3 text-sm', className)} {...props} />;
}

export interface DataListItemProps extends ComponentProps<'div'> {
  label: string;
  /** Statut de provenance ou précision affichée à côté du libellé. */
  annotation?: ReactNode;
}

export function DataListItem({ label, annotation, className, children, ...props }: DataListItemProps) {
  return (
    <div data-slot="data-list-item" className={cn('grid gap-1', className)} {...props}>
      <dt className="label-caps flex flex-wrap items-center gap-2 text-muted-foreground">
        {label}
        {annotation}
      </dt>
      <dd className="m-0 leading-relaxed text-foreground">{children}</dd>
    </div>
  );
}
