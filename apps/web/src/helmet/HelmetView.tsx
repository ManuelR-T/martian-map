import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Check, FlaskConical, Maximize, TriangleAlert, Undo2 } from 'lucide-react';
import { findSiteSheet, type SiteSheet } from '@marps/data';
import { calculateMissionBudget, missionProgress, radiationReturn, type CalculatedMissionBudget, type Mission, type MissionProgress } from '@marps/mission-core';
import { localize } from '@marps/ui';
import '../i18n';
import { formatGroundDistance } from '../format';
import { activityLabels } from '../panels/MissionEditor';
import { formatBudgetMinutes, toBudgetView } from '../panels/budgetView';
import { siteWorkOf } from '../sites/siteWork';
import { usePlannerDispatch, usePlannerState } from '../state/PlannerProvider';
import { useRouteProfile } from '../terrain/RouteProfileProvider';

const shell = 'dark flex h-dvh min-h-0 flex-col gap-[clamp(0.5rem,1.8vh,1.25rem)] overflow-y-auto bg-header p-[clamp(0.75rem,2vw,1.75rem)] text-header-foreground';
const focus = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';
const tool = `label-caps inline-flex min-h-12 shrink-0 cursor-pointer items-center gap-2 border border-header-foreground/35 px-3 hover:bg-accent ${focus}`;
const caption = 'label-caps text-header-foreground/70';
const quiet = 'text-header-foreground/70';
const zone = 'grid content-start gap-3 border-t-2 border-header-foreground/25 pt-3';

function BackLink() {
  return <a href="#/" className={tool}><ArrowLeft aria-hidden="true" className="size-5" />{localize("Planificateur")}</a>;
}

/** Loading, failure or no walk: one line and the way back. */
function Notice({ title, children }: { title: string; children?: ReactNode }) {
  return <main className={shell}>
    <div className="flex justify-end"><BackLink /></div>
    <div role="status" className="m-auto grid max-w-2xl gap-3 text-center">
      <p className="heading-display text-[clamp(1.5rem,5vw,3rem)]">{localize(title)}</p>
      {children && <p className={`text-lg ${quiet}`}>{children}</p>}
    </div>
  </main>;
}

/**
 * Helmet view (#30): one stop at a time, read from the running mission that the tracking panel
 * and the budget use. Progress is manual, by the teammate in the habitat or by a large touch
 * target: the app knows no real position on Mars.
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

/** Camp → stops → camp, in plan order: a schematic of the sequence, never a position. */
function RouteStrip({ mission, progress }: { mission: Mission; progress: MissionProgress }) {
  const camp = mission.camp!.name;
  const nodes = [
    { key: 'start', label: camp, mark: 'C', state: 'done' },
    ...mission.steps.map((step, index) => ({ key: step.id, label: step.name, mark: String(index + 1),
      state: index < progress.stepIndex || progress.finished ? 'done' : index === progress.stepIndex ? 'current' : 'todo' })),
    { key: 'end', label: camp, mark: 'C', state: progress.finished ? 'current' : 'todo' },
  ];
  return <ol aria-label={localize("Parcours de la sortie en cours")} className="m-0 flex list-none items-start p-0">
    {nodes.map((node, index) => <li key={node.key} aria-current={node.state === 'current' ? 'step' : undefined} className={index ? 'flex min-w-0 flex-1 items-start' : 'flex items-start'}>
      {index > 0 && <span className={`relative mt-[1.0625rem] min-w-3 flex-1 border-t-2 ${index <= progress.stepIndex ? 'border-primary' : 'border-dashed border-header-foreground/35'}`}>
        <span className={`absolute top-1 left-1/2 -translate-x-1/2 text-xs whitespace-nowrap tabular-nums max-md:hidden ${quiet}`}>{formatGroundDistance(progress.legsMetres[index - 1]!)}</span>
      </span>}
      <span className="grid w-[clamp(2.25rem,10vw,8rem)] justify-items-center gap-1">
        <span className={`numeral-display grid size-9 place-items-center rounded-full border-2 text-sm ${node.state === 'done' ? 'border-primary bg-primary text-primary-foreground' : node.state === 'current' ? 'border-mars bg-mars text-mars-foreground shadow-ember' : 'border-header-foreground/45'}`}>
          {node.state === 'done' ? <Check aria-hidden="true" className="size-5" /> : node.mark}
        </span>
        <span className={`max-w-full truncate text-xs max-sm:sr-only ${node.state === 'current' ? 'font-bold text-mars' : quiet}`}>{localize(node.label)}</span>
      </span>
    </li>)}
  </ol>;
}

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

