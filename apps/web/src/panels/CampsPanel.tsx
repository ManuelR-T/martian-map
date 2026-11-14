import { useEffect, useState } from 'react';
import type { Camp } from '@marps/mission-core';
import { Button, Panel } from '@marps/ui';
import { usePlannerState } from '../state/PlannerProvider';
import { MissionDatabase } from '../storage/missionDatabase';
import { ActionPanels } from './ActionPanels';
import { formatCoordinate } from '../format';
import { baseField, notifyBaseRecordsChanged } from './baseControls';

export function CampsPanel({ className }: { className?: string }) {
  const { catalog, mission } = usePlannerState();
  const [database] = useState(() => new MissionDatabase());
  const [camps, setCamps] = useState<Camp[]>([]);
  const [action, setAction] = useState<'search' | 'create' | 'edit'>('search');
  const [selected, setSelected] = useState<Camp | null>(null);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('Chargement des camps…');
  useEffect(() => {
    let active = true;
    database.camps().then(values => { if (active) { setCamps(values); setStatus(''); } }).catch(() => { if (active) setStatus('Impossible de charger les camps.'); });
    return () => { active = false; };
  }, [database]);
  const extent = catalog.status === 'ready' ? catalog.data.coverage?.find(r => r.id === mission.regionId)?.extent : undefined;
  const run = async (operation: () => Promise<void>) => {
    setBusy(true); setStatus('');
    try { await operation(); setCamps(await database.camps()); notifyBaseRecordsChanged(); }
    catch (error) { setStatus(error instanceof Error ? error.message : 'Impossible d’enregistrer le camp.'); }
    finally { setBusy(false); }
  };
  const filtered = camps.filter(c => c.name.toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr')));
  return <Panel title="Camps" description="Un catalogue indépendant des missions" collapsible className={className} contentClassName="overflow-y-auto p-0">
    <ActionPanels<'search' | 'create' | 'edit'> label="Actions sur les camps" value={action} disabled={busy}
      options={[{ value: 'search', label: 'Camps enregistrés' }, { value: 'create', label: 'Nouveau camp' }, ...(action === 'edit' ? [{ value: 'edit' as const, label: 'Modifier le camp' }] : [])]}
      onChange={next => { if (next === action) return; setAction(next); setSelected(null); setStatus(''); }}>
    <div className="grid gap-3 text-sm">
      <p role="status">{status}</p>
      {action === 'search' && <>
        <label>Rechercher par nom<input className={baseField} type="search" value={query} onChange={event => setQuery(event.target.value)} /></label>
        <p>{filtered.length} camp{filtered.length > 1 ? 's' : ''} enregistré{filtered.length > 1 ? 's' : ''}</p>
        {filtered.length === 0 && <p>Aucun camp trouvé. Ouvrez le panneau « Nouveau camp » pour en ajouter un.</p>}
        <ul className="grid list-none gap-2 p-0">{filtered.map(camp => <li key={camp.id} className="grid gap-2 border p-3">
          <p className="font-semibold">{camp.name}</p><p>{camp.regionId} · {formatCoordinate(camp.position)}</p>
          <p className="text-xs text-muted-foreground">{camp.note}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={busy} onClick={() => { setSelected(camp); setAction('edit'); setStatus(''); }}>Modifier</Button>
            <Button variant="outline" disabled={busy} onClick={() => {
              if (!window.confirm(`Supprimer « ${camp.name} » du catalogue ? Les missions déjà préparées conserveront leur copie du camp.`)) return;
              void run(async () => { await database.deleteCamp(camp.id); setStatus('Camp supprimé du catalogue.'); });
            }}>Supprimer</Button>
          </div>
        </li>)}</ul>
      </>}
      {(action === 'create' || (action === 'edit' && selected)) && <form key={selected?.id ?? 'new'} className="grid gap-3" onSubmit={event => {
        event.preventDefault(); const data = new FormData(event.currentTarget);
        const camp: Camp = { id: selected?.id ?? crypto.randomUUID(), name: String(data.get('name')).trim(), regionId: selected?.regionId ?? mission.regionId,
          position: { longitude: Number(data.get('longitude')), latitude: Number(data.get('latitude')) }, provenance: 'simulation',
          note: selected?.note ?? 'Camp fictif de simulation. Terrain et habitabilité non validés.', referenceUrl: selected?.referenceUrl ?? null };
        void run(async () => { await database.saveCamp(camp); setStatus('Camp enregistré. Il est disponible dans la préparation des missions.'); setSelected(null); setAction('search'); setQuery(''); });
      }}>
        <fieldset disabled={busy || catalog.status !== 'ready'} className="grid min-w-0 gap-3">
          <p className="text-xs text-muted-foreground">Camp fictif dans le secteur Jezero. Ces coordonnées ne désignent pas une base NASA confirmée.</p>
          <label>Nom du camp<input className={baseField} name="name" defaultValue={selected?.name ?? ''} required pattern=".*\S.*" maxLength={120} /></label>
          <label>Longitude est (°)<input className={baseField} name="longitude" type="number" step="any" min={extent?.west ?? -180} max={extent?.east ?? 180} defaultValue={selected?.position.longitude} required /></label>
          <label>Latitude planétocentrique (°)<input className={baseField} name="latitude" type="number" step="any" min={extent?.south ?? -90} max={extent?.north ?? 90} defaultValue={selected?.position.latitude} required /></label>
          <Button type="submit">Enregistrer le camp</Button>
        </fieldset>
      </form>}
    </div>
    </ActionPanels>
  </Panel>;
}
