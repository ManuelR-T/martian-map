import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { BrandMark, DataState, ThemeToggle } from '@marps/ui';
import { BudgetPanel } from './panels/BudgetPanel';
import { floatingSurface, MapStage } from './panels/MapStage';
import { SiteDetailsPanel } from './panels/SiteDetailsPanel';
const PlannerMap = lazy(() =>
  import('./features/map/PlannerMap').then((module) => ({
    default: module.PlannerMap,
  })),
);
import { OfflineStatus } from './offline/OfflineStatus';
import './responsive.css';
const Workspace = lazy(() =>
  import('./workspace/Workspace').then((module) => ({
    default: module.Workspace,
  })),
);
import { PrintMission } from './panels/MissionUtilities';
import { MapMissionActions } from './workspace/MapMissionActions';
import { StepsPanel } from './panels/StepsPanel';

const DesignSystemPage = lazy(() => import('./design-system/DesignSystemPage'));

const DESIGN_SYSTEM_HASH = '#/systeme-design';
const CONTENT_ID = 'contenu';

function subscribeToHash(listener: () => void) {
  window.addEventListener('hashchange', listener);
  return () => window.removeEventListener('hashchange', listener);
}

function useHash(): string {
  return useSyncExternalStore(subscribeToHash, () => window.location.hash);
}

const headerControl =
  'text-header-foreground/85 hover:bg-white/10 hover:text-header-foreground';
const headerLink = `label-caps inline-flex h-9 items-center px-3 transition-colors ${headerControl}`;