/** Time on this screen since the activity came up; mounted per activity, never saved. */
function ActivityClock({ plannedMinutes }: { plannedMinutes: number }) {
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(startedAt);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const seconds = Math.max(0, Math.floor((now - startedAt) / 1000));
  const over = seconds > plannedMinutes * 60;
  return <span role="timer" aria-label={localize("Chrono de l’activité")} className={`numeral-display text-[clamp(1.25rem,2.6vw,2rem)] ${over ? 'text-danger' : ''}`}>{clock(seconds)}</span>;
}

/** Available time as one bar: plan behind, plan ahead, reserve, then the margin left empty. */
function BudgetBar({ budget, remainingMinutes }: { budget: CalculatedMissionBudget; remainingMinutes: number }) {
  const behind = Math.max(0, budget.missionMinutes - remainingMinutes);
  const total = Math.max(budget.availableMinutes, budget.missionMinutes + budget.reserveMinutes) || 1;
  const width = (minutes: number) => ({ width: `${(100 * minutes) / total}%` });
  return <div className="grid gap-1.5">
    <div aria-hidden="true" className="relative flex h-4 border border-header-foreground/35">
      <span className="bg-primary/55" style={width(behind)} />
      <span className="bg-mars" style={width(remainingMinutes)} />
      <span className="bg-[repeating-linear-gradient(135deg,var(--warning)_0_3px,transparent_3px_7px)]" style={width(budget.reserveMinutes)} />
      {budget.overBudget && <span className="absolute -inset-y-1.5 w-0.5 bg-danger" style={{ left: `${(100 * budget.availableMinutes) / total}%` }} />}
    </div>
    <p className={`flex flex-wrap gap-x-4 text-xs ${quiet}`}>
      <span><i className="mr-1.5 inline-block size-2.5 bg-primary/55" />{localize("Derrière vous")}</span>
      <span><i className="mr-1.5 inline-block size-2.5 bg-mars" />{localize("Reste prévu")}</span>
      <span><i className="mr-1.5 inline-block size-2.5 bg-[repeating-linear-gradient(135deg,var(--warning)_0_3px,transparent_3px_7px)]" />{localize("Réserve {{v0}}", { v0: formatBudgetMinutes(budget.reserveMinutes) })}</span>
      <span className="ml-auto tabular-nums">{localize("Disponible {{v0}}", { v0: formatBudgetMinutes(budget.availableMinutes) })}</span>
    </p>
  </div>;
}

function Readout({ label, value, detail, tone }: { label: string; value: string; detail?: string; tone?: 'danger' }) {
  return <div className="grid min-w-0 content-start gap-1">
    <dt className={caption}>{localize(label)}</dt>
    <dd className={`numeral-display text-[clamp(1.5rem,3.6vw,2.75rem)] [overflow-wrap:anywhere] ${tone ? 'text-danger' : ''}`}>{value}</dd>
    {detail && <dd className={`text-sm tabular-nums ${quiet}`}>{detail}</dd>}
  </div>;
}

function HudAlert({ tone, title, children }: { tone: 'danger' | 'warning'; title: string; children: ReactNode }) {
  return <li className={`flex items-center gap-3 border-2 px-4 py-2 ${tone === 'danger' ? 'border-danger-border bg-danger-surface text-danger' : 'border-warning-border bg-warning-surface text-warning'}`}>
    <TriangleAlert aria-hidden="true" className="size-7 shrink-0" />
    <p className="text-[clamp(1rem,2.2vw,1.5rem)] leading-snug"><strong>{localize(title)}</strong> <span className="text-header-foreground">{children}</span></p>
  </li>;
}

