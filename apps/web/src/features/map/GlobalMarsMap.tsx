import { useEffect, useRef, useState } from 'react';
import Map from 'ol/Map';
import { defaults as defaultControls } from 'ol/control';
import { MapInformation } from './MapInformation';
import { GlobalAtlas } from './GlobalAtlas';
import { MapPanelDock } from './MapPanelDock';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import ImageLayer from 'ol/layer/Image';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import ImageStatic from 'ol/source/ImageStatic';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { Circle, Fill, Stroke, Style } from 'ol/style';
import { mapLabel } from './mapText';
import { regions, type DatasetDescriptor } from '@marps/data';
import { Button } from '@marps/ui';
import { createGlobalMarsSource, createRegionSource, marsProjection, resolutions } from './marsWmts';
import './global-mars-map.css';

interface Props {
  panelHost: HTMLElement | null;
  dataset: DatasetDescriptor;
  global: boolean;
  onSelectRegion: () => void;
}

export function GlobalMarsMap({ panelHost, dataset, global, onSelectRegion }: Props) {
  const [atlasMap, setAtlasMap] = useState<Map | null>(null);
  const target = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const sourceRef = useRef<ReturnType<typeof createGlobalMarsSource> | ReturnType<typeof createRegionSource> | null>(null);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [failed, setFailed] = useState(false);
  const [resolution, setResolution] = useState<number | null>(null);
  useEffect(() => {
    const source = global ? createGlobalMarsSource(dataset) : createRegionSource(dataset);
    sourceRef.current = source;
    const base = import.meta.env.BASE_URL;
    const fallback = (file: string, imageExtent: number[]) => new ImageLayer({ source: new ImageStatic({
      url: `${base}data/mola/${file}.jpg`, projection: marsProjection, imageExtent,
      attributions: 'NASA / JPL-Caltech / GSFC — MGS MOLA, NASA Trek',
    }) });
    const jezero = regions.find(region => region.id === 'jezero')!;
    const marker = new Feature(new Point([jezero.center.longitude, jezero.center.latitude]));
    marker.setStyle(new Style({ image: new Circle({ radius: 7, fill: new Fill({ color: '#ffcc66' }), stroke: new Stroke({ color: '#151b25', width: 2 }) }),
      text: mapLabel('Jezero', -22) }));
    const extent = dataset.extent;
    const bounds = [extent.west, extent.south, extent.east, extent.north];
    const levels = dataset.tileset?.ranges.map(range => range.z) ?? [0, 7];
    const view = new View({ projection: marsProjection, center: [0, 0],
      resolutions: global ? resolutions : Array.from({ length: Math.max(...levels) + 1 }, (_, z) => 360 / (512 * 2 ** z)),
      extent: global ? [-180, -90, 180, 90] : bounds, minZoom: Math.min(...levels), maxZoom: Math.max(...levels), showFullExtent: !global });
    const markers = new VectorLayer({ source: new VectorSource({ features: [marker], wrapX: false }), zIndex: 10 });
    const map = new Map({ controls: defaultControls({ attribution: false }), target: target.current!, layers: [
      ...(global ? [fallback('west', [-180, -90, 0, 90]), fallback('east', [0, -90, 180, 90])] : []),
      new TileLayer({ source }),
      ...(global ? [markers] : []),
    ], view });
    mapRef.current = map;
    setAtlasMap(map);
    // Globally the planet fills the stage, centred on Jezero when the screen is too narrow for all of Mars.
    if (global) { view.fit([-180, -90, 180, 90], { size: map.getSize() }); view.setCenter([jezero.center.longitude, 0]); }
    else view.fit(bounds, { size: map.getSize(), padding: [80, 30, 100, 30] });
    map.on('singleclick', event => { if (global && map.hasFeatureAtPixel(event.pixel, { layerFilter: layer => layer === markers })) onSelectRegion(); });
    source.on('tileloaderror', () => setFailed(true));
    view.on('change:resolution', () => setResolution(view.getResolution() ?? null));
    const connectivity = () => { setOffline(!navigator.onLine); };
    window.addEventListener('online', connectivity);
    window.addEventListener('offline', connectivity);
    const resize = new ResizeObserver(() => map.updateSize());
    resize.observe(target.current!);
    return () => { resize.disconnect(); window.removeEventListener('online', connectivity); window.removeEventListener('offline', connectivity); map.dispose(); mapRef.current = null; sourceRef.current = null; };
  }, [dataset, global, onSelectRegion]);
  return <div className="mars-map-container">
    <div ref={target} className="mars-map" tabIndex={0} aria-label={global ? 'Carte globale de Mars. Flèches pour déplacer, plus et moins pour zoomer.' : 'Carte du secteur Jezero'} />
    <div className="map-notices">{(failed || offline) && <div role="status" className="map-alert border bg-card p-3 text-sm">
      <p>{failed ? 'Certaines tuiles sont indisponibles.' : 'Hors ligne : seules les données téléchargées sont accessibles.'}</p>
      {failed && <Button variant="outline" size="sm" onClick={() => { setFailed(false); sourceRef.current?.refresh(); }}>Réessayer les tuiles</Button>}
    </div>}</div>
    {global && <MapPanelDock host={panelHost}><GlobalAtlas map={atlasMap} /></MapPanelDock>}
    <MapInformation>
      <div className="flex flex-wrap items-center gap-2">
      {global && <>
        <Button size="sm" className="px-2" onClick={onSelectRegion}>Ouvrir Jezero</Button>
        <Button size="sm" className="px-2" variant="outline" onClick={() => mapRef.current?.getView().fit([-180, -90, 180, 90], { size: mapRef.current.getSize(), duration: 250 })}>Mars entière</Button>
      </>}
      </div>
      <p role="status">{failed ? 'Certaines tuiles sont indisponibles.' : offline ? 'Hors ligne : données locales et tuiles déjà téléchargées.' : global ? 'Carte disponible. Les détails globaux se chargent en ligne.' : 'Imagerie locale chargée.'} {global ? 'Glissez pour explorer Mars ; utilisez la molette ou + / − pour zoomer.' : 'Imagerie locale figée ; hors secteur, aucune couverture.'}</p>
      {failed && <Button variant="outline" size="sm" onClick={() => { setFailed(false); sourceRef.current?.refresh(); }}>Réessayer les tuiles</Button>}
      <div className="map-metadata">
      <p className="mt-2">{dataset.title} · Échantillonnage nominal : {dataset.resolution?.value ?? 'inconnu'} m/pixel. {resolution !== null && `Vue : ${resolution.toFixed(6)}°/pixel.`} {global && 'Le fond de secours est moins détaillé. La planification est limitée à Jezero.'}</p>
      <p>Couverture : {dataset.extent.west.toFixed(6)}° à {dataset.extent.east.toFixed(6)}° E ; {dataset.extent.south.toFixed(6)}° à {dataset.extent.north.toFixed(6)}° N.</p>
      {global && <p>Repère Jezero approximatif : 77,58° E, 18,44° N. Le fond global est destiné à l’orientation.</p>}
      <a className="underline" href={dataset.source.url}>Source : {dataset.source.credit}</a>
      </div>
    </MapInformation>
  </div>;
}