export function App() {
  const mainRef = useRef<HTMLElement>(null);
  const [mobilePage, setMobilePage] = useState<'map' | 'mission'>('map');
  const route = useHash();
  const showsWorkspace = [
    '#/missions',
    '#/nouvelle',
    '#/mission',
    '#/historique',
    '#/sources',
  ].includes(route);
  const showsDesignSystem = route === DESIGN_SYSTEM_HASH;

  useEffect(() => {
    document.title = showsDesignSystem ? 'Marps – Système de design' : 'Marps';
  }, [showsDesignSystem, showsWorkspace]);

  useEffect(() => {
    const main = mainRef.current;
    const steps =
      main?.querySelector('.mission-plan-actions') ??
      main?.querySelector('.mission-steps');
    if (!main || !steps) return;
    const positionStatus = () => {
      main.style.setProperty(
        '--steps-panel-bottom',
        `${steps.getBoundingClientRect().bottom - main.getBoundingClientRect().top + 12}px`,
      );
    };
    const observer = new ResizeObserver(positionStatus);
    observer.observe(steps);
    const stepList = main.querySelector('.mission-steps');
    if (stepList && stepList !== steps) observer.observe(stepList);
    observer.observe(main);
    positionStatus();
    return () => observer.disconnect();
  }, [showsDesignSystem, showsWorkspace]);

  return (
    <div
      data-mobile-page={mobilePage}
      className={
        showsDesignSystem || showsWorkspace
          ? 'app-shell mission-app flex min-h-dvh flex-col'
          : 'app-shell planner-app flex min-h-dvh flex-col xl:h-dvh'
      }
    >
      {/* Bandeau marine souligné d'un filet rouille ; le focus y passe au blanc pour rester visible. */}
      <header className="relative z-20 flex flex-wrap items-center gap-x-3 gap-y-2 border-b-2 border-mars bg-header px-4 py-2 text-header-foreground [--ring:var(--header-foreground)]">
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
        <BrandMark className="size-7" />
        <div className="mr-auto min-w-0">
          <h1 className="heading-display text-xl font-extrabold tracking-[0.04em] uppercase [font-stretch:125%]">
            Marps
          </h1>
          <p className="text-sm text-header-foreground/75 max-sm:sr-only">
            Préparer une sortie scientifique à Jezero
          </p>
        </div>
        <nav aria-label="Pages">
          <a
            href="#/"
            className={headerLink}
            aria-current={
              !showsWorkspace && !showsDesignSystem ? 'page' : undefined
            }
          >
            Carte
          </a>
          <a
            href="#/missions"
            className={headerLink}
            aria-current={
              showsWorkspace && route !== '#/historique' ? 'page' : undefined
            }
          >
            Mes missions
          </a>
          <a
            href="#/historique"
            className={headerLink}
            aria-current={route === '#/historique' ? 'page' : undefined}
          >
            Historique
          </a>
        </nav>
        <ThemeToggle className={headerControl} />
      </header>
      <OfflineStatus />
      {!showsDesignSystem && !showsWorkspace && (
        <nav className="compact-navigation" aria-label="Écran de mission">
          <button
            type="button"
            aria-pressed={mobilePage === 'map'}
            onClick={() => setMobilePage('map')}
          >
            Carte
          </button>
          <button
            type="button"
            aria-pressed={mobilePage === 'mission'}
            onClick={() => setMobilePage('mission')}
          >
            Mission
          </button>
          <a
            href="#/missions"
            className="inline-flex items-center justify-center border px-3 text-sm"
          >
            Mes missions
          </a>
        </nav>
      )}

      {showsDesignSystem ? (
        <main id={CONTENT_ID} tabIndex={-1} className="flex-1 outline-none">
          <Suspense
            fallback={
              <div className="mx-auto max-w-3xl p-4">
                <DataState
                  kind="loading"
                  title="Chargement du système de design"
                />
              </div>
            }
          >
            <DesignSystemPage />
          </Suspense>
        </main>
      ) : showsWorkspace ? (
        <Suspense
          fallback={
            <p role="status" className="p-4">
              Chargement des missions…
            </p>
          }
        >
          <Workspace route={route} />
        </Suspense>
      ) : (
        <main
          ref={mainRef}
          id={CONTENT_ID}
          tabIndex={-1}
          className="planner-main relative flex flex-1 flex-col gap-3 outline-none xl:grid xl:min-h-0 xl:grid-cols-[19rem_minmax(0,1fr)_21rem] xl:grid-rows-[minmax(0,1fr)] xl:p-3"
        >
          {/*
            La carte passe sous toute l'interface sur grand écran ; les colonnes laissent
            passer les clics vers elle, seuls les panneaux flottants les captent.
            #7 et #8 passeront ici la carte OpenLayers de la vue active.
          */}
          <MapStage
            map={
              <Suspense
                fallback={
                  <DataState kind="loading" title="Chargement de la carte" />
                }
              >
                <PlannerMap />
              </Suspense>
            }
            className="planner-map-stage relative flex h-[62dvh] min-h-[24rem] flex-col items-center justify-between gap-3 p-3 xl:pointer-events-none xl:static xl:col-start-2 xl:row-start-1 xl:h-auto xl:min-h-0 xl:p-0"
          />
          <div className="mission-panels mission-plan-stack relative z-10 flex min-h-0 flex-col gap-3 max-xl:px-3 xl:pointer-events-none xl:col-start-1 xl:row-start-1">
            <StepsPanel className={`${floatingSurface} mission-steps`} />
            <MapMissionActions className={floatingSurface} />
            <div className="compact-settings">
              <a href={DESIGN_SYSTEM_HASH}>Système de design</a>
              <ThemeToggle />
            </div>
          </div>
          <div className="mission-panels relative z-10 flex min-h-0 flex-col gap-3 max-xl:px-3 max-xl:pb-3 xl:pointer-events-none xl:col-start-3 xl:row-start-1 xl:max-h-[calc(100%-10rem)] xl:overflow-y-auto">
            {/* #14 fournira le budget calculé par mission-core. */}
            <BudgetPanel className={`${floatingSurface} shrink-0`} />
            <SiteDetailsPanel className={floatingSurface} />
          </div>
        </main>
      )}
      <PrintMission />
    </div>
  );
}
