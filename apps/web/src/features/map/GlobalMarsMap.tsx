import { locale } from '../../i18n';
import { localize } from '@marps/ui';
import '../../i18n';
import { useEffect, useRef, useState } from 'react';
import Map from 'ol/Map';
import { defaults as defaultControls } from 'ol/control';
import { MapInformation } from './MapInformation';
import { GlobalAtlas } from './GlobalAtlas';
import { MapPanelDock } from './MapPanelDock';
import View from 'ol/View';
import type BaseLayer from 'ol/layer/Base';
import TileLayer from 'ol/layer/Tile';
import ImageLayer from 'ol/layer/Image';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import ImageStatic from 'ol/source/ImageStatic';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { fromExtent } from 'ol/geom/Polygon';
import { Circle, Fill, Stroke, Style } from 'ol/style';
import { mapLabel, SECTOR_COLOUR } from './mapText';
import { detailedRegions, type DatasetDescriptor, type RegionCoverage } from '@marps/data';
import { Button, Panel } from '@marps/ui';
import { createGlobalMarsSource, marsProjection, resolutions } from './marsWmts';
import './global-mars-map.css';

interface Props {
  panelHost: HTMLElement | null;
  /** Orientation basemap of the whole planet. */
  dataset: DatasetDescriptor;
  /** Detailed regions of the manifest, shown as markers that open them. */
  regions: readonly RegionCoverage[];
  /** Detailed region opened without verified imagery: the basemap frames it and lists its capabilities. */
  focus?: RegionCoverage;
  onSelectRegion: (regionId: string) => void;
}

const WHOLE_MARS = [-180, -90, 180, 90];
/** Degrees added around a focused region so its surroundings stay readable on the 463 m basemap. */
const FOCUS_MARGIN = 1.5;

/** A region offers detailed data as soon as one of its capabilities is not unavailable. */
export const hasDetailedData = (region: RegionCoverage) => region.capabilities.some(capability => capability.status !== 'unavailable');

const statusLabels = { available: 'disponible', partial: 'partielle', unavailable: 'indisponible' } as const;
const degrees = (value: number) => value.toLocaleString(locale(), { minimumFractionDigits: 6, maximumFractionDigits: 6 });

function regionMarker(region: RegionCoverage, center: readonly [number, number]) {
  const ready = hasDetailedData(region);
  const feature = new Feature(new Point([...center]));
  feature.setId(region.id);
  feature.setStyle(new Style({
    image: new Circle({ radius: 7, fill: new Fill({ color: ready ? '#ffcc66' : 'rgba(21, 27, 37, 0.6)' }), stroke: new Stroke({ color: ready ? '#151b25' : '#ffcc66', width: 2 }) }),
    text: mapLabel(region.name, -22),
  }));
  return feature;
}

