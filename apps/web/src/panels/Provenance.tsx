import {
  capabilityStatus,
  datasetScientificStatus,
  findScienceSource,
  findSiteSheet,
  type DatasetDescriptor,
  type DataManifest,
  type RegionCoverage,
  type ScienceSourceId,
  type SiteDescriptor,
  type SiteSheet,
} from '@marps/data';
import { DataState, Panel, ProvenanceBadge } from '@marps/ui';
import { usePlannerState } from '../state/PlannerProvider';
import { selectMissionAssumptions } from '../state/planner';
import { MissionAssumptions } from './MissionAssumptions';

const quantityLabels: Readonly<Record<string, string>> = { elevation: 'Altitude', slope: 'Pente', longitude: 'Longitude', latitude: 'Latitude' };
const unitLabels: Readonly<Record<string, string>> = { metre: 'm', degree: '°' };

export function DatasetProvenance({ dataset: d, datasets = [] }: {
  dataset: DatasetDescriptor;
  datasets?: readonly DatasetDescriptor[];
}) {
  const parent = datasets.find((candidate) => candidate.id === d.derivedFrom && candidate.regionId === d.regionId);
  return (
    <details className="border-t py-2 text-sm">
      <summary className="min-h-11 cursor-pointer py-2 font-semibold">{d.title} · <ProvenanceBadge status={datasetScientificStatus(d)} /></summary>
      <dl className="space-y-2 break-words py-2">
        <div><dt className="font-semibold">Disponibilité</dt><dd>{d.status === 'available' ? 'Disponible dans l’emprise déclarée' : d.status === 'partial' ? 'Couverture partielle, données absentes possibles' : 'Inconnu / indisponible'}</dd></div>
        <div><dt className="font-semibold">Source</dt><dd><a className="underline" href={d.source.url}>{d.source.credit}</a></dd></div>
        <div><dt className="font-semibold">Instrument</dt><dd>{d.instrument}</dd></div>
        <div><dt className="font-semibold">Date / sol</dt><dd>{d.acquisition.date ?? 'Date inconnue'} / {d.acquisition.sol ?? 'Sol inconnu'}. {d.acquisition.note}</dd></div>
        <div><dt className="font-semibold">Unités</dt><dd>{Object.entries(d.units).map(([key, value]) => `${quantityLabels[key] ?? key} : ${unitLabels[value] ?? value}`).join(' ; ') || 'Sans unité'}</dd></div>
        <div><dt className="font-semibold">Résolution de la source</dt><dd>{d.resolution ? `${d.resolution.value} ${d.resolution.unit}` : d.kind === 'sites' ? 'Non applicable (données vectorielles)' : 'Inconnue'}</dd></div>
        {d.tileset ? <div><dt className="font-semibold">Échantillonnage local le plus fin</dt><dd>{d.tileset.finestMetresPerPixel.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} m/pixel. Le zoom ne crée pas de détail supplémentaire.</dd></div> : null}
        {d.raster ? <div><dt className="font-semibold">Maille du relief</dt><dd>{d.raster.pixelSizeMetres} m : un pas d’échantillonnage, pas une précision de navigation. Les obstacles plus petits ne sont pas résolus.</dd></div> : null}
        <div><dt className="font-semibold">Emprise (degrés planétocentriques, est positif)</dt><dd>O {d.extent.west} ; S {d.extent.south} ; E {d.extent.east} ; N {d.extent.north}</dd></div>
        <div><dt className="font-semibold">Version</dt><dd>{d.version} · consultation {d.source.retrievedAt}</dd></div>
        {d.kind === 'elevation' ? <div><dt className="font-semibold">Référence verticale</dt><dd>{d.verticalDatum ?? 'Inconnue'}</dd></div> : null}
        {d.derivedFrom ? <div><dt className="font-semibold">Dérivé de</dt><dd>{parent ? `${parent.title} · version ${parent.version}` : 'Source dérivée inconnue / indisponible'}</dd></div> : null}
        <div><dt className="font-semibold">Conditions d’usage</dt><dd><a className="underline" href={d.source.terms.url}>{d.source.terms.summary}</a>{!d.source.terms.verified && ' Conditions non vérifiées.'}</dd></div>
      </dl>
      {d.limitations.map((limit) => <p key={limit} className="mb-2">{limit}</p>)}
    </details>
  );
}

