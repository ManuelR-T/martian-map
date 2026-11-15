import { useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Check, FlaskConical, TriangleAlert, Undo2 } from 'lucide-react';
import { calculateMissionBudget, missionProgress, radiationReturn, type Mission, type MissionProgress } from '@marps/mission-core';
import { localize } from '@marps/ui';
import '../i18n';
import { formatGroundDistance } from '../format';
import { activityLabels } from '../panels/MissionEditor';
import { formatBudgetMinutes, toBudgetView } from '../panels/budgetView';
import { usePlannerDispatch, usePlannerState } from '../state/PlannerProvider';
import { useRouteProfile } from '../terrain/RouteProfileProvider';

const shell = 'dark flex h-dvh min-h-0 flex-col gap-[clamp(0.5rem,2vh,1.25rem)] overflow-y-auto bg-header p-[clamp(0.75rem,2.5vw,2rem)] text-header-foreground';
const backLink = 'label-caps inline-flex min-h-14 shrink-0 items-center gap-2 border border-header-foreground/40 px-4 hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';
const hudButton = 'label-caps inline-flex min-h-16 cursor-pointer items-center justify-center gap-3 border px-5 text-base focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring';
const caption = 'label-caps text-header-foreground/75';

function BackLink() {
  return <a href="#/" className={backLink}><ArrowLeft aria-hidden="true" className="size-5" />{localize("Planificateur")}</a>;
}

/** Loading, failure or no walk: one line and the way back. */
function Notice({ title, children }: { title: string; children?: ReactNode }) {
  return <main className={shell}>
    <div className="flex justify-end"><BackLink /></div>
    <div role="status" className="m-auto grid max-w-2xl gap-3 text-center">
      <p className="heading-display text-[clamp(1.5rem,5vw,3rem)] uppercase">{localize(title)}</p>
      {children && <p className="text-lg text-header-foreground/75">{children}</p>}
    </div>
  </main>;
}

function Readout({ label, value, detail, tone }: { label: string; value: string; detail?: string; tone?: 'danger' }) {
  return <div className={`grid content-start gap-1 border-t-2 pt-2 ${tone ? 'border-danger-border' : 'border-header-foreground/40'}`}>
    <dt className={caption}>{localize(label)}</dt>
    <dd className={`numeral-display text-[clamp(1.5rem,4.5vw,3.25rem)] leading-none tabular-nums ${tone ? 'text-danger' : ''}`}>{value}</dd>
    {detail && <dd className="text-sm text-header-foreground/75">{detail}</dd>}
  </div>;
}

function HudAlert({ tone, title, children }: { tone: 'danger' | 'warning'; title: string; children: ReactNode }) {
  return <li className={`flex items-start gap-3 border-2 px-3 py-2 ${tone === 'danger' ? 'border-danger-border bg-danger-surface text-danger' : 'border-warning-border bg-warning-surface text-warning'}`}>
    <TriangleAlert aria-hidden="true" className="mt-0.5 size-6 shrink-0" />
    <p className="text-lg leading-snug"><strong className="uppercase">{localize(title)}</strong> <span className="text-header-foreground">{children}</span></p>
  </li>;
}

/**
 * Helmet view (#30): one stop and one activity at a time, read from the running mission that the
 * tracking panel and the budget use. Progress is manual, by the teammate in the habitat or by a
 * large touch target: the app knows no real position on Mars.
 */
export function HelmetView() {
  useTranslation();
  const { runningMission: mission, workspace, trackingReady, trackingError, catalog } = usePlannerState();
  const dispatch = usePlannerDispatch();
  // Opened directly (reload, shared link): ticking is only accepted in the « En mission » workspace.
  useEffect(() => {
    if (mission && workspace !== 'mission') dispatch({ type: 'workspaceChanged', workspace: 'mission' });
  }, [mission, workspace, dispatch]);
  const progress = missionProgress(mission);
  if (trackingError) return <Notice title="Suivi local indisponible">{localize(trackingError)}</Notice>;
  if (catalog.status === 'error') return <Notice title="Données indisponibles">{localize("Le catalogue de données n'a pas pu être chargé.")}</Notice>;
  if (!trackingReady) return <Notice title="Chargement du suivi" />;
  if (!mission || !progress) return <Notice title="Aucune sortie en cours">{localize("Préparez une mission à la base, puis démarrez une sortie.")}</Notice>;
  return <Hud mission={mission} progress={progress} />;
}

