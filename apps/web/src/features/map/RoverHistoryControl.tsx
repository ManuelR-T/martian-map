import { localize } from '@marps/ui';
import '../../i18n';
import type { RoverHistory } from '@marps/data';
import { Button } from '@marps/ui';
import { Footprints } from 'lucide-react';
import { roverLabel } from './roverLayer';
import { LayerSwitch } from './LayerSwitch';
export const roverMessages = {
  en: { toggle: 'Perseverance history', warning: 'Rover history — not a validated human route.', loading: 'Loading prepared history…', failure: 'History unavailable. Retry', snapshot: 'Snapshot', quality: 'Historical extract; metadata discrepancies', choose: 'Inspect a position or segment', close: 'Close', source: 'NASA/JPL-Caltech · historical sector extract' },
  fr: { toggle: 'Historique de Perseverance', warning: 'Historique du rover — pas un itinéraire humain validé.', loading: 'Chargement de l’historique préparé…', failure: 'Historique indisponible. Réessayer', snapshot: 'Instantané', quality: 'Extrait historique ; écarts de métadonnées', choose: 'Examiner une position ou un segment', close: 'Fermer', source: 'NASA/JPL-Caltech · extrait historique du secteur' },
};
const messages = new Proxy(roverMessages.fr, { get: (target, key: string) => localize(target[key as keyof typeof target]) });
export function RoverHistoryControl({ enabled, onToggle, history, failed, retry, selected, onSelect, candidates }: {
  enabled: boolean; onToggle: () => void; history: RoverHistory | null; failed: boolean; retry: () => void;
  candidates: readonly number[] | null;
  selected: number | null; onSelect: (index: number | null) => void;
}) {
  return <div className="mt-2 border-t pt-2">
    <LayerSwitch label={localize(messages.toggle)} icon={<Footprints aria-hidden="true" />} checked={enabled} onChange={onToggle} />
    {enabled && <>
      <p className="mt-2 font-semibold">{localize(messages.warning)}</p>
      {!history && <p role="status">{failed ? <Button className="min-h-11" onClick={retry}>{localize(messages.failure)}</Button> : messages.loading}</p>}
      {history && <>
        <p>{localize(messages.snapshot)}{localize(":")} {history.retrievedAt.slice(0, 10)} {localize("· Sol")} {Math.min(...history.features.map(f => f.properties.sol))}{localize("–")}{Math.max(...history.features.map(f => f.properties.sol))}</p>
        <details><summary>{localize(messages.quality)}{localize(":")} {localize(history.issues)}</summary><ul>{history.qualityNotes?.map((note, index) => <li key={index}>{localize(note)}</li>)}</ul></details>
        <a className="underline" href="https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_traverse.json">{localize(messages.source)}</a>
        <label className="mt-2 block">{localize(messages.choose)}
          <select className="min-h-11 w-full border bg-background text-foreground" value={selected ?? ''} onChange={event => onSelect(event.target.value === '' ? null : Number(event.target.value))}>
            <option value="">{localize("—")}</option>
            {history.features.map((feature, index) => (!candidates || candidates.includes(index)) && <option key={index} value={index}>{roverLabel(feature)}</option>)}
          </select>
        </label>
        {candidates && selected === null && <Button className="min-h-11" onClick={() => onSelect(null)}>{localize(messages.close)}</Button>}
        {selected !== null && history.features[selected] && <div className="mt-2"><p>{roverLabel(history.features[selected])}</p><Button className="min-h-11" onClick={() => onSelect(null)}>{localize(messages.close)}</Button></div>}
      </>}
    </>}
  </div>;
}