const row = `flex min-h-14 w-full cursor-pointer items-center gap-3 border px-3 text-left ${focus}`;
const tick = (done: boolean) => <span className={`grid size-7 shrink-0 place-items-center border-2 ${done ? 'border-primary bg-primary text-primary-foreground' : 'border-header-foreground/60'}`}>{done && <Check aria-hidden="true" className="size-5" />}</span>;

/** What the site sheet (#9) says about the stop: the target to spot, what to bring back, how to work. */
function SiteBrief({ sheet, mission }: { sheet: SiteSheet; mission: Mission }) {
  const dispatch = usePlannerDispatch();
  const done = siteWorkOf(mission.siteWork, sheet).doneTaskIds;
  const upNext = sheet.tasks.find(task => !done.includes(task.id));
  return <section aria-label={localize("Fiche de site")} className={zone}>
    <figure className="m-0 flex items-start gap-3">
      <img src={`${import.meta.env.BASE_URL}${sheet.photo.path}`} alt="" width={sheet.photo.width} height={sheet.photo.height} className="h-auto w-[clamp(6rem,14vw,11rem)] shrink-0 border border-header-foreground/35" />
      <figcaption className="grid gap-1">
        <span className={caption}>{localize("À repérer sur place")}</span>
        <span className="leading-snug">{localize(sheet.photo.caption)}</span>
      </figcaption>
    </figure>
    <p className="leading-snug"><span className={caption}>{localize("À rapporter")} </span>{localize(sheet.objective)}</p>
    <p className={`text-sm ${quiet}`}>{localize("Déjà fait par le rover :")} {localize(sheet.roverWork.text)}</p>
    <ul aria-label={localize("Tâches")} className="m-0 grid list-none gap-1.5 p-0">
      {sheet.tasks.map(task => {
        const checked = done.includes(task.id);
        return <li key={task.id}>
          <button type="button" aria-pressed={checked} className={`${row} min-h-12 ${task === upNext ? 'border-header-foreground/60' : 'border-header-foreground/20'} hover:bg-accent`}
            onClick={() => dispatch({ type: 'siteTaskToggled', sheet, taskId: task.id })}>
            {tick(checked)}
            <span className={`grid min-w-0 flex-1 ${checked ? `${quiet} line-through` : ''}`}>
              <span>{localize(task.label)}</span>
              {task === upNext && <span className={`text-sm ${quiet}`}>{localize(task.detail)}</span>}
            </span>
          </button>
        </li>;
      })}
    </ul>
  </section>;
}

