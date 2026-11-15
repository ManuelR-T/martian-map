import { localize } from '../localize';
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
    <div data-slot="data-list-item" className={cn('grid content-start gap-1.5 border-l-2 border-mars/50 pl-3', className)} {...props}>
      <dt className="label-caps flex flex-wrap items-center gap-2 text-muted-foreground">
        {localize(label)}
        {localize(annotation)}
      </dt>
      <dd className="m-0 leading-relaxed text-foreground">{localize(children)}</dd>
    </div>
  );
}
