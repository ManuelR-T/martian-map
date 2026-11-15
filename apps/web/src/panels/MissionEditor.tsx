import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Check } from 'lucide-react';
import { Button, Panel, TabList } from '@marps/ui';
import { confirmAction } from '../confirm';
import { createEmptyMission, missionTypes, validParameters, type MissionType, type ActivityType, type Camp, type Mission, type MissionActivity, type MissionStep } from '@marps/mission-core';
import { usePlannerDispatch, usePlannerState } from '../state/PlannerProvider';
import { MissionDatabase, type MissionHistoryEntry } from '../storage/missionDatabase';
import { withDataReferences } from '../storage/missionDraft';
import { DETAILED_REGION_ID, missionMatchesCatalog } from '../state/planner';
import { PlanningGate } from './PlanningGate';
import { CampsManager } from './CampsPanel';
import { MissionStepsEditor } from './MissionStepsEditor';
import { baseField as field, baseRecordsChanged } from './baseControls';

export const activityLabels: Record<ActivityType, string> = { photo: 'Photo', observation: 'Observation', sampling: 'Prélèvement' };
const form = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); return new FormData(event.currentTarget); };
const text = (data: FormData, key: string) => String(data.get(key) ?? '');
const number = (data: FormData, key: string) => Number(data.get(key));
const uid = () => crypto.randomUUID();
type Action = 'new' | 'template';
type Tab = 'prepare' | 'camps' | 'saved';