function Hud({ mission, progress }: { mission: Mission; progress: MissionProgress }) {
  const { radiationAlert } = usePlannerState();
  const dispatch = usePlannerDispatch();
  const { relief, threshold } = useRouteProfile();
  const budget = calculateMissionBudget(mission);
  const { step, activity, nextStep } = progress;
  const radiation = radiationAlert?.missionId === mission.id ? radiationAlert.alert : null;
  const lastDone = mission.steps.flatMap(s => s.activities.map(a => ({ stepId: s.id, activity: a }))).filter(entry => entry.activity.completed).at(-1);
  const toggle = (stepId: string, activityId: string) => dispatch({ type: 'activityToggled', stepId, activityId });
  const walkMinutes = (metres: number) => formatBudgetMinutes(Math.ceil(metres / mission.parameters.speedMetresPerSecond / 60));
  // Same margin object as the budget panel: the two views cannot disagree.
  const margin = budget.status === 'ready' ? toBudgetView(budget).margin : null;
  const steepAhead = relief?.status === 'ready' ? relief.steep.filter(portion => portion.endMetres > progress.travelledMetres) : null;

  return <main className={shell}>
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="grid gap-1">
        <p className="label-caps inline-flex w-fit items-center gap-2 border border-dashed border-warning-border bg-warning-surface px-2 py-1 text-warning">
          <FlaskConical aria-hidden="true" className="size-4" />{localize("Simulé · suivi manuel")}
        </p>
        <p className={caption}>{localize("Arrêt")} {localize(progress.stepIndex + 1)}/{localize(mission.steps.length)}</p>
      </div>
      <BackLink />
    </header>

    <section aria-live="polite" className="grid gap-[clamp(0.25rem,1.5vh,0.75rem)]">
      <h1 className="heading-display text-[clamp(2rem,7vw,5rem)] uppercase [overflow-wrap:anywhere]">{localize(step.name)}</h1>
      <p className={caption}>
        {progress.finished ? localize("Activités terminées") : <>{localize("Activité")} {localize(progress.activityIndex + 1)}/{localize(step.activities.length)}</>}
      </p>
      <p className="heading-display text-[clamp(1.75rem,5.5vw,4rem)] text-mars">
        {activity ? <>{localize(activityLabels[activity.type])} · {formatBudgetMinutes(activity.durationMinutes)}</> : localize("Retour au camp")}
      </p>
    </section>

    <div className="flex flex-wrap gap-3">
      {activity && <button type="button" autoFocus className={`${hudButton} min-w-[min(100%,20rem)] flex-1 border-mars bg-mars text-mars-foreground hover:brightness-110`} onClick={() => toggle(step.id, activity.id)}>
        <Check aria-hidden="true" className="size-7" />{localize("Activité faite")}
      </button>}
      {lastDone && <button type="button" className={`${hudButton} border-header-foreground/40 hover:bg-accent`} onClick={() => toggle(lastDone.stepId, lastDone.activity.id)}>
        <Undo2 aria-hidden="true" className="size-6" />{localize("Annuler la dernière")}
      </button>}
    </div>

    <dl className="grid grid-cols-3 gap-[clamp(0.5rem,2vw,1.5rem)] max-sm:grid-cols-1">
      <Readout label="Ensuite" value={nextStep ? localize(nextStep.name) : localize("Camp")}
        detail={`${formatGroundDistance(progress.nextLegMetres)} · ${walkMinutes(progress.nextLegMetres)}`} />
      <Readout label="Reste prévu" value={formatBudgetMinutes(Math.ceil(progress.remainingMinutes))}
        detail={localize("{{v0}}/{{v1}} activités faites", { v0: progress.completedActivities, v1: progress.totalActivities })} />
      <Readout label="Marge du plan" value={margin?.value ?? '—'} tone={margin?.status === 'over' ? 'danger' : undefined}
        detail={margin ? localize("Réserve {{v0}}", { v0: budget.status === 'ready' ? formatBudgetMinutes(budget.reserveMinutes) : '' }) : localize("Budget non calculable")} />
    </dl>

    <section aria-label={localize("Alertes")} className="grid gap-2">
      <ul role="alert" className="m-0 grid list-none gap-2 p-0">
        {radiation && <HudAlert tone="danger" title="Simulation · Alerte radiation">
          {localize("Rentrer au camp maintenant")} · {formatGroundDistance(radiation.distanceMetres)} · {formatBudgetMinutes(Math.ceil(radiation.returnSeconds / 60))}
        </HudAlert>}
        {margin?.status === 'over' && <HudAlert tone="danger" title="Budget">{margin.message}</HudAlert>}
        {steepAhead && steepAhead.length > 0 && <HudAlert tone="warning" title="Pente">
          {localize("{{v0}} passage{{v1}} au-delà de {{v2}}° à venir, jusqu’à {{v3}}°", { v0: steepAhead.length, v1: steepAhead.length > 1 ? 's' : '', v2: threshold, v3: Math.round(Math.max(...steepAhead.map(portion => portion.maxSlopeDegrees))) })}
        </HudAlert>}
      </ul>
      <p className="text-header-foreground/75">
        {!radiation && margin?.status !== 'over' && !steepAhead?.length && <>{localize("Aucune alerte.")} </>}
        {!steepAhead && <>{localize("Pentes non vérifiées : relief indisponible.")} </>}
      </p>
      <button type="button" className={`${hudButton} min-h-12 justify-self-start border-header-foreground/40 text-sm hover:bg-accent`}
        onClick={() => { const alert = radiation ? null : radiationReturn(mission); dispatch({ type: 'radiationAlertChanged', alert: alert && { missionId: mission.id, alert } }); }}>
        {radiation ? localize("Annuler la simulation") : localize("Simuler une alerte radiation")}
      </button>
    </section>

    <footer className="mt-auto text-sm text-header-foreground/75">
      {localize("Aucune localisation réelle : l’arrêt en cours est le premier dont une activité reste à cocher. Durées et distances du plan, sans temps écoulé mesuré. Pentes selon le seuil choisi, une hypothèse ; aucune mesure de radiation à Jezero. Ce n’est pas une aide à la navigation.")}
    </footer>
  </main>;
}
