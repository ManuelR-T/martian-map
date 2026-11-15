import { localize } from '@marps/ui';
import '../i18n';
import { useEffect, useState } from 'react';
import type { Camp } from '@marps/mission-core';
import { Button } from '@marps/ui';
import { usePlannerState } from '../state/PlannerProvider';
import { MissionDatabase } from '../storage/missionDatabase';
import { formatCoordinate } from '../format';
import { confirmAction } from '../confirm';
import { baseField, notifyBaseRecordsChanged } from './baseControls';

/** Camp catalog without its panel, shown in the « Camps » tab of the mission panel. */
export function CampsManager() {
  const { catalog, mission } = usePlannerState();
  const [database] = useState(() => new MissionDatabase());
  const [camps, setCamps] = useState<Camp[]>([]);
  const [action, setAction] = useState<'search' | 'create' | 'edit'>('search');
  const [selected, setSelected] = useState<Camp | null>(null);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(localize("Chargement des camps…"));
  useEffect(() => {
    let active = true;
    database.camps().then(values => { if (active) { setCamps(values); setStatus(''); } }).catch(() => { if (active) setStatus(localize("Impossible de charger les camps.")); });
    return () => { active = false; };
  }, [database]);
  const extent = catalog.status === 'ready' ? catalog.data.coverage?.find(r => r.id === mission.regionId)?.extent : undefined;
  const run = async (operation: () => Promise<void>) => {
    setBusy(true); setStatus('');
    try { await operation(); setCamps(await database.camps()); notifyBaseRecordsChanged(); }
    catch (error) { setStatus(error instanceof Error ? error.message : localize("Impossible d’enregistrer le camp.")); }
    finally { setBusy(false); }
  };
  const filtered = camps.filter(c => c.name.toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr')));
  return <div className="grid gap-3 text-sm">
      <p role="status" className="empty:hidden">{localize(status)}</p>
      {action === 'search' && <>
        <Button className="justify-self-start" disabled={busy} onClick={() => { setAction('create'); setSelected(null); setStatus(''); }}>{localize("Nouveau camp")}</Button>
        <label>{localize("Rechercher par nom")}<input className={baseField} type="search" value={query} onChange={event => setQuery(event.target.value)} /></label>
        <p>{localize(filtered.length)} {localize("camp")}{filtered.length > 1 ? 's' : ''} {localize("enregistré")}{filtered.length > 1 ? 's' : ''}</p>
        {filtered.length === 0 && <p>{localize("Aucun camp trouvé.")}</p>}
        <ul className="grid list-none gap-2 p-0">{filtered.map(camp => <li key={camp.id} className="grid gap-2 border p-3">
          <p className="font-semibold">{localize(camp.name)}</p><p>{localize(camp.regionId)} {localize("·")} {formatCoordinate(camp.position)}</p>
          <p className="text-xs text-muted-foreground">{localize(camp.note)}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={busy} onClick={() => { setSelected(camp); setAction('edit'); setStatus(''); }}>{localize("Modifier")}</Button>
            <Button variant="danger" disabled={busy} aria-label={localize("Supprimer le camp {{v0}}", { v0: camp.name })} onClick={async () => {
              if (!await confirmAction(localize("Supprimer « {{v0}} » du catalogue ? Les missions déjà préparées conserveront leur copie du camp.", { v0: camp.name }), { confirmLabel: localize("Supprimer"), destructive: true })) return;
              void run(async () => { await database.deleteCamp(camp.id); setStatus(localize("Camp supprimé du catalogue.")); });
            }}>{localize("Supprimer")}</Button>
          </div>
        </li>)}</ul>
      </>}
      {(action === 'create' || (action === 'edit' && selected)) && <form key={selected?.id ?? 'new'} className="grid gap-3" onSubmit={event => {
        event.preventDefault(); const data = new FormData(event.currentTarget);
        const camp: Camp = { id: selected?.id ?? crypto.randomUUID(), name: String(data.get('name')).trim(), regionId: selected?.regionId ?? mission.regionId,
          position: { longitude: Number(data.get('longitude')), latitude: Number(data.get('latitude')) }, provenance: 'simulation',
          note: selected?.note ?? localize("Camp fictif de simulation. Terrain et habitabilité non validés."), referenceUrl: selected?.referenceUrl ?? null };
        void run(async () => { await database.saveCamp(camp); setStatus(localize("Camp enregistré. Il est disponible dans la préparation des missions.")); setSelected(null); setAction('search'); setQuery(''); });
      }}>
        <fieldset disabled={busy || catalog.status !== 'ready'} className="grid min-w-0 gap-3">
          <p className="text-xs text-muted-foreground">{localize("Camp fictif dans le secteur Jezero. Ces coordonnées ne désignent pas une base NASA confirmée.")}</p>
          <label>{localize("Nom du camp")}<input className={baseField} name="name" defaultValue={selected?.name ?? ''} required pattern=".*\S.*" maxLength={120} /></label>
          <label>{localize("Longitude est (°)")}<input className={baseField} name="longitude" type="number" step="any" min={extent?.west ?? -180} max={extent?.east ?? 180} defaultValue={selected?.position.longitude} required /></label>
          <label>{localize("Latitude planétocentrique (°)")}<input className={baseField} name="latitude" type="number" step="any" min={extent?.south ?? -90} max={extent?.north ?? 90} defaultValue={selected?.position.latitude} required /></label>
          <Button type="submit">{localize("Enregistrer le camp")}</Button>
          <Button type="button" variant="outline" onClick={() => { setAction('search'); setSelected(null); setStatus(''); }}>{localize("Annuler")}</Button>
        </fieldset>
      </form>}
    </div>;
}