function ScienceReference({ sourceId }: { sourceId: ScienceSourceId }) {
  const source = findScienceSource(sourceId);
  if (!source) return <span>Source inconnue / indisponible.</span>;
  return (
    <span>
      <a className="underline" href={source.url}>{source.title}</a> · {source.publisher}.
      {' '}Publication : {source.publishedAt ?? 'date inconnue'} ; consultation : {source.consultedAt}.
    </span>
  );
}

export function RegionCapabilities({ region, manifest }: { region: RegionCoverage; manifest: DataManifest }) {
  return (
    <ul className="my-3 space-y-2 text-sm" aria-label={`Disponibilité des données : ${region.name}`}>
      {region.capabilities.map((capability) => {
        const status = capabilityStatus(manifest, region.id, capability.id);
        return <li key={capability.id}>
          {capability.label} · {status === 'unavailable'
            ? <><ProvenanceBadge status="unknown" /> Indisponible. {capability.reason ?? 'Aucune donnée exploitable déclarée pour ce secteur.'}</>
            : status === 'partial' ? 'Couverture partielle dans l’emprise déclarée.' : 'Disponible dans l’emprise déclarée.'}
        </li>;
      })}
    </ul>
  );
}

export function SourcesPage() {
  const state = usePlannerState();
  const { catalog } = state;
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8 sm:px-8">
      <div>
        <a href="#/" className="inline-flex min-h-11 items-center text-sm underline">Retour à la planification</a>
        <h2 className="heading-display mt-3 text-3xl font-bold">Sources et limites</h2>
        <p className="mt-3 text-muted-foreground">Les données et les hypothèses pour interpréter votre mission.</p>
      </div>
      <Panel title="Interpréter les résultats">
        <div className="space-y-3 text-sm">
          <p><ProvenanceBadge status="measured" /> Observation issue d’un instrument.</p>
          <p><ProvenanceBadge status="calculated" /> Résultat dérivé de mesures ou de paramètres.</p>
          <p><ProvenanceBadge status="simulated" /> Scénario hypothétique, notamment l’éclairage du relief ombré.</p>
          <p><ProvenanceBadge status="unknown" /> Aucune donnée exploitable ; une absence n’est jamais un zéro.</p>
          <p>Le fond mondial sert à l’orientation. Il ne fournit pas les détails de Jezero partout sur Mars. Les détails sont limités aux emprises indiquées pour chaque source.</p>
          <p>Aucune validation opérationnelle. Tout tracé de mission est hypothétique ; sa praticabilité n’est pas validée sur le terrain.</p>
          <p>La météo historique au rover ne constitue ni une prévision ni une mesure sur tout le secteur. Le relief ne permet pas de détecter les obstacles plus petits que sa résolution.</p>
          <MissionAssumptions assumptions={selectMissionAssumptions(state)} />
        </div>
      </Panel>
      {catalog.status === 'ready' ? <>
        <p className="text-sm text-muted-foreground">Catalogue figé le {catalog.data.manifest.generatedAt}. Sources disponibles au catalogue ; leur présence ne signifie pas qu’une couche est affichée.</p>
        {catalog.data.manifest.regions.map((region) => (
          <Panel key={region.id} title={region.name}>
            <RegionCapabilities region={region} manifest={catalog.data.manifest} />
            {catalog.data.datasets.filter((d) => d.regionId === region.id).map((dataset) => <DatasetProvenance key={dataset.id} dataset={dataset} datasets={catalog.data.datasets} />)}
          </Panel>
        ))}
        <Panel title="Références des fiches de site">
          {catalog.data.manifest.sites.map((site) => <div key={site.id} className="border-t py-2">
            <h3 className="font-semibold">{site.name}</h3>
            <SiteScienceProvenance sheet={findSiteSheet(site.id)} />
          </div>)}
        </Panel>
      </> : <DataState kind={catalog.status} title={catalog.status === 'loading' ? 'Chargement des sources' : 'Sources indisponibles'} />}
    </div>
  );
}

