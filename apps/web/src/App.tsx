import { lazy, Suspense, useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { Route, Timer, MapPin, Layers, ChartNoAxesCombined, CloudSun } from 'lucide-react';
import { MapDrawer } from './panels/MapDrawer';
import { BrandMark, DataState } from '@marps/ui';
import { BudgetPanel } from './panels/BudgetPanel';
import { MapStage } from './panels/MapStage';
import { MapViewSelector } from './panels/MapViewSelector';
import { ConditionsPanel } from './panels/ConditionsPanel';
import { ProfilePanel } from './terrain/ProfilePanel';
import { RouteProfileProvider } from './terrain/RouteProfileProvider';
import { SiteDetailsPanel } from './panels/SiteDetailsPanel';
import { PlannerMap } from './features/map/PlannerMap';
import { OfflineStatus } from './offline/OfflineStatus';
import './responsive.css';
import { SourcesPage } from './panels/Provenance';
import { StepsPanel } from './panels/StepsPanel';
import { usePlannerDispatch, usePlannerState } from './state/PlannerProvider';

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
  'label-caps inline-flex h-11 items-center px-3 text-header-foreground/85 transition-colors hover:bg-accent hover:text-accent-foreground aria-[current=page]:bg-accent aria-[current=page]:text-mars aria-[current=page]:shadow-[inset_0_-2px_var(--mars)]';

/** Contenu interactif des volets superposés à la carte. */
const floatingPanel = 'pointer-events-auto';

export function App() {
  const [openDrawers, setOpenDrawers] = useState({ steps: false, budget: false, site: false, layers: false, profile: false, conditions: false });
  const { view, workspace } = usePlannerState();
  const dispatch = usePlannerDispatch();
  const [mapPanelHost, setMapPanelHost] = useState<HTMLDivElement | null>(null);
  const openSiteDetails = useCallback(() => setOpenDrawers((current) => ({ ...current, site: true })), []);
  const hash = useHash();
  const showsDesignSystem = hash === DESIGN_SYSTEM_HASH;
  const showsSources = hash === SOURCES_HASH;
  const showsPage = showsDesignSystem || showsSources;

  useEffect(() => {
    document.title = showsDesignSystem ? 'Marps – Système de design' : showsSources ? 'Marps – Sources et limites' : 'Marps';
  }, [showsDesignSystem, showsSources]);

  return (
    <div className={showsPage ? 'flex min-h-dvh flex-col' : 'planner-app flex min-h-dvh flex-col xl:h-dvh'}>
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
          <div className="planning-navigation">
            <a href="#/" className={headerLink} aria-current={!showsPage ? 'page' : undefined}>Planification</a>
            {!showsPage && <MapViewSelector />}
          </div>
          <a href={SOURCES_HASH} className={headerLink} aria-current={showsSources ? 'page' : undefined}>Sources et limites</a>
          <a href={DESIGN_SYSTEM_HASH} className={headerLink} aria-current={showsDesignSystem ? 'page' : undefined}>Système de design</a>
        </nav>
        {!showsPage && <nav aria-label="Espaces de travail" className="workspace-navigation flex flex-wrap items-center">
          <button type="button" aria-pressed={workspace === 'base'} className={headerLink} onClick={() => { dispatch({ type: 'workspaceChanged', workspace: 'base' }); setOpenDrawers((current) => ({ ...current, steps: true })); }}>À la base</button>
          <button type="button" aria-pressed={workspace === 'mission'} className={headerLink} onClick={() => { dispatch({ type: 'workspaceChanged', workspace: 'mission' }); setOpenDrawers((current) => ({ ...current, steps: true })); }}>En mission</button>
        </nav>}
        <OfflineStatus />
        {/* Filet d'horizon : il se trace du bleu à la braise à l'ouverture. */}
        <span aria-hidden="true" className="horizon-draw absolute inset-x-0 -bottom-0.5 h-0.5 bg-[image:var(--horizon)]" />
      </header>

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
        <RouteProfileProvider>
        <main
          id={CONTENT_ID}
          tabIndex={-1}
          className="planner-main relative min-h-0 flex-1 outline-none"
        >
          <MapStage map={<PlannerMap panelHost={mapPanelHost} onSiteSelected={openSiteDetails} />} className="planner-map-stage relative flex h-full min-h-0 flex-col items-center justify-between p-3" />
          <div className="map-drawer-rails">
            <div className="map-drawer-rail map-drawer-rail-left">
              <MapDrawer label={workspace === 'base' ? 'Préparer une mission' : 'Suivi de mission'} icon={Route} side="left" open={openDrawers.steps} onOpenChange={(open) => setOpenDrawers((current) => ({ ...current, steps: open }))}>
                <StepsPanel className={floatingPanel} collapsible={false} />
              </MapDrawer>
              <div hidden={view === 'global'} className="map-drawer-group">
                <MapDrawer label="Calques de la carte" icon={Layers} side="left" open={openDrawers.layers} onOpenChange={(open) => setOpenDrawers((current) => ({ ...current, layers: open }))}>
                  <div ref={setMapPanelHost} className="map-panel-dock" />
                </MapDrawer>
                <MapDrawer label="Profil du parcours" icon={ChartNoAxesCombined} side="left" open={openDrawers.profile} onOpenChange={(open) => setOpenDrawers((current) => ({ ...current, profile: open }))}>
                  <ProfilePanel className={floatingPanel} collapsible={false} />
                </MapDrawer>
              </div>
            </div>
            <div className="map-drawer-rail map-drawer-rail-right" hidden={view === 'global'}>
              <MapDrawer label="Budget de temps" icon={Timer} side="right" open={openDrawers.budget} onOpenChange={(open) => setOpenDrawers((current) => ({ ...current, budget: open }))}>
                <BudgetPanel budget={null} className={floatingPanel} collapsible={false} />
              </MapDrawer>
              <MapDrawer label="Fiche de site" icon={MapPin} side="right" open={openDrawers.site} onOpenChange={(open) => setOpenDrawers((current) => ({ ...current, site: open }))}>
                <SiteDetailsPanel className={floatingPanel} collapsible={false} />
              </MapDrawer>
              <MapDrawer label="Conditions au rover" icon={CloudSun} side="right" open={openDrawers.conditions} onOpenChange={(open) => setOpenDrawers((current) => ({ ...current, conditions: open }))}>
                <ConditionsPanel className={floatingPanel} collapsible={false} />
              </MapDrawer>
            </div>
          </div>
        </main>
        </RouteProfileProvider>
      )}
    </div>
  );
}