function Hud({ mission, progress }: { mission: Mission; progress: MissionProgress }) {
  const { radiationAlert } = usePlannerState();
  const dispatch = usePlannerDispatch();
  const { relief, threshold } = useRouteProfile();
  const budget = calculateMissionBudget(mission);
  const { step, activity, nextStep } = progress;
  const sheet = step.siteId ? findSiteSheet(step.siteId) : undefined;
  const radiation = radiationAlert?.missionId === mission.id ? radiationAlert.alert : null;
  const campDirect = radiationReturn(mission);
  const lastDone = mission.steps.flatMap(s => s.activities.map(a => ({ stepId: s.id, activityId: a.id, completed: a.completed }))).filter(entry => entry.completed).at(-1);
  const walkMinutes = (metres: number) => formatBudgetMinutes(Math.ceil(metres / mission.parameters.speedMetresPerSecond / 60));
  // Same margin object as the budget panel: the two views cannot disagree.
  const margin = budget.status === 'ready' ? toBudgetView(budget).margin : null;
  const steepAhead = relief?.status === 'ready' ? relief.steep.filter(portion => portion.endMetres > progress.travelledMetres) : null;
  const currentKey = activity ? `${step.id}/${activity.id}` : null;
  const undoKey = lastDone ? `${lastDone.stepId}/${lastDone.activityId}` : null;

  // The teammate in the habitat drives the view from a keyboard, wherever the focus is.
  useEffect(() => {
    const toggle = (key: string) => { const [stepId, activityId] = key.split('/'); dispatch({ type: 'activityToggled', stepId: stepId!, activityId: activityId! }); };
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.target instanceof Element && event.target.closest('button, a, input, select, textarea')) return;
      if ((event.key === ' ' || event.key === 'Enter') && currentKey) { event.preventDefault(); toggle(currentKey); }
      if (event.key === 'Backspace' && undoKey) { event.preventDefault(); toggle(undoKey); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [currentKey, undoKey, dispatch]);

  return <main className={shell}>
    <header className="flex flex-wrap items-center gap-3">
      <p className="label-caps inline-flex items-center gap-2 border border-dashed border-warning-border bg-warning-surface px-2 py-1 text-warning">
        <FlaskConical aria-hidden="true" className="size-4" />{localize("Simulé · suivi manuel")}
      </p>
      <p className={`mr-auto min-w-0 truncate ${quiet}`}>{localize(mission.name)}</p>
      {document.fullscreenEnabled && <button type="button" className={tool} onClick={() => { void (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()); }}>
        <Maximize aria-hidden="true" className="size-5" /><span className="max-sm:sr-only">{localize("Plein écran")}</span>
      </button>}
      <BackLink />
    </header>

    <RouteStrip mission={mission} progress={progress} />

    <ul role="alert" className="m-0 grid list-none gap-2 p-0 empty:hidden">
      {radiation && <HudAlert tone="danger" title="Simulation · Alerte radiation">
        {localize("Rentrer au camp maintenant")} · {formatGroundDistance(radiation.distanceMetres)} · {formatBudgetMinutes(Math.ceil(radiation.returnSeconds / 60))}
      </HudAlert>}
      {margin?.status === 'over' && <HudAlert tone="danger" title="Budget">{margin.message}</HudAlert>}
      {steepAhead && steepAhead.length > 0 && <HudAlert tone="warning" title="Pente">
        {localize("{{v0}} passage{{v1}} au-delà de {{v2}}° à venir, jusqu’à {{v3}}°", { v0: steepAhead.length, v1: steepAhead.length > 1 ? 's' : '', v2: threshold, v3: Math.round(Math.max(...steepAhead.map(portion => portion.maxSlopeDegrees))) })}
      </HudAlert>}
    </ul>

    <div className={`grid flex-1 content-start gap-[clamp(1rem,2.5vw,2.25rem)] ${sheet ? 'lg:grid-cols-[1.25fr_1fr_1fr]' : 'lg:grid-cols-[1.25fr_1fr]'} md:grid-cols-2`}>
      <section aria-live="polite" className="grid content-start gap-3 md:max-lg:col-span-2">
        <div>
          <p className={caption}>{localize("Arrêt")} {localize(progress.stepIndex + 1)}/{localize(mission.steps.length)}</p>
          <h1 className="heading-display text-[clamp(2rem,5vw,4rem)] [overflow-wrap:anywhere]">{localize(step.name)}</h1>
        </div>
        <ul aria-label={localize("Activités")} className="m-0 grid list-none gap-1.5 p-0">
          {step.activities.map(a => {
            const current = a === activity;
            return <li key={a.id} aria-current={current ? 'step' : undefined}>
              <button type="button" aria-pressed={a.completed} onClick={() => dispatch({ type: 'activityToggled', stepId: step.id, activityId: a.id })}
                className={`${row} ${current ? 'min-h-20 border-2 border-mars bg-mars/10' : 'border-header-foreground/20 hover:bg-accent'}`}>
                {tick(a.completed)}
                <span className={`min-w-0 flex-1 ${current ? 'heading-display text-[clamp(1.5rem,3.4vw,2.5rem)] text-mars' : a.completed ? `${quiet} line-through` : 'text-lg'}`}>{localize(activityLabels[a.type])}</span>
                {current && <ActivityClock key={a.id} plannedMinutes={a.durationMinutes} />}
                <span className={`tabular-nums ${current ? 'text-lg' : quiet}`}>{current && '/ '}{formatBudgetMinutes(a.durationMinutes)}</span>
              </button>
            </li>;
          })}
        </ul>
        {progress.finished && <p className="heading-display text-[clamp(1.5rem,3.4vw,2.5rem)] text-mars">{localize("Retour au camp")}</p>}
        <div className="flex flex-wrap gap-3">
          {activity && <button type="button" autoFocus className={`label-caps inline-flex min-h-20 min-w-[min(100%,16rem)] flex-1 cursor-pointer items-center justify-center gap-3 bg-mars px-5 text-lg text-mars-foreground hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring`}
            onClick={() => dispatch({ type: 'activityToggled', stepId: step.id, activityId: activity.id })}>
            <Check aria-hidden="true" className="size-8" />{localize("Activité faite")}
          </button>}
          {lastDone && <button type="button" className={`${tool} min-h-20 px-5`} onClick={() => dispatch({ type: 'activityToggled', stepId: lastDone.stepId, activityId: lastDone.activityId })}>
            <Undo2 aria-hidden="true" className="size-6" />{localize("Annuler la dernière")}
          </button>}
        </div>
      </section>

      {sheet && <SiteBrief sheet={sheet} mission={mission} />}

      <section aria-label={localize("Temps et parcours")} className={zone}>
        <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-4">
          <Readout label="Reste prévu" value={formatBudgetMinutes(Math.ceil(progress.remainingMinutes))}
            detail={localize("{{v0}}/{{v1}} activités faites", { v0: progress.completedActivities, v1: progress.totalActivities })} />
          <Readout label="Marge du plan" value={margin?.value ?? '—'} tone={margin?.status === 'over' ? 'danger' : undefined}
            detail={margin ? undefined : localize("Budget non calculable")} />
          {budget.status === 'ready' && <div className="col-span-2"><BudgetBar budget={budget} remainingMinutes={progress.remainingMinutes} /></div>}
          <Readout label="Ensuite" value={nextStep ? localize(nextStep.name) : localize("Camp")}
            detail={`${formatGroundDistance(progress.nextLegMetres)} · ${walkMinutes(progress.nextLegMetres)}`} />
          {campDirect && <Readout label="Camp en direct" value={formatGroundDistance(campDirect.distanceMetres)} detail={walkMinutes(campDirect.distanceMetres)} />}
        </dl>
        <p className={quiet}>
          {!radiation && margin?.status !== 'over' && !steepAhead?.length && <>{localize("Aucune alerte.")} </>}
          {!steepAhead && <>{localize("Pentes non vérifiées : relief indisponible.")} </>}
        </p>
      </section>
    </div>

    <footer className={`flex flex-wrap items-center gap-x-4 gap-y-2 text-sm ${quiet}`}>
      <button type="button" className={tool}
        onClick={() => dispatch({ type: 'radiationAlertChanged', alert: radiation || !campDirect ? null : { missionId: mission.id, alert: campDirect } })}>
        {radiation ? localize("Annuler la simulation") : localize("Simuler une alerte radiation")}
      </button>
      <p className="min-w-0 flex-1 basis-80">
        {localize("Aucune localisation réelle : l’arrêt en cours est le premier dont une activité reste à cocher. Durées et distances du plan ; le chrono compte sur cet écran et n’est pas enregistré. Pentes selon le seuil choisi, une hypothèse ; aucune mesure de radiation à Jezero. Ce n’est pas une aide à la navigation.")}
        <span className="max-md:hidden"> {localize("Clavier : Espace pour « Activité faite », Retour arrière pour annuler.")}</span>
      </p>
    </footer>
  </main>;
}
