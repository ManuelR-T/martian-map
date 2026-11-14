import { useId, useState, type ComponentProps, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

import { cn } from '../lib/utils';

export interface PanelProps extends Omit<ComponentProps<'section'>, 'title'> {
  title: string;
  description?: ReactNode;
  /** Contrôles rattachés au panneau, affichés à droite du titre. */
  actions?: ReactNode;
  headingLevel?: 2 | 3;
  /** Classes du conteneur de contenu, par exemple pour retirer la marge d'une carte. */
  contentClassName?: string;
  /** Le titre devient un bouton qui replie le contenu, pour dégager la carte sous un panneau flottant. */
  collapsible?: boolean;
  defaultOpen?: boolean;
}

/**
 * Zone titrée de l'interface, dessinée comme un panneau d'instrument : filet
 * supérieur couleur rouille, bandeau de titre en capitales, angles droits et aucune ombre.
 * Le titre nomme la région pour les lecteurs d'écran.
 */
export function Panel({
  title,
  description,
  actions,
  headingLevel = 2,
  className,
  contentClassName,
  collapsible = false,
  defaultOpen = true,
  children,
  ...props
}: PanelProps) {
  const headingId = useId();
  const contentId = useId();
  const [open, setOpen] = useState(defaultOpen);
  const expanded = !collapsible || open;
  const Heading = headingLevel === 2 ? 'h2' : 'h3';

  return (
    <section
      data-slot="panel"
      data-state={expanded ? 'open' : 'closed'}
      aria-labelledby={headingId}
      className={cn(
        'flex min-h-0 flex-col border border-t-2 border-t-mars bg-card text-card-foreground',
        className,
      )}
      {...props}
    >
      <header
        className={cn(
          'flex flex-wrap items-center justify-between gap-x-4 gap-y-2 bg-muted px-4 py-2.5',
          expanded && 'border-b',
        )}
      >
        <div className="min-w-0 flex-1">
          <Heading id={headingId} className="label-caps">
            {collapsible ? (
              <button
                type="button"
                aria-expanded={open}
                aria-controls={contentId}
                onClick={() => setOpen((current) => !current)}
                className="label-caps flex w-full items-center gap-2 text-left"
              >
                <ChevronDown
                  aria-hidden="true"
                  className={cn('size-4 shrink-0 transition-transform', !open && '-rotate-90')}
                />
                {title}
              </button>
            ) : (
              title
            )}
          </Heading>
          {description && expanded ? (
            <p className={cn('text-sm text-muted-foreground', collapsible && 'pl-6')}>{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </header>
      <div id={contentId} hidden={!expanded} className={cn('min-h-0 flex-1 p-4', contentClassName)}>
        {children}
      </div>
    </section>
  );
}