export function MissionEditor({ className, collapsible = true }: { className?: string; collapsible?: boolean }) {
  const { mission, catalog, runningMission, trackingReady, trackingError, draftStatus, draftError } = usePlannerState();
  const dispatch = usePlannerDispatch();
  const [database] = useState(() => new MissionDatabase());
  const [camps, setCamps] = useState<Camp[]>([]);
  const [saved, setSaved] = useState<Mission[]>([]);
  const [templates, setTemplates] = useState<Mission[]>([]);
  const [history, setHistory] = useState<MissionHistoryEntry[]>([]);
  const [action, setAction] = useState<Action>('new');
  const [tab, setTab] = useState<Tab>('prepare');
  const [stage, setStage] = useState(1);
  const [status, setStatus] = useState('');
  const tabsId = useId();
  const stages = ['Objectif et nom', 'Camp et parcours', 'Vérification et enregistrement'];
  const [busy, setBusy] = useState(false);
  const [baseline, setBaseline] = useState(mission);
  const [name, setName] = useState(mission.name);
  const [parametersDirty, setParametersDirty] = useState(false);
  const [parameterDraft, setParameterDraft] = useState(() => ({ available: String(mission.parameters.availableSeconds / 60), speed: String(mission.parameters.speedMetresPerSecond), reserve: String(mission.parameters.reserveSeconds / 60) }));
  const [persisted, setPersisted] = useState<Mission | null>(null);
  const refresh = useCallback(async () => {
    const [c, m, t, h] = await Promise.all([database.camps(), database.missions(), database.templates(), database.history()]);
    setCamps(c); setSaved(m); setTemplates(t); setHistory(h);
  }, [database]);
  useEffect(() => {
    let active = true;
    const load = () => { if (active) void refresh().catch((error: unknown) => { if (active) setStatus(`Impossible de charger la base locale. ${error instanceof Error ? error.message : ''} Réessayez.`); }); };
    load(); window.addEventListener(baseRecordsChanged, load);
    return () => { active = false; window.removeEventListener(baseRecordsChanged, load); };
  }, [refresh]);
  const run = async (operation: () => Promise<void>) => {
    setBusy(true); setStatus('');
    try { await operation(); } catch (error) { setStatus(error instanceof Error ? error.message : 'Échec de la sauvegarde locale.'); }
    finally { setBusy(false); }
  };
  const canLeave = async () => (!draftError && !parametersDirty && JSON.stringify(mission) === JSON.stringify(baseline) && name === baseline.name)
    || confirmAction('Abandonner les modifications non enregistrées ?', { confirmLabel: 'Abandonner', cancelLabel: 'Continuer la préparation', destructive: true });
  const replaceTracking = () => confirmAction('Remplacer le suivi précédent par cette nouvelle sortie ? Son historique sera conservé.', { confirmLabel: 'Remplacer le suivi' });
  const remove = async (label: string, operation: () => Promise<void>) => {
    if (!await confirmAction(`Supprimer « ${label} » ? L’historique des sorties sera conservé.`, { confirmLabel: 'Supprimer', destructive: true })) return;
    void run(async () => { await operation(); await refresh(); setStatus('Suppression effectuée.'); });
  };
  const open = (value: Mission, next: 'new' | 'template') => {
    if (!missionMatchesCatalog(value, catalog)) { setStatus('Cette préparation contient un camp ou un parcours hors du secteur Jezero, ou un site incompatible avec le catalogue.'); return; }
    dispatch({ type: 'missionOpened', mission: value }); setName(value.name); setBaseline(value);
    setParameterDraft({ available: String(value.parameters.availableSeconds / 60), speed: String(value.parameters.speedMetresPerSecond), reserve: String(value.parameters.reserveSeconds / 60) });
    setAction(next); setStage(1); setParametersDirty(false); setPersisted(null); setStatus(''); setTab('prepare');
  };
  // A fresh draft replaces the open one, so it asks first when the open one has unsaved changes.
  const openBlank = async (next: Action) => { if (await canLeave()) open(createEmptyMission(mission.regionId, uid()), next); };
  const openFrom = async (value: Mission, next: Action) => { if (await canLeave()) open(value, next); };
  const fromTemplate = (value: Mission): Mission => ({ ...value, id: uid(), siteWork: {}, steps: value.steps.map(s => ({ ...s, activities: s.activities.map(a => ({ ...a, completed: false })) })) });
  // No tab change during a save or a delete: overlapping runs would re-enable buttons mid-save.
  const changeTab = (next: Tab) => { if (busy) return; setTab(next); setStatus(''); if (next === 'saved') void run(refresh); };
  const sites = catalog.status === 'ready' ? catalog.data.sites.filter(s => s.regionId === mission.regionId) : [];
  const extent = catalog.status === 'ready' ? catalog.data.coverage?.find(r => r.id === mission.regionId)?.extent : undefined;
  const suggestedActivities = (): MissionActivity[] => [{ id: uid(), type: mission.missionType === 'sampling' ? 'sampling' : mission.missionType === 'photography' ? 'photo' : 'observation', durationMinutes: 10, completed: false }];
  const start = async () => {
    if (runningMission && !await replaceTracking()) return;
    dispatch({ type: 'missionStarted', id: uid() });
  };
  const startSaved = async (value: Mission) => {
    if (!missionMatchesCatalog(value, catalog)) { setStatus('Cette préparation contient un camp ou un parcours hors du secteur Jezero, ou un site incompatible avec le catalogue.'); return; }
    if (!await canLeave()) return;
    if (runningMission && !await replaceTracking()) return;
    // Open it in the editor too: « Préparer » stays one click away and must show this mission, never a mix with the old draft.
    open(value, 'new');
    dispatch({ type: 'savedMissionStarted', mission: value, id: uid() });
  };
  const justSaved = stage === 3 && persisted !== null && !parametersDirty;
  const savedRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (justSaved) savedRef.current?.scrollIntoView?.({ block: 'nearest' }); }, [justSaved]);
  const content = (
    <div role="tabpanel" id={`${tabsId}-panel`} aria-labelledby={`${tabsId}-${tab}`} className="grid gap-3 text-sm">
    <p role="status" className="empty:hidden">{status}</p>
    {draftError ? <p role="alert">{draftError} La sauvegarde d’origine est conservée jusqu’à son remplacement explicite.</p> : <p role="status" className="empty:hidden text-xs">{draftStatus}</p>}
    {trackingError && <div role="alert"><p>{trackingError}</p><Button variant="outline" onClick={() => dispatch({ type: 'trackingRequested' })}>Réessayer le chargement du suivi</Button></div>}
    {tab === 'saved' && <div className="grid gap-4">
      <section className="grid gap-2" aria-label="Missions">
        <h3 className="label-caps">Missions</h3>
        {saved.length === 0 && <p>Aucune mission enregistrée.</p>}
        {saved.map(value => <div key={value.id} className="grid gap-2 border p-3">
          <p className="font-semibold">{value.name}</p><p>{value.steps.length} étapes · {value.camp?.name ?? 'Camp à choisir'}</p>
          <Button disabled={busy || !trackingReady || !value.camp || !value.steps.length} onClick={() => void startSaved(value)}>Démarrer cette mission</Button>
          <div className="flex flex-wrap gap-2">
            <Button className="flex-1" size="sm" variant="outline" disabled={busy} onClick={() => void openFrom(value, 'new')}>Modifier la mission</Button>
            <Button size="sm" variant="danger" disabled={busy} aria-label={`Supprimer la mission ${value.name}`} onClick={() => void remove(value.name, () => database.deleteMission(value.id))}>Supprimer</Button>
          </div>
        </div>)}
      </section>
      <section className="grid gap-2" aria-label="Modèles">
        <h3 className="label-caps">Modèles</h3>
        <Button className="justify-self-start" variant="outline" disabled={busy} onClick={() => void openBlank('template')}>Nouveau modèle</Button>
        {templates.length === 0 && <p>Aucun modèle enregistré.</p>}
        {templates.map(value => <div key={value.id} className="grid gap-2 border p-3">
          <p className="font-semibold">{value.name}</p><p>{value.steps.length} étapes · {value.camp?.name ?? 'Camp à choisir'}</p>
          <Button disabled={busy} onClick={() => void openFrom(fromTemplate(value), 'new')}>Créer une mission avec ce modèle</Button>
          <div className="flex flex-wrap gap-2">
            <Button className="flex-1" size="sm" variant="outline" disabled={busy} onClick={() => void openFrom(value, 'template')}>Modifier le modèle</Button>
            <Button size="sm" variant="danger" disabled={busy} aria-label={`Supprimer le modèle ${value.name}`} onClick={() => void remove(value.name, () => database.deleteTemplate(value.id))}>Supprimer</Button>
          </div>
        </div>)}
      </section>
      <section className="grid gap-2" aria-label="Historique">
        <h3 className="label-caps">Historique</h3>
        {history.length === 0 && <p>Aucune sortie dans l’historique.</p>}
        {history.map(entry => <details key={entry.id} className="border p-3">
          <summary className="cursor-pointer py-2 font-semibold">{entry.mission.name} · {entry.id === runningMission?.id ? 'Suivi actuel' : 'Sortie précédente'}</summary>
          <p>Dernier suivi enregistré : {new Date(entry.updatedAt).toLocaleString('fr-FR')}</p>
          <p>{entry.mission.camp?.name} · {entry.mission.steps.length} étapes</p>
          <ol className="list-inside list-decimal">{entry.mission.steps.map(s => <li key={s.id}>{s.name} · {s.activities.filter(a => a.completed).length}/{s.activities.length} activités faites</li>)}</ol>
          {entry.id === runningMission?.id && <Button className="mt-2" onClick={() => dispatch({ type: 'workspaceChanged', workspace: 'mission' })}>Reprendre le suivi</Button>}
        </details>)}
      </section>
    </div>}
    {tab === 'prepare' && <fieldset disabled={busy} className="grid min-w-0 gap-3">
      <p className="font-semibold">{action === 'template' ? 'Modèle réutilisable' : 'Nouvelle mission'} · Étape {stage} sur 3</p>
      <Button className="justify-self-start" variant="outline" onClick={async () => {
        if (await confirmAction('Réinitialiser la préparation ? Les missions enregistrées et le suivi seront conservés.', { confirmLabel: 'Réinitialiser', destructive: true })) open(createEmptyMission(DETAILED_REGION_ID, uid()), 'new');
      }}>Réinitialiser la préparation</Button>
      {action === 'template' && <Button className="justify-self-start" variant="outline" onClick={() => void openBlank('new')}>Préparer une mission à la place</Button>}
      {/* A stage already passed is a button: no need to step back one screen at a time. */}
      <ol className="grid gap-1 border-l-2 border-mars pl-3 text-xs" aria-label="Progression de la préparation">
        {stages.map((label, i) => <li key={label} aria-current={stage === i + 1 ? 'step' : undefined} className={stage === i + 1 ? 'font-semibold' : 'text-muted-foreground'}>
          {i + 1 < stage
            ? <button type="button" className="min-h-6 cursor-pointer text-left text-primary underline underline-offset-4 hover:decoration-2" onClick={() => { setStage(i + 1); setPersisted(null); }}>{i + 1}. {label}</button>
            : <>{i + 1}. {label}</>}
        </li>)}
      </ol>
      {stage === 1 && <form className="grid gap-3" onSubmit={event => { event.preventDefault(); if (!name.trim()) return; dispatch({ type: 'missionRenamed', name: name.trim() }); setStage(2); }}>
        {action === 'new' && templates.length > 0 && <label>Partir d’un modèle (facultatif)<select className={field} value="" onChange={event => {
          const value = templates.find(t => t.id === event.target.value); if (value) void openFrom(fromTemplate(value), 'new');
        }}><option value="">Choisir un modèle…</option>{templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>}
        <label>Quel est l’objectif ?<select className={field} value={mission.missionType ?? 'reconnaissance'} onChange={event => {
          const type = event.target.value as MissionType;
          if (name === missionTypes[mission.missionType ?? 'reconnaissance'] || name === 'Nouvelle mission') setName(missionTypes[type]);
          dispatch({ type: 'missionTypeChanged', missionType: type });
        }}>{Object.entries(missionTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Nom proposé, modifiable<input className={field} value={name} onChange={event => { setName(event.target.value); dispatch({ type: 'missionRenamed', name: event.target.value.trim() }); }} required maxLength={120} pattern=".*\S.*" /></label>
        <Button type="submit">Continuer : camp et parcours</Button>
      </form>}
      {stage === 2 && <>
        <label>Camp de départ et de retour{action === 'template' && ' (facultatif)'}<select className={field} value={mission.camp?.id ?? ''} onChange={event => {
          const camp = camps.find(c => c.id === event.target.value); if (camp) dispatch({ type: 'campPlaced', camp }); else dispatch({ type: 'campCleared' });
        }}><option value="">Choisir un camp enregistré…</option>{mission.camp && !camps.some(c => c.id === mission.camp?.id) && <option value={mission.camp.id}>{mission.camp.name} (copie enregistrée)</option>}{camps.filter(c => c.regionId === mission.regionId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        {camps.length === 0 && <p>Aucun camp enregistré.</p>}
        <Button className="justify-self-start" variant="outline" onClick={() => changeTab('camps')}>Créer un camp</Button>
        <label>Ajouter une étape du catalogue<select className={field} value="" onChange={event => {
          const site = sites.find(s => s.id === event.target.value); if (site) dispatch({ type: 'stepAdded', step: { id: uid(), name: site.name, position: site.coordinate, siteId: site.id, activities: suggestedActivities() } });
        }}><option value="">Choisir un site…</option>{sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <details className="border p-2"><summary className="cursor-pointer py-2">Ajouter une étape par coordonnées</summary>
          <form className="grid gap-2" onSubmit={event => { const data = form(event); dispatch({ type: 'stepAdded', step: { id: uid(), name: text(data, 'name').trim(), position: { longitude: number(data, 'longitude'), latitude: number(data, 'latitude') }, siteId: null, activities: suggestedActivities() } }); }}>
            <label>Nom de l’étape<input className={field} name="name" required pattern=".*\S.*" /></label>
            <label>Longitude est (°)<input className={field} name="longitude" type="number" step="any" min={extent?.west ?? -180} max={extent?.east ?? 180} required /></label>
            <label>Latitude (°)<input className={field} name="latitude" type="number" step="any" min={extent?.south ?? -90} max={extent?.north ?? 90} required /></label>
            <Button type="submit" variant="outline">Ajouter l’étape</Button>
          </form>
        </details>
        <p className="text-xs text-muted-foreground">Chaque étape reçoit une activité selon l’objectif, avec une durée estimée de 10 min à ajuster.</p>
        <MissionStepsEditor />
        {action === 'new' && (!mission.camp || !mission.steps.length) && <p>Choisissez un camp et ajoutez au moins une étape pour continuer.</p>}
        <Button disabled={action === 'new' && (!mission.camp || !mission.steps.length)} onClick={() => setStage(3)}>Continuer : vérifier la mission</Button>
      </>}
      {stage === 3 && <form className="grid gap-3" onChange={event => {
        setParametersDirty(true); setPersisted(null);
        const data = new FormData(event.currentTarget);
        const parameters = { availableSeconds: number(data, 'available') * 60, reserveSeconds: number(data, 'reserve') * 60, speedMetresPerSecond: number(data, 'speed') };
        if (validParameters(parameters)) dispatch({ type: 'parametersChanged', parameters });
      }} onSubmit={event => {
        const data = form(event);
        const parameters = { availableSeconds: number(data, 'available') * 60, reserveSeconds: number(data, 'reserve') * 60, speedMetresPerSecond: number(data, 'speed') };
        if (!validParameters(parameters)) { setStatus('Durées finies et positives ou nulles, vitesse strictement positive ; la réserve ne doit pas dépasser la durée disponible.'); return; }
        if (catalog.status !== 'ready') return;
        const value = withDataReferences({ ...mission, id: mission.id === 'draft' ? uid() : mission.id, name: name.trim(), parameters }, catalog.data);
        void run(async () => {
          if (action === 'template') await database.saveTemplate(value); else await database.saveMission(value);
          dispatch({ type: 'missionOpened', mission: value }); setBaseline(value); setName(value.name); setParametersDirty(false); setPersisted(value);
          await refresh();
        });
      }}>
        <p className="font-semibold">{name}</p><p>{mission.camp?.name ?? 'Camp à choisir lors de la création d’une mission'} · {mission.steps.length} étapes · {mission.steps.reduce((n, s) => n + s.activities.length, 0)} activités</p>
        <label>Durée disponible (min)<input className={field} type="number" step="any" min={0} name="available" value={parameterDraft.available} onChange={event => setParameterDraft(current => ({ ...current, available: event.target.value }))} required /></label>
        <label>Vitesse prévue (m/s)<input className={field} type="number" step="any" min={Number.MIN_VALUE} name="speed" value={parameterDraft.speed} onChange={event => setParameterDraft(current => ({ ...current, speed: event.target.value }))} required /></label>
        <label>Réserve (min)<input className={field} type="number" step="any" min={0} name="reserve" value={parameterDraft.reserve} onChange={event => setParameterDraft(current => ({ ...current, reserve: event.target.value }))} required /></label>
        <p className="text-xs text-muted-foreground">Simulation : camps fictifs, durées estimées et segments directs. Le terrain n’est pas validé.</p>
        {/* Once saved, « Démarrer » takes over as the main action; saving again has nothing to do. */}
        <Button type="submit" variant={justSaved ? 'outline' : 'default'}>{action === 'template' ? 'Enregistrer le modèle' : 'Enregistrer la mission'}</Button>
      </form>}
      {/* The confirmation sits where the eye is, next to the button that was pressed, and scrolls into view. */}
      <div ref={savedRef} className="grid gap-3 empty:hidden">
        <p role="status" className="flex items-start gap-2 font-semibold text-success empty:hidden">{justSaved && <><Check aria-hidden="true" className="mt-0.5 size-4 shrink-0" />{action === 'template' ? 'Modèle enregistré. Il est disponible pour créer de nouvelles missions.' : 'Mission enregistrée. Vous pouvez démarrer la sortie.'}</>}</p>
        {justSaved && JSON.stringify(persisted) === JSON.stringify(mission) && action === 'new' && <Button disabled={!trackingReady} onClick={() => void start()}>Démarrer cette mission</Button>}
      </div>
      {justSaved && <Button variant="outline" onClick={() => void openBlank(action)}>{action === 'template' ? 'Créer un autre modèle' : 'Préparer une autre mission'}</Button>}
      {stage > 1 && <Button variant="outline" onClick={() => { setStage(stage - 1); setPersisted(null); }}>Retour à l’étape précédente</Button>}
    </fieldset>}
    {/* Kept mounted, so a camp being typed survives a tab change. */}
    <div hidden={tab !== 'camps'}><CampsManager /></div>
    </div>
  );
  return <Panel title="Mission" description="Préparer et retrouver vos sorties" collapsible={collapsible} floating className={className} contentClassName="overflow-y-auto">
    <PlanningGate loadingTitle="Chargement des missions" coverageTitle="Ouvrez Jezero pour préparer une mission" offerRegion>
      <div className="grid min-w-0 grid-cols-1 gap-3">
        <TabList<Tab> label="Sections de la mission" value={tab} onValueChange={changeTab} tabId={value => `${tabsId}-${value}`} panelId={`${tabsId}-panel`}
          className="[&>button]:text-[0.75rem] [&>button]:tracking-[0.04em]" options={[
          { value: 'prepare', label: 'Préparation' },
          { value: 'camps', label: 'Camps' },
          { value: 'saved', label: 'Missions enregistrées' },
        ]} />
        {content}
      </div>
    </PlanningGate>
  </Panel>;
}
export function ActivityEditor({ step }: { step: MissionStep }) {
  const dispatch = usePlannerDispatch();
  const update = (activity: MissionActivity) => dispatch({ type: 'activityChanged', stepId: step.id, activity });
  return <details className="mt-2">
    <summary className="cursor-pointer py-2">Activités ({step.activities.length})</summary>
    <div className="grid gap-2">
    {step.activities.map(activity => <div className="grid gap-1 border p-2" key={activity.id}>
      <p className="py-2 font-semibold">{activityLabels[activity.type]}</p>
      <form key={activity.durationMinutes} className="grid gap-1" onSubmit={event => { const data = form(event); update({ ...activity, durationMinutes: number(data, 'minutes') }); }}>
        <label>Durée (min)<input className={field} type="number" step="any" min={0} name="minutes" defaultValue={activity.durationMinutes} required /></label>
        <Button type="submit" variant="outline">Appliquer la durée</Button>
      </form>
      <Button variant="outline" onClick={() => dispatch({ type: 'activityRemoved', stepId: step.id, id: activity.id })}>Retirer {activityLabels[activity.type]}</Button>
    </div>)}
    <label>Ajouter une activité<select className={field} value="" onChange={event => dispatch({ type: 'activityAdded', stepId: step.id, activity: { id: uid(), type: event.target.value as ActivityType, durationMinutes: 10, completed: false } })}>
      <option value="">Choisir…</option>{Object.entries(activityLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
    </select></label>
    </div>
  </details>;
}
