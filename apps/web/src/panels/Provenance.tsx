import { locale } from '../i18n';
import { localize } from '@marps/ui';
import '../i18n';
import { GlobalAtlasReferences } from '../features/map/GlobalAtlas';
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
      <summary className="min-h-11 cursor-pointer py-2 font-semibold">{localize(d.title)} {localize("·")} <ProvenanceBadge status={datasetScientificStatus(d)} /></summary>
      <dl className="space-y-2 break-words py-2">
        <div><dt className="font-semibold">{localize("Disponibilité")}</dt><dd>{localize(d.status === 'available' ? localize("Disponible dans l’emprise déclarée") : d.status === 'partial' ? localize("Couverture partielle, données absentes possibles") : localize("Inconnu / indisponible"))}</dd></div>
        <div><dt className="font-semibold">{localize("Source")}</dt><dd><a className="underline" href={d.source.url}>{localize(d.source.credit)}</a></dd></div>
        <div><dt className="font-semibold">{localize("Instrument")}</dt><dd>{localize(d.instrument)}</dd></div>
        <div><dt className="font-semibold">{localize("Date / sol")}</dt><dd>{localize(d.acquisition.date ?? 'Date inconnue')} {localize("/")} {localize(d.acquisition.sol ?? localize("Sol inconnu"))}{localize(".")} {localize(d.acquisition.note)}</dd></div>
        <div><dt className="font-semibold">{localize("Unités")}</dt><dd>{localize(Object.entries(d.units).map(([key, value]) => `${quantityLabels[key] ?? key} : ${unitLabels[value] ?? value}`).join(' ; ') || localize("Sans unité"))}</dd></div>
        <div><dt className="font-semibold">{localize("Résolution de la source")}</dt><dd>{localize(d.resolution ? `${d.resolution.value} ${d.resolution.unit}` : (d.kind === 'sites' || d.kind === 'terrain-annotations') ? localize("Non applicable (données vectorielles)") : 'Inconnue')}</dd></div>
        {d.tileset ? <div><dt className="font-semibold">{localize("Échantillonnage local le plus fin")}</dt><dd>{d.tileset.finestMetresPerPixel.toLocaleString(locale(), { maximumFractionDigits: 2 })} {localize("m/pixel. Le zoom ne crée pas de détail supplémentaire.")}</dd></div> : null}
        {d.raster ? <div><dt className="font-semibold">{localize("Maille du relief")}</dt><dd>{localize(d.raster.pixelSizeMetres)} {localize("m : un pas d’échantillonnage, pas une précision de navigation. Les obstacles plus petits ne sont pas résolus.")}</dd></div> : null}
        <div><dt className="font-semibold">{localize("Emprise (degrés planétocentriques, est positif)")}</dt><dd>{localize("O")} {localize(d.extent.west)} {localize("; S")} {localize(d.extent.south)} {localize("; E")} {localize(d.extent.east)} {localize("; N")} {localize(d.extent.north)}</dd></div>
        <div><dt className="font-semibold">{localize("Version")}</dt><dd>{localize(d.version)} {localize("· consultation")} {localize(d.source.retrievedAt)}</dd></div>
        {d.kind === 'elevation' ? <div><dt className="font-semibold">{localize("Référence verticale")}</dt><dd>{d.verticalDatum ?? 'Inconnue'}</dd></div> : null}
        {d.derivedFrom ? <div><dt className="font-semibold">{localize("Dérivé de")}</dt><dd>{parent ? `${parent.title} · version ${parent.version}` : localize("Source dérivée inconnue / indisponible")}</dd></div> : null}
        <div><dt className="font-semibold">{localize("Conditions d’usage")}</dt><dd><a className="underline" href={d.source.terms.url}>{localize(d.source.terms.summary)}</a>{localize(!d.source.terms.verified && localize(" Conditions non vérifiées."))}</dd></div>
      </dl>
      {d.limitations.map((limit) => <p key={limit} className="mb-2">{localize(limit)}</p>)}
    </details>
  );
}

