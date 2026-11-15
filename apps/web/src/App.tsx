import { lazy, Suspense, useCallback, useEffect, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { Route, Timer, MapPin, Layers, ChartNoAxesCombined, CloudSun, BookOpen } from 'lucide-react';
import { MapDrawer } from './panels/MapDrawer';
import { ConfirmHost } from './confirm';
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
  'label-caps inline-flex h-11 items-center gap-2 px-3 text-header-foreground/85 transition-colors hover:bg-accent hover:text-accent-foreground aria-[current=page]:bg-accent aria-[current=page]:text-mars aria-[current=page]:shadow-[inset_0_-2px_var(--mars)]';

/** Contenu interactif des volets superposés à la carte. */
const floatingPanel = 'pointer-events-auto';

type DrawerKey = 'steps' | 'layers' | 'profile' | 'budget' | 'site' | 'conditions';
const drawerSides: Record<DrawerKey, 'left' | 'right'> = { steps: 'left', layers: 'left', profile: 'left', budget: 'right', site: 'right', conditions: 'right' };
const drawerKeys = Object.keys(drawerSides) as DrawerKey[];
const allClosed: Record<DrawerKey, boolean> = { steps: false, layers: false, profile: false, budget: false, site: false, conditions: false };
const narrow = (query: string) => typeof window.matchMedia === 'function' && window.matchMedia(query).matches;

export function App() {
  // Le volet Mission s'ouvre d'emblée pour montrer par où commencer ; sur petit écran, la carte d'abord.
  const [openDrawers, setOpenDrawers] = useState(() => ({ ...allClosed, steps: !narrow('(max-width: 800px)') }));
  const { view, workspace } = usePlannerState();
  const dispatch = usePlannerDispatch();
  const [mapPanelHost, setMapPanelHost] = useState<HTMLDivElement | null>(null);
  /**
   * Ouvre ou ferme un volet. Sous 1280 px, un seul volet reste ouvert par côté, et un seul
   * en tout sous 800 px : la carte garde ainsi une largeur utile.
   */
  const setDrawer = useCallback((key: DrawerKey, open: boolean) => setOpenDrawers((current) => {
    if (!open) return { ...current, [key]: false };
    if (narrow('(max-width: 800px)')) return { ...allClosed, [key]: true };
    if (!narrow('(max-width: 1279px)')) return { ...current, [key]: true };
    const next = { ...current };
    for (const other of drawerKeys) if (drawerSides[other] === drawerSides[key]) next[other] = false;
    return { ...next, [key]: true };
  }), []);
  const openSiteDetails = useCallback(() => setDrawer('site', true), [setDrawer]);
  const hash = useHash();
  const showsDesignSystem = hash === DESIGN_SYSTEM_HASH;
  const showsSources = hash === SOURCES_HASH;
  const showsPage = showsDesignSystem || showsSources;
  const global = view === 'global';
  // Les volets masqués en vue globale ne comptent pas.
  const visible = (key: DrawerKey) => key === 'steps' || !global;
  const railState = (side: 'left' | 'right') => {
    const keys = drawerKeys.filter((key) => drawerSides[key] === side && visible(key));
    const opened = keys.filter((key) => openDrawers[key]).length;
    return { 'data-multi': opened > 1 ? '' : undefined, style: { '--closed-drawers': keys.length - opened } as CSSProperties };
  };
  const drawer = (key: DrawerKey) => ({ side: drawerSides[key], open: openDrawers[key], onOpenChange: (open: boolean) => setDrawer(key, open) });
  const chooseWorkspace = (next: 'base' | 'mission') => { dispatch({ type: 'workspaceChanged', workspace: next }); setDrawer('steps', true); };

  useEffect(() => {
    document.title = showsDesignSystem ? 'Marps – Système de design' : showsSources ? 'Marps – Sources et limites' : 'Marps';
  }, [showsDesignSystem, showsSources]);

  return (
    <div className={showsPage ? 'flex min-h-dvh flex-col' : 'planner-app flex min-h-dvh flex-col xl:h-dvh'}>
      {/* Bandeau Heure bleue : ses contrôles et son focus héritent de la palette nuit. */}
      <header className="dark relative z-20 flex items-center gap-x-3 bg-header px-4 py-1.5 text-header-foreground max-sm:gap-x-1 max-sm:px-2">
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
        {/* Le nom ramène à la planification : pas d'onglet « Planification » toujours actif. */}
        <a href="#/" aria-label="Marps, planification" aria-current={!showsPage ? 'page' : undefined} className="mr-auto flex min-w-0 items-center gap-3">
          <BrandMark className="size-9 shrink-0" />
          <div className="min-w-0">
            <h1 className="heading-display text-2xl leading-none font-extrabold tracking-[0.06em] uppercase [font-stretch:125%]">
              Marps
            </h1>
            <p className="mt-1 truncate text-sm leading-tight text-header-foreground/75 max-md:hidden">
              Préparer une sortie scientifique à Jezero
            </p>
          </div>
        </a>
        <nav aria-label="Navigation" className="flex shrink-0 items-center">
          {!showsPage && <div role="group" aria-label="Espaces de travail" className="workspace-navigation flex items-center">
            <button type="button" aria-pressed={workspace === 'base'} className={headerLink} onClick={() => chooseWorkspace('base')}><span><span className="max-sm:hidden">À la </span>base</span></button>
            <button type="button" aria-pressed={workspace === 'mission'} className={headerLink} onClick={() => chooseWorkspace('mission')}><span><span className="max-sm:hidden">En </span>mission</span></button>
          </div>}
          <a href={SOURCES_HASH} className={`${headerLink} sm:ml-3`} aria-current={showsSources ? 'page' : undefined} aria-label="Sources et limites" title="Sources et limites">
            <BookOpen aria-hidden="true" className="size-4" />
            <span className="max-md:sr-only">Sources</span>
          </a>
        </nav>
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
          <div className="map-view-switch glass"><MapViewSelector /></div>
          <div className="map-drawer-rails">
            <div className="map-drawer-rail map-drawer-rail-left" {...railState('left')}>
              <MapDrawer label={workspace === 'base' ? 'Mission' : 'Suivi de mission'} shortLabel={workspace === 'base' ? 'Mission' : 'Suivi'} icon={Route} {...drawer('steps')}>
                <StepsPanel className={floatingPanel} collapsible={false} />
              </MapDrawer>
              <div hidden={global} className="map-drawer-group">
                <MapDrawer label="Calques" shortLabel="Calques" icon={Layers} {...drawer('layers')}>
                  <div ref={setMapPanelHost} className="map-panel-dock" />
                </MapDrawer>
                <MapDrawer label="Profil du parcours" shortLabel="Profil" icon={ChartNoAxesCombined} {...drawer('profile')}>
                  <ProfilePanel className={floatingPanel} collapsible={false} />
                </MapDrawer>
              </div>
            </div>
            <div className="map-drawer-rail map-drawer-rail-right" hidden={global} {...railState('right')}>
              <MapDrawer label="Budget de temps" shortLabel="Budget" icon={Timer} {...drawer('budget')}>
                <BudgetPanel budget={null} className={floatingPanel} collapsible={false} />
              </MapDrawer>
              <MapDrawer label="Fiche de site" shortLabel="Site" icon={MapPin} {...drawer('site')}>
                <SiteDetailsPanel className={floatingPanel} collapsible={false} />
              </MapDrawer>
              <MapDrawer label="Conditions au rover" shortLabel="Conditions" icon={CloudSun} {...drawer('conditions')}>
                <ConditionsPanel className={floatingPanel} collapsible={false} />
              </MapDrawer>
            </div>
          </div>
          <ConfirmHost />
        </main>
        </RouteProfileProvider>
      )}
    </div>
  );
}