export function SiteScienceProvenance({ sheet }: { sheet: SiteSheet | undefined }) {
  if (!sheet) return <p className="text-sm">Références scientifiques inconnues / indisponibles.</p>;
  return (
    <details className="py-2 text-sm">
      <summary className="min-h-11 cursor-pointer py-2 font-semibold">Sources de l’objectif, du rover et des activités</summary>
      <dl className="space-y-3 break-words py-2">
        <div><dt className="font-semibold">Objectif proposé · <ProvenanceBadge status="simulated" /></dt><dd>Choix de l’équipe d’après : {sheet.objectiveSourceIds.map((id) => <p key={id}><ScienceReference sourceId={id} /></p>)}</dd></div>
        <div><dt className="font-semibold">Observations historiques du rover · <ProvenanceBadge status="measured" /></dt><dd><ScienceReference sourceId={sheet.roverWork.sourceId} /></dd></div>
        <div><dt className="font-semibold">Photo du rover · <ProvenanceBadge status="measured" /></dt><dd>Sol {sheet.photo.sol} · {sheet.photo.credit}. <a className="underline" href={sheet.photo.originalUrl}>Image originale</a>. <ScienceReference sourceId={sheet.photo.sourceId} /></dd></div>
        <div><dt className="font-semibold">Activités et durées · <ProvenanceBadge status="simulated" /></dt><dd>Tâches et minutes choisies par l’équipe ; aucune durée de travail humain sur Mars mesurée. Procédure inspirée de : <ScienceReference sourceId={sheet.tasksSourceId} /></dd></div>
      </dl>
    </details>
  );
}

export function SitePositionProvenance({ site, dataset }: { site: SiteDescriptor; dataset: DatasetDescriptor | undefined }) {
  const known = dataset && dataset.status !== 'unavailable';
  return (
    <div className="space-y-2 break-words text-sm">
      <p><ProvenanceBadge status={known ? 'measured' : 'unknown'} /> Position du prélèvement : {known ? `latitude ${site.coordinate.latitude}° ; longitude ${site.coordinate.longitude}° (est positif)` : 'inconnue / indisponible'}.</p>
      <p>Date / sol du prélèvement : {site.date || 'date inconnue'} / {site.sol || 'sol inconnu'}.</p>
      <p>Altitude du prélèvement : <ProvenanceBadge status={known && site.elevation !== null ? 'measured' : 'unknown'} /> {known && site.elevation ? `${site.elevation.value} m` : 'inconnue / indisponible'}. Référence verticale : {known ? site.elevation?.datum ?? 'inconnue' : 'inconnue'}. Ne pas mélanger cette altitude avec celles du relief.</p>
    </div>
  );
}

export function SiteProvenance({ siteId }: { siteId: string }) {
  const { catalog } = usePlannerState();
  if (catalog.status !== 'ready') return <p>Provenance inconnue / indisponible.</p>;
  const site = catalog.data.manifest.sites.find((s) => s.id === siteId);
  if (!site) return <p>Provenance du site inconnue / indisponible.</p>;
  const dataset = catalog.data.datasets.find((d) => d.id === site.datasetId && d.regionId === site.regionId);
  return <div className="mt-3 border-t pt-3">
    <SitePositionProvenance site={site} dataset={dataset} />
    <SiteScienceProvenance sheet={findSiteSheet(siteId)} />
    {dataset ? <DatasetProvenance dataset={dataset} datasets={catalog.data.datasets} /> : <p>Source de la position inconnue / indisponible.</p>}
  </div>;
}