function ScienceReference({ sourceId }: { sourceId: ScienceSourceId }) {
  const source = findScienceSource(sourceId);
  if (!source) return <span>{localize("Source inconnue / indisponible.")}</span>;
  return (
    <span>
      <a className="underline" href={source.url}>{localize(source.title)}</a> {localize("·")} {localize(source.publisher)}{localize(".")} {localize(' ')}{localize("Publication :")} {localize(source.publishedAt ?? 'date inconnue')} {localize("; consultation :")} {localize(source.consultedAt)}{localize(".")} </span>
  );
}

export function RegionCapabilities({ region, manifest }: { region: RegionCoverage; manifest: DataManifest }) {
  return (
    <ul className="my-3 space-y-2 text-sm" aria-label={localize("Disponibilité des données : {{v0}}", { v0: region.name })}>
      {region.capabilities.map((capability) => {
        const status = capabilityStatus(manifest, region.id, capability.id);
        return <li key={capability.id}>
          {localize(capability.label)} {localize("·")} {status === 'unavailable'
            ? <><ProvenanceBadge status="unknown" /> {localize("Indisponible.")} {capability.reason ?? localize("Aucune donnée exploitable déclarée pour ce secteur.")}</>
            : status === 'partial' ? localize("Couverture partielle dans l’emprise déclarée.") : localize("Disponible dans l’emprise déclarée.")}
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
        <a href="#/" className="inline-flex min-h-11 items-center text-sm underline">{localize("Retour à la planification")}</a>
        <h2 className="heading-display mt-3 text-3xl font-bold">{localize("Sources et limites")}</h2>
        <p className="mt-3 text-muted-foreground">{localize("Les données et les hypothèses pour interpréter votre mission.")}</p>
      </div>
      <Panel title={localize("Atlas mondial de Mars")} collapsible defaultOpen={false}><GlobalAtlasReferences /></Panel>
      <Panel title={localize("Légende et limites")} collapsible defaultOpen={false}>
        <div className="space-y-3 text-sm">
          <p><ProvenanceBadge status="interpreted" /> {localize("Visual interpretation of imagery; not a measurement of terrain safety.")}</p>
          <p><ProvenanceBadge status="measured" /> {localize("Observation issue d’un instrument.")}</p>
          <p><ProvenanceBadge status="calculated" /> {localize("Résultat dérivé de mesures ou de paramètres.")}</p>
          <p><ProvenanceBadge status="simulated" /> {localize("Scénario hypothétique, notamment l’éclairage du relief ombré.")}</p>
          <p><ProvenanceBadge status="unknown" /> {localize("Aucune donnée exploitable ; une absence n’est jamais un zéro.")}</p>
          <p>{localize("Le fond mondial sert à l’orientation. Il ne fournit pas les détails de Jezero partout sur Mars. Les détails sont limités aux emprises indiquées pour chaque source.")}</p>
          <p>{localize("Aucune validation opérationnelle. Tout tracé de mission est hypothétique ; sa praticabilité n’est pas validée sur le terrain.")}</p>
          <p>{localize("La météo historique au rover ne constitue ni une prévision ni une mesure sur tout le secteur. Le relief ne permet pas de détecter les obstacles plus petits que sa résolution.")}</p>
          <MissionAssumptions assumptions={selectMissionAssumptions(state)} />
        </div>
      </Panel>
      {catalog.status === 'ready' ? <>
        <p className="text-sm text-muted-foreground">{localize("Catalogue figé le")} {localize(catalog.data.manifest.generatedAt)}{localize(". Sources disponibles au catalogue ; leur présence ne signifie pas qu’une couche est affichée.")}</p>
        {catalog.data.manifest.regions.map((region) => (
          <Panel key={region.id} title={region.name} collapsible defaultOpen={false}>
            <RegionCapabilities region={region} manifest={catalog.data.manifest} />
            {catalog.data.datasets.filter((d) => d.regionId === region.id).map((dataset) => <DatasetProvenance key={dataset.id} dataset={dataset} datasets={catalog.data.datasets} />)}
          </Panel>
        ))}
        <Panel title={localize("Références des fiches de site")} collapsible defaultOpen={false}>
          {catalog.data.manifest.sites.map((site) => <div key={site.id} className="border-t py-2">
            <h3 className="font-semibold">{localize(site.name)}</h3>
            <SiteScienceProvenance sheet={findSiteSheet(site.id)} />
          </div>)}
        </Panel>
      </> : <DataState kind={catalog.status} title={catalog.status === 'loading' ? localize("Chargement des sources") : 'Sources indisponibles'} />}
    </div>
  );
}

export function SiteScienceProvenance({ sheet }: { sheet: SiteSheet | undefined }) {
  if (!sheet) return <p className="text-sm">{localize("Références scientifiques inconnues / indisponibles.")}</p>;
  return (
    <details className="py-2 text-sm">
      <summary className="min-h-11 cursor-pointer py-2 font-semibold">{localize("Sources de l’objectif, du rover et des activités")}</summary>
      <dl className="space-y-3 break-words py-2">
        <div><dt className="font-semibold">{localize("Objectif proposé ·")} <ProvenanceBadge status="simulated" /></dt><dd>{localize("Choix de l’équipe d’après :")} {sheet.objectiveSourceIds.map((id) => <p key={id}><ScienceReference sourceId={id} /></p>)}</dd></div>
        <div><dt className="font-semibold">{localize("Observations historiques du rover ·")} <ProvenanceBadge status="measured" /></dt><dd><ScienceReference sourceId={sheet.roverWork.sourceId} /></dd></div>
        <div><dt className="font-semibold">{localize("Photo du rover ·")} <ProvenanceBadge status="measured" /></dt><dd>{localize("Sol")} {localize(sheet.photo.sol)} {localize("·")} {localize(sheet.photo.credit)}{localize(".")} <a className="underline" href={sheet.photo.originalUrl}>{localize("Image originale")}</a>{localize(".")} <ScienceReference sourceId={sheet.photo.sourceId} /></dd></div>
        <div><dt className="font-semibold">{localize("Activités et durées ·")} <ProvenanceBadge status="simulated" /></dt><dd>{localize("Tâches et minutes choisies par l’équipe ; aucune durée de travail humain sur Mars mesurée. Procédure inspirée de :")} <ScienceReference sourceId={sheet.tasksSourceId} /></dd></div>
      </dl>
    </details>
  );
}

export function SitePositionProvenance({ site, dataset }: { site: SiteDescriptor; dataset: DatasetDescriptor | undefined }) {
  const known = dataset && dataset.status !== 'unavailable';
  return (
    <div className="space-y-2 break-words text-sm">
      <p><ProvenanceBadge status={known ? 'measured' : 'unknown'} /> {localize("Position du prélèvement :")} {localize(known ? `latitude ${site.coordinate.latitude}° ; longitude ${site.coordinate.longitude}° (est positif)` : 'inconnue / indisponible')}{localize(".")}</p>
      <p>{localize("Date / sol du prélèvement :")} {localize(site.date || 'date inconnue')} {localize("/")} {localize(site.sol || localize("sol inconnu"))}{localize(".")}</p>
      <p>{localize("Altitude du prélèvement :")} <ProvenanceBadge status={known && site.elevation !== null ? 'measured' : 'unknown'} /> {localize(known && site.elevation ? `${site.elevation.value} m` : 'inconnue / indisponible')}{localize(". Référence verticale :")} {localize(known ? site.elevation?.datum ?? 'inconnue' : 'inconnue')}{localize(". Ne pas mélanger cette altitude avec celles du relief.")}</p>
    </div>
  );
}

export function SiteProvenance({ siteId }: { siteId: string }) {
  const { catalog } = usePlannerState();
  if (catalog.status !== 'ready') return <p>{localize("Provenance inconnue / indisponible.")}</p>;
  const site = catalog.data.manifest.sites.find((s) => s.id === siteId);
  if (!site) return <p>{localize("Provenance du site inconnue / indisponible.")}</p>;
  const dataset = catalog.data.datasets.find((d) => d.id === site.datasetId && d.regionId === site.regionId);
  return <details className="mt-3 border-t text-sm">
    <summary className="min-h-11 cursor-pointer py-3 font-semibold">{localize("Position et sources du site")}</summary>
    <SitePositionProvenance site={site} dataset={dataset} />
    <SiteScienceProvenance sheet={findSiteSheet(siteId)} />
    {dataset ? <DatasetProvenance dataset={dataset} datasets={catalog.data.datasets} /> : <p>{localize("Source de la position inconnue / indisponible.")}</p>}
  </details>;
}