export function GlobalMarsMap({ panelHost, dataset, regions, focus, onSelectRegion }: Props) {
  const [atlasMap, setAtlasMap] = useState<Map | null>(null);
  const target = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const sourceRef = useRef<ReturnType<typeof createGlobalMarsSource> | null>(null);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [failed, setFailed] = useState(false);
  const [resolution, setResolution] = useState<number | null>(null);
  // One explanation, shown once, when every capability is unavailable for the same reason.
  const reasons = new Set(focus?.capabilities.map(capability => capability.reason));
  const sharedReason = reasons.size === 1 ? [...reasons][0] : undefined;
  useEffect(() => {
    const places = detailedRegions(regions);
    const source = createGlobalMarsSource(dataset);
    sourceRef.current = source;
    const base = import.meta.env.BASE_URL;
    const fallback = (file: string, imageExtent: number[]) => new ImageLayer({ source: new ImageStatic({
      url: `${base}data/mola/${file}.jpg`, projection: marsProjection, imageExtent,
      attributions: 'NASA / JPL-Caltech / GSFC — MGS MOLA, NASA Trek',
    }) });
    const markers = new VectorLayer({ source: new VectorSource({ wrapX: false, features: regions.map((region, index) =>
      regionMarker(region, [places[index]!.center.longitude, places[index]!.center.latitude])) }), zIndex: 10 });
    const layers: BaseLayer[] = [fallback('west', [-180, -90, 0, 90]), fallback('east', [0, -90, 180, 90]), new TileLayer({ source }), markers];
    if (focus) {
      const { west, south, east, north } = focus.extent;
      const outline = new Feature(fromExtent([west, south, east, north]));
      outline.setStyle(new Style({ stroke: new Stroke({ color: SECTOR_COLOUR, width: 2, lineDash: [6, 4] }) }));
      layers.push(new VectorLayer({ source: new VectorSource({ features: [outline], wrapX: false }), zIndex: 9 }));
    }
    const view = new View({ projection: marsProjection, center: [0, 0], resolutions, extent: WHOLE_MARS });
    const map = new Map({ controls: defaultControls({ attribution: false }), target: target.current!, layers, view });
    mapRef.current = map;
    setAtlasMap(map);
    if (focus) {
      const { west, south, east, north } = focus.extent;
      view.fit([west - FOCUS_MARGIN, south - FOCUS_MARGIN, east + FOCUS_MARGIN, north + FOCUS_MARGIN], { size: map.getSize() });
    } else {
      // The planet fills the stage, centred on the first region with data when the screen is too narrow for all of Mars.
      view.fit(WHOLE_MARS, { size: map.getSize() });
      const first = places.find((_, index) => hasDetailedData(regions[index]!)) ?? places[0];
      if (first) view.setCenter([first.center.longitude, 0]);
    }
    map.on('singleclick', event => {
      const id = map.forEachFeatureAtPixel(event.pixel, feature => feature.getId(), { layerFilter: layer => layer === markers });
      if (typeof id === 'string') onSelectRegion(id);
    });
    source.on('tileloaderror', () => setFailed(true));
    view.on('change:resolution', () => setResolution(view.getResolution() ?? null));
    const connectivity = () => { setOffline(!navigator.onLine); };
    window.addEventListener('online', connectivity);
    window.addEventListener('offline', connectivity);
    const resize = new ResizeObserver(() => map.updateSize());
    resize.observe(target.current!);
    return () => { resize.disconnect(); window.removeEventListener('online', connectivity); window.removeEventListener('offline', connectivity); map.dispose(); mapRef.current = null; sourceRef.current = null; };
  }, [dataset, regions, focus, onSelectRegion]);
  const retry = <Button variant="outline" size="sm" onClick={() => { setFailed(false); sourceRef.current?.refresh(); }}>{localize("Réessayer les tuiles")}</Button>;
  return <div className="mars-map-container">
    <div ref={target} className="mars-map" tabIndex={0} aria-label={focus
      ? localize("Carte d'orientation autour de {{v0}}. Flèches pour déplacer, plus et moins pour zoomer.", { v0: focus.name })
      : localize("Carte globale de Mars. Flèches pour déplacer, plus et moins pour zoomer.")} />
    <div className="map-notices">
      {focus && <div role="status" className="map-alert border bg-card p-3 text-sm">
        <p>{localize("Aucune donnée détaillée vérifiée pour {{v0}} : seul le fond d'orientation est affiché.", { v0: focus.name })}</p>
      </div>}
      {(failed || offline) && <div role="status" className="map-alert border bg-card p-3 text-sm">
        <p>{failed ? localize("Certaines tuiles sont indisponibles.") : localize("L’exploration globale nécessite internet. Ouvrez Jezero pour utiliser le secteur préparé.")}</p>
        {failed && retry}
      </div>}
    </div>
    {!focus && <MapPanelDock host={panelHost}><GlobalAtlas map={atlasMap} /></MapPanelDock>}
    {focus && <MapPanelDock host={panelHost}>
      <Panel title={localize("Données de {{v0}}", { v0: focus.name })} floating className="text-sm" collapsible={false}>
        {sharedReason && <p className="mb-2 text-muted-foreground">{localize(sharedReason)}</p>}
        <ul className="space-y-2">{focus.capabilities.map(capability => <li key={capability.id}>
          <p><span className="font-medium">{localize(capability.label)}</span> · {localize(statusLabels[capability.status])}</p>
          {!sharedReason && capability.reason && <p className="text-muted-foreground">{localize(capability.reason)}</p>}
        </li>)}</ul>
      </Panel>
    </MapPanelDock>}
    <MapInformation>
      <div className="flex flex-wrap items-center gap-2">
        {regions.filter(region => region.id !== focus?.id).map(region =>
          <Button key={region.id} size="sm" className="px-2" variant={hasDetailedData(region) ? 'default' : 'outline'} onClick={() => onSelectRegion(region.id)}>{localize("Ouvrir")} {region.name}</Button>)}
        {!focus && <Button size="sm" className="px-2" variant="outline" onClick={() => mapRef.current?.getView().fit(WHOLE_MARS, { size: mapRef.current.getSize(), duration: 250 })}>{localize("Mars entière")}</Button>}
      </div>
      <p role="status">{failed ? localize("Certaines tuiles sont indisponibles.") : offline ? localize("L’exploration globale nécessite internet. Ouvrez Jezero pour utiliser le secteur préparé.") : localize("Carte disponible. Les détails globaux se chargent en ligne.")} {localize("Glissez pour explorer Mars ; utilisez la molette ou + / − pour zoomer.")}</p>
      {failed && retry}
      <div className="map-metadata">
        <p className="mt-2">{localize(dataset.title)} {localize("· Échantillonnage nominal :")} {localize(dataset.resolution?.value ?? localize("inconnu"))} {localize("m/pixel.")} {resolution !== null && `${localize("Vue :")} ${degrees(resolution)}°/pixel.`} {localize("Le fond de secours est moins détaillé. La planification n'est proposée que dans les régions aux données vérifiées.")}</p>
        <p>{localize("Couverture :")} {degrees(dataset.extent.west)}{localize("° à")} {degrees(dataset.extent.east)}{localize("° E ;")} {degrees(dataset.extent.south)}{localize("° à")} {degrees(dataset.extent.north)}{localize("° N.")}</p>
        <p>{localize("Repères des régions : centre de leur secteur déclaré dans le manifeste. Le fond global est destiné à l’orientation.")}</p>
        <a className="underline" href={dataset.source.url}>{localize("Source :")} {localize(dataset.source.credit)}</a>
      </div>
    </MapInformation>
  </div>;
}
