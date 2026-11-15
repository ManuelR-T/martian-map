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
  /** Tout le bandeau de titre devient un bouton qui replie le contenu, pour dégager la carte sous un panneau flottant. */
  collapsible?: boolean;
  defaultOpen?: boolean;
  /** Le panneau flotte sur la carte : surface de verre floutée et ombre portée. */
  floating?: boolean;
}

/**
 * Zone titrée de l'interface, dessinée comme un instrument : filet d'horizon
 * sur l'arête haute, équerres de viseur aux angles bas, titre en capitales.
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
  floating = false,
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
        'panel-frame relative flex min-h-0 flex-col border text-card-foreground',
        floating ? 'glass' : 'bg-card',
        className,
      )}
      {...props}
    >
      <header
        className={cn(
          'relative flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 pt-3.5 pb-3',
          collapsible && 'transition-colors hover:bg-accent/50',
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
                // La zone activable couvre tout le bandeau : une cible large, atteignable avec des gants.
                className="label-caps flex w-full items-center gap-2 text-left after:absolute after:inset-0 after:content-['']"
              >
                <ChevronDown
                  aria-hidden="true"
                  className={cn('size-4 shrink-0 text-mars transition-transform duration-200', !open && '-rotate-90')}
                />
                {title}
              </button>
            ) : (
              title
            )}
          </Heading>
          {description && expanded ? (
            <p className={cn('mt-0.5 text-sm text-muted-foreground', collapsible && 'pl-6')}>{description}</p>
          ) : null}
        </div>
        {actions ? <div className="relative z-10 flex shrink-0 items-center gap-2">{actions}</div> : null}
      </header>
      <div id={contentId} hidden={!expanded} className={cn('min-h-0 flex-1 p-4', contentClassName)}>
        {children}
      </div>
    </section>
  );
}
