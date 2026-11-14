import type { DatasetDescriptor } from '@marps/data';
import { DataState, Panel } from '@marps/ui';
import { usePlannerState } from '../state/PlannerProvider';

export function DatasetProvenance({ dataset }: { dataset: DatasetDescriptor }) {
  const d = dataset;
  const status = d.status === 'unavailable' ? 'Inconnu / indisponible'
    : ['elevation', 'basemap', 'slope', 'hillshade'].includes(d.kind) ? 'Calculé à partir de mesures' : 'Mesuré';
  return (
    <details className="border-t py-2 text-sm">
      <summary className="min-h-11 cursor-pointer py-2 font-semibold">{d.title} · {status}</summary>
      <dl className="space-y-2 break-words py-2">
        <div><dt className="font-semibold">Disponibilité</dt><dd>{d.status === 'available' ? 'Disponible dans l’emprise déclarée' : d.status === 'partial' ? 'Couverture partielle, données absentes possibles' : 'Indisponible'}</dd></div>
        <div><dt className="font-semibold">Source</dt><dd><a className="underline" href={d.source.url}>{d.source.credit}</a></dd></div>
        <div><dt className="font-semibold">Instrument</dt><dd>{d.instrument}</dd></div>
        <div><dt className="font-semibold">Date / sol</dt><dd>{d.acquisition.date ?? 'Date inconnue'} / {d.acquisition.sol ?? 'Sol inconnu'}. {d.acquisition.note}</dd></div>
        <div><dt className="font-semibold">Unités</dt><dd>{Object.entries(d.units).map(([key, value]) => `${key} : ${value}`).join(' ; ') || 'Sans unité'}</dd></div>
        <div><dt className="font-semibold">Résolution</dt><dd>{d.resolution ? `${d.resolution.value} ${d.resolution.unit}` : 'Non applicable (données vectorielles)'}</dd></div>
        <div><dt className="font-semibold">Emprise (degrés planétocentriques, est positif)</dt><dd>O {d.extent.west} ; S {d.extent.south} ; E {d.extent.east} ; N {d.extent.north}</dd></div>
        <div><dt className="font-semibold">Version</dt><dd>{d.version} · consultation {d.source.retrievedAt}</dd></div>
      </dl>
      {d.limitations.map((limit) => <p key={limit} className="mb-2">{limit}</p>)}
    </details>
  );
}

export function SourcesPage() {
  const { catalog } = usePlannerState();
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8 sm:px-8">
      <div>
        <a href="#/" className="inline-flex min-h-11 items-center text-sm underline">Retour à la planification</a>
        <h2 className="heading-display mt-3 text-3xl font-bold">Sources et limites</h2>
        <p className="mt-3 text-muted-foreground">Les données et les hypothèses pour interpréter votre mission.</p>
      </div>
      <Panel title="Interpréter les résultats">
        <div className="space-y-3 text-sm">
          <p>Mesuré : observation issue d’un instrument. Calculé : résultat dérivé de mesures ou de paramètres. Simulé : scénario hypothétique. Inconnu / indisponible : aucune donnée exploitable.</p>
          <p>Le fond mondial sert à l’orientation. Il ne fournit pas les détails de Jezero partout sur Mars. Les détails sont limités aux emprises indiquées pour chaque source.</p>
          <p>Aucune validation opérationnelle. Tout tracé de mission est hypothétique ; sa praticabilité n’est pas validée sur le terrain.</p>
          <p>La météo historique au rover ne constitue ni une prévision ni une mesure sur tout le secteur. Le relief ne permet pas de détecter les obstacles plus petits que sa résolution.</p>
          <p>Vitesse, durée de sortie, durées d’observation, réserve et seuils : non renseignés dans cette version. Aucun budget disponible tant que ces entrées manquent.</p>
        </div>
      </Panel>
      {catalog.status === 'ready' ? <>
        <p className="text-sm text-muted-foreground">Catalogue figé le {catalog.data.manifest.generatedAt}. Sources disponibles au catalogue ; leur présence ne signifie pas qu’une couche est affichée.</p>
        {catalog.data.manifest.regions.map((region) => (
          <Panel key={region.id} title={region.name}>
            {catalog.data.datasets.filter((d) => d.regionId === region.id).map((dataset) => <DatasetProvenance key={dataset.id} dataset={dataset} />)}
            {region.capabilities.filter((c) => c.status === 'unavailable').map((c) => <p key={c.id} className="my-2 text-sm">{c.label} · Inconnu / indisponible. {c.reason}</p>)}
          </Panel>
        ))}
      </> : <DataState kind={catalog.status} title={catalog.status === 'loading' ? 'Chargement des sources' : 'Sources indisponibles'} />}
    </div>
  );
}

export function SiteProvenance({ siteId }: { siteId: string }) {
  const { catalog } = usePlannerState();
  if (catalog.status !== 'ready') return <p>Provenance inconnue / indisponible.</p>;
  const site = catalog.data.manifest.sites.find((s) => s.id === siteId);
  const dataset = site && catalog.data.datasets.find((d) => d.id === site.datasetId && d.regionId === site.regionId);
  return dataset ? <DatasetProvenance dataset={dataset} /> : <p>Provenance du site inconnue / indisponible.</p>;
}
