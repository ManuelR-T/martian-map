import { locale } from '../../i18n';
import { localize } from '@marps/ui';
import '../../i18n';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import Map from 'ol/Map';
import { usePlannerState } from '../../state/PlannerProvider';
import { selectCurrentMission } from '../../state/planner';
import { createMissionLayer } from './missionLayer';
import { defaults as defaultControls } from 'ol/control';
import { MapPanelDock } from './MapPanelDock';
import { MapInformation } from './MapInformation';
import type ImageTile from 'ol/ImageTile';
import View from 'ol/View';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { fromExtent } from 'ol/geom/Polygon';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import XYZ from 'ol/source/XYZ';
import TileGrid from 'ol/tilegrid/TileGrid';
import { Circle, Fill, Stroke, Style } from 'ol/style';
import { MISSION_COLOUR, SECTOR_COLOUR, mapLabel } from './mapText';
import type { Extent, DatasetDescriptor, SiteDescriptor } from '@marps/data';
import { Button, Panel } from '@marps/ui';
import { marsProjection, createRegionSource } from './marsWmts';
import { containsPosition, marsHorizontalResolution, resolveJezeroTile } from './jezero';
import './global-mars-map.css';
import { SiteChoicePopover, type SiteChoice } from './SiteChoicePopover';
import { loadRoverHistory, type RoverHistory } from '@marps/data';
import { createRoverLayers } from './roverLayer';
import { RoverHistoryControl, roverMessages } from './RoverHistoryControl';
import { jezeroMessages } from './jezeroMessages';
import { ThemisNightControl } from './ThemisNightControl';
import { useThemisNightLayer } from './useThemisNightLayer';
const messages = new Proxy(jezeroMessages.fr, { get: (target, key: string) => localize(target[key as keyof typeof target]) });

