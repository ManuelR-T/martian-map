import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Button, Panel } from '@marps/ui';
import { createEmptyMission, missionTypes, validParameters, type MissionType, type ActivityType, type Camp, type Mission, type MissionActivity, type MissionStep } from '@marps/mission-core';
import { usePlannerDispatch, usePlannerState } from '../state/PlannerProvider';
import { MissionDatabase, type MissionHistoryEntry } from '../storage/missionDatabase';
import { missionMatchesCatalog } from '../state/planner';
import { PlanningGate } from './PlanningGate';
import { ActionPanels } from './ActionPanels';
import { MissionStepsEditor } from './MissionStepsEditor';
import { baseField as field, baseRecordsChanged } from './baseControls';

export const activityLabels: Record<ActivityType, string> = { photo: 'Photo', observation: 'Observation', sampling: 'Prélèvement' };
const form = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); return new FormData(event.currentTarget); };
const text = (data: FormData, key: string) => String(data.get(key) ?? '');
const number = (data: FormData, key: string) => Number(data.get(key));
const uid = () => crypto.randomUUID();
type Action = 'new' | 'template' | 'saved' | 'templates' | 'history';

export function MissionEditor({ className }: { className?: string }) {
  const { mission, catalog, runningMission, trackingReady, trackingError } = usePlannerState();
  const dispatch = usePlannerDispatch();
  const [database] = useState(() => new MissionDatabase());
  const [camps, setCamps] = useState<Camp[]>([]);
  const [saved, setSaved] = useState<Mission[]>([]);
  const [templates, setTemplates] = useState<Mission[]>([]);
  const [history, setHistory] = useState<MissionHistoryEntry[]>([]);
  const [action, setAction] = useState<Action>('new');
  const [stage, setStage] = useState(1);
  const [status, setStatus] = useState('');
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
    const load = () => { if (active) void refresh().catch(() => { if (active) setStatus('Impossible de charger la base locale. Réessayez.'); }); };
    load(); window.addEventListener(baseRecordsChanged, load);
    return () => { active = false; window.removeEventListener(baseRecordsChanged, load); };
  }, [refresh]);
  const run = async (operation: () => Promise<void>) => {
    setBusy(true); setStatus('');
    try { await operation(); } catch (error) { setStatus(error instanceof Error ? error.message : 'Échec de la sauvegarde locale.'); }
    finally { setBusy(false); }
  };
  const editing = action === 'new' || action === 'template';
  const canLeave = () => !editing || (!parametersDirty && JSON.stringify(mission) === JSON.stringify(baseline) && name === baseline.name)
    || window.confirm('Abandonner les modifications non enregistrées ?');
  const open = (value: Mission, next: 'new' | 'template') => {
    if (!missionMatchesCatalog(value, catalog)) { setStatus('Cette préparation contient un camp ou un parcours hors du secteur Jezero, ou un site incompatible avec le catalogue.'); return; }
    dispatch({ type: 'missionOpened', mission: value }); setName(value.name); setBaseline(value);
    setParameterDraft({ available: String(value.parameters.availableSeconds / 60), speed: String(value.parameters.speedMetresPerSecond), reserve: String(value.parameters.reserveSeconds / 60) });
    setAction(next); setStage(1); setParametersDirty(false); setPersisted(null); setStatus('');
  };
  const changeAction = (next: Action) => {
    if (next === action || !canLeave()) return;
    setStatus(''); setPersisted(null);
    if (next === 'new' || next === 'template') open(createEmptyMission(mission.regionId, uid()), next);
    else { setAction(next); void run(refresh); }
  };
  const sites = catalog.status === 'ready' ? catalog.data.sites.filter(s => s.regionId === mission.regionId) : [];
  const extent = catalog.status === 'ready' ? catalog.data.coverage?.find(r => r.id === mission.regionId)?.extent : undefined;
  const suggestedActivities = (): MissionActivity[] => [{ id: uid(), type: mission.missionType === 'sampling' ? 'sampling' : mission.missionType === 'photography' ? 'photo' : 'observation', durationMinutes: 10, completed: false }];
  const start = () => {
    if (runningMission && !window.confirm('Remplacer le suivi précédent par cette nouvelle sortie ? Son historique sera conservé.')) return;
    dispatch({ type: 'missionStarted', id: uid() });
  };
  const startSaved = (value: Mission) => {
    if (!missionMatchesCatalog(value, catalog)) { setStatus('Cette préparation contient un camp ou un parcours hors du secteur Jezero, ou un site incompatible avec le catalogue.'); return; }
    if (runningMission && !window.confirm('Remplacer le suivi précédent par cette nouvelle sortie ? Son historique sera conservé.')) return;
    dispatch({ type: 'savedMissionStarted', mission: value, id: uid() });
  };
  const content = (
    <div className="grid gap-3 text-sm">
    <p role="status">{status}</p>
    {trackingError && <div role="alert"><p>{trackingError}</p><Button variant="outline" onClick={() => dispatch({ type: 'trackingRequested' })}>Réessayer le chargement du suivi</Button></div>}
    {(action === 'saved' || action === 'templates') && <div className="grid gap-2">
      {(action === 'saved' ? saved : templates).length === 0 && <p>{action === 'saved' ? 'Aucune mission enregistrée.' : 'Aucun modèle enregistré.'}</p>}
      {(action === 'saved' ? saved : templates).map(value => <div key={value.id} className="grid gap-2 border p-3">
        <p className="font-semibold">{value.name}</p><p>{value.steps.length} étapes · {value.camp?.name ?? 'Camp à choisir'}</p>
        {action === 'templates' && <Button disabled={busy} onClick={() => open({ ...value, id: uid(), siteWork: {}, steps: value.steps.map(s => ({ ...s, activities: s.activities.map(a => ({ ...a, completed: false })) })) }, 'new')}>Créer une mission avec ce modèle</Button>}
        {action === 'saved' && <Button disabled={busy || !trackingReady || !value.camp || !value.steps.length} onClick={() => startSaved(value)}>Démarrer cette mission</Button>}
        <Button variant="outline" disabled={busy} onClick={() => open(value, action === 'templates' ? 'template' : 'new')}>Modifier {action === 'templates' ? 'le modèle' : 'la mission'}</Button>
        <Button variant="outline" disabled={busy} onClick={() => {
          if (!window.confirm(`Supprimer « ${value.name} » ? L’historique des sorties sera conservé.`)) return;
          void run(async () => { if (action === 'templates') await database.deleteTemplate(value.id); else await database.deleteMission(value.id); await refresh(); setStatus('Suppression effectuée.'); });
        }}>Supprimer</Button>
      </div>)}
    </div>}
    {action === 'history' && <div className="grid gap-2">
      {history.length === 0 && <p>Aucune sortie dans l’historique. Les missions démarrées y seront conservées automatiquement.</p>}
      {history.map(entry => <details key={entry.id} className="border p-3">
        <summary className="cursor-pointer py-2 font-semibold">{entry.mission.name} · {entry.id === runningMission?.id ? 'Suivi actuel' : 'Sortie précédente'}</summary>
        <p>Dernier suivi enregistré : {new Date(entry.updatedAt).toLocaleString('fr-FR')}</p>
        <p>{entry.mission.camp?.name} · {entry.mission.steps.length} étapes</p>
        <ol className="list-inside list-decimal">{entry.mission.steps.map(s => <li key={s.id}>{s.name} · {s.activities.filter(a => a.completed).length}/{s.activities.length} activités faites</li>)}</ol>
        {entry.id === runningMission?.id && <Button className="mt-2" onClick={() => dispatch({ type: 'workspaceChanged', workspace: 'mission' })}>Reprendre le suivi</Button>}
      </details>)}
    </div>}
    {editing && <fieldset disabled={busy} className="grid min-w-0 gap-3">
      <p className="font-semibold">{action === 'template' ? 'Modèle réutilisable' : 'Nouvelle mission'} · Étape {stage} sur 3</p>
      <ol className="grid gap-1 border-l-2 border-mars pl-3 text-xs" aria-label="Progression de la préparation">
        {['Objectif et nom', 'Camp et parcours', 'Vérification et enregistrement'].map((label, i) => <li key={label} aria-current={stage === i + 1 ? 'step' : undefined} className={stage === i + 1 ? 'font-semibold' : 'text-muted-foreground'}>{i + 1}. {label}</li>)}
      </ol>
      {stage === 1 && <form className="grid gap-3" onSubmit={event => { event.preventDefault(); if (!name.trim()) return; dispatch({ type: 'missionRenamed', name: name.trim() }); setStage(2); }}>
        {action === 'new' && templates.length > 0 && <label>Partir d’un modèle (facultatif)<select className={field} value="" onChange={event => {
          const value = templates.find(t => t.id === event.target.value); if (value) open({ ...value, id: uid(), siteWork: {}, steps: value.steps.map(s => ({ ...s, activities: s.activities.map(a => ({ ...a, completed: false })) })) }, 'new');
        }}><option value="">Choisir un modèle…</option>{templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>}
        <label>Quel est l’objectif ?<select className={field} value={mission.missionType ?? 'reconnaissance'} onChange={event => {
          const type = event.target.value as MissionType;
          if (name === missionTypes[mission.missionType ?? 'reconnaissance'] || name === 'Nouvelle mission') setName(missionTypes[type]);
          dispatch({ type: 'missionTypeChanged', missionType: type });
        }}>{Object.entries(missionTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Nom proposé, modifiable<input className={field} value={name} onChange={event => setName(event.target.value)} required maxLength={120} pattern=".*\S.*" /></label>
        <Button type="submit">Continuer : camp et parcours</Button>
      </form>}
      {stage === 2 && <>
        <label>Camp de départ et de retour{action === 'template' && ' (facultatif)'}<select className={field} value={mission.camp?.id ?? ''} onChange={event => {
          const camp = camps.find(c => c.id === event.target.value); if (camp) dispatch({ type: 'campPlaced', camp }); else dispatch({ type: 'campCleared' });
        }}><option value="">Choisir un camp enregistré…</option>{mission.camp && !camps.some(c => c.id === mission.camp?.id) && <option value={mission.camp.id}>{mission.camp.name} (copie enregistrée)</option>}{camps.filter(c => c.regionId === mission.regionId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        {camps.length === 0 && <p>Enregistrez d’abord un camp dans l’encadré Camps, puis revenez ici.</p>}
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
      {stage === 3 && <form className="grid gap-3" onChange={() => { setParametersDirty(true); setPersisted(null); }} onSubmit={event => {
        const data = form(event);
        const parameters = { availableSeconds: number(data, 'available') * 60, reserveSeconds: number(data, 'reserve') * 60, speedMetresPerSecond: number(data, 'speed') };
        if (!validParameters(parameters)) { setStatus('Durées finies et positives ou nulles, vitesse strictement positive ; la réserve ne doit pas dépasser la durée disponible.'); return; }
        const value = { ...mission, id: mission.id === 'draft' ? uid() : mission.id, name: name.trim(), parameters };
        void run(async () => {
          if (action === 'template') await database.saveTemplate(value); else await database.saveMission(value);
          dispatch({ type: 'missionOpened', mission: value }); setBaseline(value); setName(value.name); setParametersDirty(false); setPersisted(value);
          await refresh(); setStatus(action === 'template' ? 'Modèle enregistré. Il est disponible pour créer de nouvelles missions.' : 'Mission enregistrée. Vous pouvez démarrer la sortie.');
        });
      }}>
        <p className="font-semibold">{name}</p><p>{mission.camp?.name ?? 'Camp à choisir lors de la création d’une mission'} · {mission.steps.length} étapes · {mission.steps.reduce((n, s) => n + s.activities.length, 0)} activités</p>
        <label>Durée disponible (min)<input className={field} type="number" step="any" min={0} name="available" value={parameterDraft.available} onChange={event => setParameterDraft(current => ({ ...current, available: event.target.value }))} required /></label>
        <label>Vitesse prévue (m/s)<input className={field} type="number" step="any" min={Number.MIN_VALUE} name="speed" value={parameterDraft.speed} onChange={event => setParameterDraft(current => ({ ...current, speed: event.target.value }))} required /></label>
        <label>Réserve (min)<input className={field} type="number" step="any" min={0} name="reserve" value={parameterDraft.reserve} onChange={event => setParameterDraft(current => ({ ...current, reserve: event.target.value }))} required /></label>
        <p className="text-xs text-muted-foreground">Simulation : camps fictifs, durées estimées et segments directs. Le terrain n’est pas validé.</p>
        <Button type="submit">{action === 'template' ? 'Enregistrer le modèle' : 'Enregistrer la mission'}</Button>
      </form>}
      {stage > 1 && <Button variant="outline" onClick={() => { setStage(stage - 1); setPersisted(null); }}>Retour à l’étape précédente</Button>}
      {persisted && !parametersDirty && <Button variant="outline" onClick={() => { if (canLeave()) open(createEmptyMission(mission.regionId, uid()), action === 'template' ? 'template' : 'new'); }}>{action === 'template' ? 'Créer un autre modèle' : 'Préparer une autre mission'}</Button>}
      {persisted && JSON.stringify(persisted) === JSON.stringify(mission) && !parametersDirty && action === 'new' && <Button disabled={!trackingReady} onClick={start}>Démarrer cette mission</Button>}
    </fieldset>}
    </div>
  );
  return <>
    <Panel title="Préparation de mission" description="Créer, préparer ou retrouver une mission" collapsible className={className} contentClassName="overflow-y-auto p-0">
      <PlanningGate loadingTitle="Chargement des missions" coverageTitle="Ouvrez Jezero pour préparer une mission" offerRegion>
        <ActionPanels<Action> label="Actions de préparation de mission" value={action} disabled={busy} onChange={changeAction} options={[
          { value: 'new', label: 'Nouvelle mission' },
          { value: 'saved', label: 'Missions enregistrées' },
          { value: 'history', label: 'Historique' },
        ]}>{content}</ActionPanels>
      </PlanningGate>
    </Panel>
    <Panel title="Modèles de mission" description="Préparations réutilisables pour vos sorties" collapsible className={className} contentClassName="overflow-y-auto p-0">
      <PlanningGate loadingTitle="Chargement des modèles" coverageTitle="Ouvrez Jezero pour préparer un modèle">
        <ActionPanels<Action> label="Actions sur les modèles de mission" value={action} disabled={busy} onChange={changeAction} options={[
          { value: 'template', label: 'Nouveau modèle' },
          { value: 'templates', label: 'Modèles enregistrés' },
        ]}>{content}</ActionPanels>
      </PlanningGate>
    </Panel>
  </>;
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

