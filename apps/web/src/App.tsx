import { lazy, Suspense, useEffect, useState, useSyncExternalStore } from 'react';
import { BrandMark, DataState } from '@marps/ui';
import { BudgetPanel } from './panels/BudgetPanel';
import { MapStage } from './panels/MapStage';
import { SiteDetailsPanel } from './panels/SiteDetailsPanel';
import { PlannerMap } from './features/map/PlannerMap';
import { OfflineStatus } from './offline/OfflineStatus';
import './responsive.css';
import { SourcesPage } from './panels/Provenance';
import { StepsPanel } from './panels/StepsPanel';
import { usePlannerState } from './state/PlannerProvider';

const DesignSystemPage = lazy(() => import('./design-system/DesignSystemPage'));

const SOURCES_HASH = '#/sources';
const DESIGN_SYSTEM_HASH = '#/systeme-design';
const CONTENT_ID = 'contenu';

function subscribeToHash(listener: () => void) {
  window.addEventListener('hashchange', listener);
  return () => window.removeEventListener('hashchange', listener);
}

function useHash(): string {
  return useSyncExternalStore(subscribeToHash, () => window.location.hash);
}

const headerLink =
  'label-caps inline-flex h-11 items-center px-3 text-header-foreground/85 transition-colors hover:bg-accent hover:text-accent-foreground aria-[current=page]:bg-accent aria-[current=page]:text-accent-foreground';

/** Panneau flottant : capte les clics que sa colonne laisse passer vers la carte, et s'allume à son tour au chargement. */
const floatingPanel = 'power-on pointer-events-auto';

export function App() {
  const [mobilePage, setMobilePage] = useState<'map' | 'mission'>('map');
  const { view } = usePlannerState();
  const hash = useHash();
  const showsDesignSystem = hash === DESIGN_SYSTEM_HASH;
  const showsSources = hash === SOURCES_HASH;
  const showsPage = showsDesignSystem || showsSources;

  useEffect(() => {
    document.title = showsDesignSystem ? 'Marps – Système de design' : showsSources ? 'Marps – Sources et limites' : 'Marps';
  }, [showsDesignSystem, showsSources]);

  return (
    <div data-mobile-page={mobilePage} className={showsPage ? 'flex min-h-dvh flex-col' : 'planner-app flex min-h-dvh flex-col xl:h-dvh'}>
      {/* Bandeau Heure bleue : ses contrôles et son focus héritent de la palette nuit. */}
      <header className="dark relative z-20 flex flex-wrap items-center gap-x-3 gap-y-1 bg-header px-4 py-1.5 text-header-foreground">
        <a
          href={`#${CONTENT_ID}`}
          onClick={(event) => {
            // Le hash sert de route : on déplace le focus sans le modifier.
            event.preventDefault();
            document.getElementById(CONTENT_ID)?.focus();
          }}
          className="label-caps sr-only bg-card px-3 py-2 text-foreground focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
        >
          Aller au contenu
        </a>
        <BrandMark className="size-9" />
        <div className="mr-auto min-w-0">
          <h1 className="heading-display text-2xl leading-none font-extrabold tracking-[0.06em] uppercase [font-stretch:125%]">
            Marps
          </h1>
          <p className="mt-1 text-sm leading-tight text-header-foreground/75 max-sm:sr-only">
            Préparer une sortie scientifique à Jezero
          </p>
        </div>
        <nav aria-label="Pages" className="flex flex-wrap items-center max-sm:order-1 max-sm:w-full">
          <a href="#/" className={headerLink} aria-current={!showsPage ? 'page' : undefined}>Planification</a>
          <a href={SOURCES_HASH} className={headerLink} aria-current={showsSources ? 'page' : undefined}>Sources et limites</a>
          <a href={DESIGN_SYSTEM_HASH} className={headerLink} aria-current={showsDesignSystem ? 'page' : undefined}>Système de design</a>
        </nav>
        <OfflineStatus />
        {/* Filet d'horizon : il se trace de la braise au bleu à l'ouverture. */}
        <span aria-hidden="true" className="horizon-draw absolute inset-x-0 -bottom-0.5 h-0.5 bg-[image:var(--horizon)]" />
      </header>
      {!showsPage && <nav className="compact-navigation" aria-label="Écran de mission">
        <button type="button" aria-pressed={mobilePage === 'map'} onClick={() => setMobilePage('map')}>Carte</button>
        <button type="button" aria-pressed={mobilePage === 'mission'} onClick={() => setMobilePage('mission')}>Mission</button>
      </nav>}

      {showsSources ? (
        <main id={CONTENT_ID} tabIndex={-1} className="flex-1 outline-none">
          <SourcesPage />
        </main>
      ) : showsDesignSystem ? (
        <main id={CONTENT_ID} tabIndex={-1} className="flex-1 outline-none">
          <Suspense
            fallback={
              <div className="mx-auto max-w-3xl p-4">
                <DataState kind="loading" title="Chargement du système de design" />
              </div>
            }
          >
            <DesignSystemPage />
          </Suspense>
        </main>
      ) : (
        <main
          id={CONTENT_ID}
          tabIndex={-1}
          className="planner-main relative flex flex-1 flex-col gap-3 outline-none xl:grid xl:min-h-0 xl:grid-cols-[19rem_minmax(0,1fr)_21rem] xl:grid-rows-[minmax(0,1fr)] xl:p-3"
        >
          {/*
            La carte passe sous toute l'interface sur grand écran ; les colonnes laissent
            passer les clics vers elle, seuls les panneaux flottants les captent.
            #7 et #8 passeront ici la carte OpenLayers de la vue active.
          */}
          <MapStage map={<PlannerMap />} className="planner-map-stage relative flex h-[62dvh] min-h-[24rem] flex-col items-center justify-between gap-3 p-3 xl:pointer-events-none xl:static xl:col-start-2 xl:row-start-1 xl:h-auto xl:min-h-0 xl:p-0" />
          <div className="mission-panels relative z-10 flex min-h-0 flex-col gap-3 max-xl:px-3 xl:pointer-events-none xl:col-start-1 xl:row-start-1">
            <StepsPanel className={floatingPanel} />
          </div>
          <div className={`${view === 'global' ? 'hidden' : 'flex'} mission-panels relative z-10 min-h-0 flex-col gap-3 max-xl:px-3 max-xl:pb-3 xl:pointer-events-none xl:col-start-3 xl:row-start-1 xl:max-h-[calc(100%-10rem)] xl:overflow-y-auto`}>
            {/* #14 fournira le budget calculé par mission-core. */}
            <BudgetPanel budget={null} className={`${floatingPanel} shrink-0 [--power-delay:240ms]`} />
            {/* #9 fournira les fiches scientifiques. */}
            <SiteDetailsPanel className={`${floatingPanel} [--power-delay:360ms]`} />
          </div>
        </main>
      )}
    </div>
  );
}