interface Props {
  panelHost: HTMLElement | null;
  datasets: readonly DatasetDescriptor[];
  roverEnabled: boolean;
  onRoverToggle: () => void;
  dataset: DatasetDescriptor;
  sector: Extent;
  radius: number;
  sites: readonly SiteDescriptor[];
  selected: string | null;
  onSelect: (id: string) => void;
  themisDataset?: DatasetDescriptor;
  /** Extra layers and controls given the map instance, e.g. the relief and route of #15. */
  overlay?: (map: Map | null) => ReactNode;
}
const bounds = (extent: Extent) => [extent.west, extent.south, extent.east, extent.north];
export function JezeroMap({ panelHost, dataset, sector, radius, sites, selected, onSelect, datasets, roverEnabled, onRoverToggle, overlay, themisDataset }: Props) {
  const mission = selectCurrentMission(usePlannerState());
  const themis = useThemisNightLayer(themisDataset);
  const themisLayer = themis.layer;
  const [history, setHistory] = useState<RoverHistory | null>(null);
  const [historyFailed, setHistoryFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [roverCandidates, setRoverCandidates] = useState<readonly number[] | null>(null);
  const [roverSelected, setRoverSelected] = useState<number | null>(null);
  const historyRef = useRef<RoverHistory | null>(null);
  const roverEnabledRef = useRef(roverEnabled);
  useEffect(() => { roverEnabledRef.current = roverEnabled; }, [roverEnabled]);
  useEffect(() => {
    if (!roverEnabled || history) return;
    const controller = new AbortController();
    loadRoverHistory(datasets, controller.signal).then(value => { if (!controller.signal.aborted) setHistory(value); }).catch(() => { if (!controller.signal.aborted) setHistoryFailed(true); });
    return () => controller.abort();
  }, [datasets, roverEnabled, history, attempt]);
  const target = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const [overlayMap, setOverlayMap] = useState<Map | null>(null);
  const [failed, setFailed] = useState(false);
  const [outside, setOutside] = useState(false);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [scale, setScale] = useState('');
  const [choice, setChoice] = useState<SiteChoice | null>(null);
  const selectedRef = useRef(selected);
  useEffect(() => { selectedRef.current = selected; mapRef.current?.getLayers().forEach(layer => { if (layer instanceof VectorLayer) layer.changed(); }); }, [selected]);
  useEffect(() => {
    const product = dataset.wmts;
    if (!product) return;
    const pending = new Set<() => void>();
    const source = new XYZ({ projection: marsProjection, wrapX: false, crossOrigin: 'anonymous',
      attributions: dataset.source.credit,
      tileGrid: new TileGrid({ origin: [-180, 90], extent: bounds(product.extent),
        resolutions: product.matrices.map(matrix => 360 / (matrix.tileSize * matrix.width)), tileSize: 256 }),
      tileUrlFunction: coordinate => resolveJezeroTile(dataset, coordinate)?.url,
      tileLoadFunction: (tile, url) => {
        const image = (tile as ImageTile).getImage() as HTMLImageElement;
        const timer = window.setTimeout(() => { image.src = ''; tile.setState(3); }, 15000);
        const cleanup = () => { pending.delete(cancel); window.clearTimeout(timer); image.removeEventListener('load', cleanup); image.removeEventListener('error', cleanup); };
        const cancel = () => { cleanup(); image.src = ''; };
        pending.add(cancel);
        image.addEventListener('load', cleanup); image.addEventListener('error', cleanup);
        image.src = url;
      } });
    const boundary = (extent: Extent, color: string, dash: number[]) => {
      const feature = new Feature(fromExtent(bounds(extent)));
      feature.setStyle(new Style({ stroke: new Stroke({ color, width: 2, lineDash: dash }) }));
      return feature;
    };
    // Neighbouring sites (Skinner Ridge and Wildcat Ridge are metres apart) alternate their label above and below.
    const features = sites.filter(site => site.regionId === dataset.regionId).sort((a, b) => b.coordinate.latitude - a.coordinate.latitude).map((site, index) => {
      const feature = new Feature(new Point([site.coordinate.longitude, site.coordinate.latitude]));
      feature.setId(site.id);
      feature.setStyle(() => new Style({ image: new Circle({ radius: selectedRef.current === site.id ? 10 : 7, declutterMode: 'none',
        fill: new Fill({ color: selectedRef.current === site.id ? '#fff' : '#ffcc66' }), stroke: new Stroke({ color: '#151b25', width: 3 }) }),
        text: mapLabel(site.name, index % 2 === 0 ? -24 : 26) }));
      return feature;
    });
    const view = new View({ projection: marsProjection, extent: bounds(product.extent),
      resolutions: product.matrices.map(matrix => 360 / (matrix.tileSize * matrix.width)), minZoom: 0, maxZoom: product.matrices.length - 1 });
    const prepared = dataset.tileset!.ranges.map(range => {
      const span = 180 / 2 ** range.z;
      const feature = boundary({ west: -180 + range.colMin * span, east: -180 + (range.colMax + 1) * span,
        north: 90 - range.rowMin * span, south: 90 - (range.rowMax + 1) * span }, '#fff', [2, 6]);
      feature.setStyle(undefined);
      feature.set('level', range.z);
      return feature;
    });
    const map = new Map({ controls: defaultControls({ attribution: false }), target: target.current!, maxTilesLoading: 8, layers: [
      new TileLayer({ source: createRegionSource(dataset) }), new TileLayer({ source }),
      // Order: imagery < night infrared < rover traverse (zIndex 2) < outlines and sites (zIndex 3).
      ...(themisLayer ? [themisLayer] : []),
      new VectorLayer({ zIndex: 3, source: new VectorSource({ features: [boundary(product.extent, '#ffcc66', []), boundary(sector, SECTOR_COLOUR, [10, 5])], wrapX: false }) }),
      new VectorLayer({ zIndex: 3, source: new VectorSource({ features: prepared, wrapX: false }), style: feature => {
        if (feature.get('level') !== Math.round(view.getZoom() ?? 12)) return;
        return new Style({ stroke: new Stroke({ color: '#fff', width: 2, lineDash: [2, 6] }) });
      } }),
      new VectorLayer({ zIndex: 3, declutter: true, source: new VectorSource({ features, wrapX: false }) }),
    ], view });
    mapRef.current = map; setOverlayMap(map);
    view.fit(bounds(sector), { size: map.getSize(), padding: [90, 40, 160, 40] });
    const update = () => {
      const center = view.getCenter()!;
      setOutside(!containsPosition(sector, center[0]!, center[1]!));
      const metres = marsHorizontalResolution(view.getResolution()!, center[1]!, radius) * 100;
      setScale(`${metres >= 1000 ? `${(metres / 1000).toLocaleString(locale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km` : `${metres.toLocaleString(locale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 })} m`} / 100 px`);
    };
    map.on('moveend', update); update();
    map.on('movestart', () => setChoice(null));
    map.on('singleclick', event => {
      const hits = map.getFeaturesAtPixel(event.pixel, { hitTolerance: 15 }).map(feature => sites.find(site => site.id === feature.getId())).filter((site): site is SiteDescriptor => Boolean(site));
      if (hits.length === 0 && roverEnabledRef.current && historyRef.current) {
        const roverHits = map.getFeaturesAtPixel(event.pixel, { hitTolerance: 15 }).map(feature => feature.get('roverIndex')).filter((index): index is number => typeof index === 'number');
        setRoverCandidates(roverHits.length > 1 ? [...new Set(roverHits)] : null);
        setRoverSelected(roverHits.length === 1 ? roverHits[0]! : null);
      }
      if (hits.length === 1) onSelect(hits[0]!.id);
      if (hits.length > 1) {
        const rectangle = target.current!.getBoundingClientRect();
        const pixels = hits.map(site => map.getPixelFromCoordinate([site.coordinate.longitude, site.coordinate.latitude]));
        setChoice({ sites: hits,
          left: rectangle.left + Math.min(...pixels.map(pixel => pixel[0]!)) - 12,
          right: rectangle.left + Math.max(...pixels.map(pixel => pixel[0]!)) + 12,
          top: rectangle.top + Math.min(...pixels.map(pixel => pixel[1]!)) - 32,
          bottom: rectangle.top + Math.max(...pixels.map(pixel => pixel[1]!)) + 12 });
      } else setChoice(null);
    });
    source.on('tileloaderror', () => setFailed(true));
    const connectivity = () => { setOffline(!navigator.onLine); };
    window.addEventListener('online', connectivity); window.addEventListener('offline', connectivity);
    const observer = new ResizeObserver(() => map.updateSize()); observer.observe(target.current!);
    return () => { pending.forEach(cancel => cancel()); observer.disconnect(); window.removeEventListener('online', connectivity); window.removeEventListener('offline', connectivity); map.dispose(); mapRef.current = null; setOverlayMap(null); };
  }, [dataset, sector, radius, sites, onSelect, themisLayer]);
  useEffect(() => {
    historyRef.current = history;
    const map = mapRef.current;
    if (!map || !history) return;
    const layer = createRoverLayers(history, roverSelected);
    layer.setVisible(roverEnabled);
    map.addLayer(layer);
    return () => { map.removeLayer(layer); };
  }, [history, roverSelected, roverEnabled, dataset, sector, radius, sites, onSelect, themisLayer]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const layer = createMissionLayer(mission);
    map.addLayer(layer);
    return () => { map.removeLayer(layer); };
  }, [mission, dataset, sector, radius, sites, onSelect, themisLayer]);
  return <div className="mars-map-container jezero-map">
    <div ref={target} className="mars-map" tabIndex={0} aria-label={localize(messages.label)} />
    <div className="map-notices">
      {roverEnabled && <p className="rover-warning border bg-card p-2 text-xs font-semibold">{localize(roverMessages.fr.warning)}</p>}
      {(failed || offline) && <div role="status" className="map-alert border bg-card p-3 text-sm">
        <p>{failed ? messages.failure : messages.offline}</p>
        {failed && <Button size="sm" variant="outline" onClick={() => { setFailed(false); mapRef.current?.getLayers().forEach(layer => { if (layer instanceof TileLayer) layer.getSource()?.refresh(); }); }}>{localize(messages.retry)}</Button>}
      </div>}
    </div>
    <MapPanelDock host={panelHost}>
    <Panel title={localize(messages.panelTitle)} floating className="jezero-status text-sm" contentClassName="overflow-y-auto">
      <p role="status">{localize(outside ? messages.outside : messages.sector)} {localize(offline ? messages.offline : messages.online)} {localize(failed && messages.failure)}</p>

      <Button size="sm" onClick={() => mapRef.current?.getView().fit(bounds(sector), { size: mapRef.current.getSize(), padding: [90, 40, 160, 40] })}>{localize(messages.return)}</Button>
      {failed && <Button size="sm" variant="outline" onClick={() => { setFailed(false); mapRef.current?.getLayers().forEach(layer => { if (layer instanceof TileLayer) layer.getSource()?.refresh(); }); }}>{localize(messages.retry)}</Button>}

      {/* One list, one control: every layer is shown or hidden with the same switch. */}
      <div className="mt-2 border-t pt-2" role="group" aria-label={localize(messages.layersTitle)}>
        <p className="text-xs font-semibold">{localize(messages.layersTitle)}</p>
        {localize(overlay?.(overlayMap))}
        {themisDataset && <ThemisNightControl dataset={themisDataset} settings={themis.settings} onChange={themis.setSettings} className="border-0 bg-transparent p-0" />}
        <RoverHistoryControl enabled={roverEnabled} onToggle={onRoverToggle} history={history} candidates={roverCandidates} failed={historyFailed} retry={() => { setHistoryFailed(false); setAttempt(value => value + 1); }} selected={roverSelected} onSelect={index => { setRoverSelected(index); if (index === null) setRoverCandidates(null); }} />
      </div>

      <details className="jezero-legend mt-2 border-t pt-2 text-xs">
        <summary className="min-h-11 cursor-pointer py-3 font-semibold">{localize(messages.legendTitle)}</summary>
        <ul className="mt-1 grid gap-1">
          <li><svg viewBox="0 0 40 12" aria-hidden="true"><path d="M0 6H40" stroke={MISSION_COLOUR} strokeWidth="3" strokeDasharray="8 6" /></svg><span>{localize(messages.missionRoute)}</span></li>
          <li><svg viewBox="0 0 40 24" aria-hidden="true"><circle cx="20" cy="12" r="9" fill="#151b25" stroke={MISSION_COLOUR} strokeWidth="2" /></svg><span>{localize(messages.missionStop)}</span></li>
          <li><svg viewBox="0 0 40 12" aria-hidden="true"><path d="M0 6H40" stroke="#50c8ff" strokeWidth="2" strokeDasharray="10 5" /></svg><span>{localize(messages.missionBoundary)}</span></li>
          <li><svg viewBox="0 0 40 12" aria-hidden="true"><path d="M0 6H40" stroke="#ffcc66" strokeWidth="2" /></svg><span>{localize(messages.productBoundary)}</span></li>
          <li><svg viewBox="0 0 40 12" aria-hidden="true"><path d="M0 6H40" stroke="#fff" strokeWidth="2" strokeDasharray="2 6" /></svg><span>{localize(messages.preparedBoundary)}</span></li>
          <li><svg viewBox="0 0 40 20" aria-hidden="true"><circle cx="20" cy="10" r="7" fill="#ffcc66" stroke="#151b25" strokeWidth="3" /></svg><span>{localize(messages.scienceSite)}</span></li>
          <li><svg viewBox="0 0 40 24" aria-hidden="true"><circle cx="20" cy="12" r="10" fill="#fff" stroke="#151b25" strokeWidth="3" /></svg><span>{localize(messages.selectedSite)}</span></li>
          <li><span className="jezero-missing-swatch" aria-hidden="true" /><span>{localize(messages.missingImagery)}</span></li>
        </ul>
      </details>
    </Panel>
    </MapPanelDock>
    {choice && <SiteChoicePopover choice={choice} onSelect={onSelect} onClose={() => { setChoice(null); target.current?.focus({ preventScroll: true }); }} />}
    <div className="mars-scale border bg-card p-4 text-xs" aria-label={localize(messages.scale)}>
      <div aria-hidden="true" className="mars-scale-bar" />
      <p>{localize(scale)} {localize("·")} {localize(messages.scale)}</p>
    </div>
    <MapInformation>
      <p>{localize("Camp et étapes : simulation. Tirets orange du parcours : segments directs, sans validation du terrain.")}</p>
      <p>{localize(messages.legend)}</p>
      <p>{localize(messages.coordinates)} {localize("R =")} {localize(radius)} {localize("m.")}</p>
      <p>{localize(messages.cache)}</p>
      <a href={dataset.source.url} className="underline">{localize(dataset.source.credit)}</a>
    </MapInformation>
  </div>;
}
