import { useEffect, useRef, useState } from 'react';
import Map from 'ol/Map';
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
import { Circle, Fill, Stroke, Style, Text } from 'ol/style';
import type { Extent, DatasetDescriptor, SiteDescriptor } from '@marps/data';
import { Button, Panel } from '@marps/ui';
import { marsProjection, createRegionSource } from './marsWmts';
import { containsPosition, marsHorizontalResolution, resolveJezeroTile } from './jezero';
import './global-mars-map.css';
import { jezeroMessages } from './jezeroMessages';
const messages = jezeroMessages.fr;

interface Props {
  dataset: DatasetDescriptor;
  sector: Extent;
  radius: number;
  sites: readonly SiteDescriptor[];
  selected: string | null;
  onSelect: (id: string) => void;
}
const bounds = (extent: Extent) => [extent.west, extent.south, extent.east, extent.north];
export function JezeroMap({ dataset, sector, radius, sites, selected, onSelect }: Props) {
  const target = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const [failed, setFailed] = useState(false);
  const [outside, setOutside] = useState(false);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [scale, setScale] = useState('');
  const [choices, setChoices] = useState<readonly SiteDescriptor[]>([]);
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
      feature.setStyle(new Style({ stroke: new Stroke({ color, width: 3, lineDash: dash }) }));
      return feature;
    };
    const features = sites.filter(site => site.regionId === dataset.regionId).map(site => {
      const feature = new Feature(new Point([site.coordinate.longitude, site.coordinate.latitude]));
      feature.setId(site.id);
      feature.setStyle(() => new Style({ image: new Circle({ radius: selectedRef.current === site.id ? 10 : 7,
        fill: new Fill({ color: selectedRef.current === site.id ? '#fff' : '#ffcc66' }), stroke: new Stroke({ color: '#151b25', width: 3 }) }),
        text: new Text({ text: site.name, offsetY: -22, fill: new Fill({ color: '#fff' }), stroke: new Stroke({ color: '#151b25', width: 4 }) }) }));
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
    const map = new Map({ target: target.current!, maxTilesLoading: 8, layers: [
      new TileLayer({ source: createRegionSource(dataset) }), new TileLayer({ source }),
      new VectorLayer({ source: new VectorSource({ features: [boundary(product.extent, '#ffcc66', []), boundary(sector, '#50c8ff', [10, 5])], wrapX: false }) }),
      new VectorLayer({ source: new VectorSource({ features: prepared, wrapX: false }), style: feature => {
        if (feature.get('level') !== Math.round(view.getZoom() ?? 12)) return;
        return new Style({ stroke: new Stroke({ color: '#fff', width: 2, lineDash: [2, 6] }) });
      } }),
      new VectorLayer({ source: new VectorSource({ features, wrapX: false }) }),
    ], view });
    mapRef.current = map;
    view.fit(bounds(sector), { size: map.getSize(), padding: [90, 40, 160, 40] });
    const update = () => {
      const center = view.getCenter()!;
      setOutside(!containsPosition(sector, center[0]!, center[1]!));
      const metres = marsHorizontalResolution(view.getResolution()!, center[1]!, radius) * 100;
      setScale(`${metres >= 1000 ? `${(metres / 1000).toFixed(2)} km` : `${metres.toFixed(1)} m`} / 100 px`);
    };
    map.on('moveend', update); update();
    map.on('singleclick', event => {
      const hits = map.getFeaturesAtPixel(event.pixel, { hitTolerance: 15 }).map(feature => sites.find(site => site.id === feature.getId())).filter((site): site is SiteDescriptor => Boolean(site));
      if (hits.length === 1) onSelect(hits[0]!.id);
      setChoices(hits.length > 1 ? hits : []);
    });
    source.on('tileloaderror', () => setFailed(true));
    const connectivity = () => { setOffline(!navigator.onLine); };
    window.addEventListener('online', connectivity); window.addEventListener('offline', connectivity);
    const observer = new ResizeObserver(() => map.updateSize()); observer.observe(target.current!);
    return () => { pending.forEach(cancel => cancel()); observer.disconnect(); window.removeEventListener('online', connectivity); window.removeEventListener('offline', connectivity); map.dispose(); mapRef.current = null; };
  }, [dataset, sector, radius, sites, onSelect]);
  return <div className="mars-map-container jezero-map">
    <div ref={target} className="mars-map" tabIndex={0} aria-label={messages.label} />
    <Panel title={messages.panelTitle} collapsible className="jezero-status text-sm" contentClassName="overflow-y-auto p-2">
      <p role="status">{outside ? messages.outside : messages.sector} {offline ? messages.offline : messages.online} {failed && messages.failure}</p>
      <div aria-hidden="true" style={{ width: 100, borderBottom: '3px solid currentColor' }} /><p className="text-xs">{scale} · {messages.scale}</p>
      <Button size="sm" onClick={() => mapRef.current?.getView().fit(bounds(sector), { size: mapRef.current.getSize(), padding: [90, 40, 160, 40] })}>{messages.return}</Button>
      {failed && <Button size="sm" variant="outline" onClick={() => { setFailed(false); mapRef.current?.getLayers().forEach(layer => { if (layer instanceof TileLayer) layer.getSource()?.refresh(); }); }}>{messages.retry}</Button>}
      <div className="jezero-legend mt-2 border-t pt-2 text-xs" role="group" aria-label={messages.legendTitle}>
        <p className="font-semibold">{messages.legendTitle}</p>
        <ul className="mt-1 grid gap-1">
          <li><svg viewBox="0 0 40 12" aria-hidden="true"><path d="M0 6H40" stroke="#50c8ff" strokeWidth="3" strokeDasharray="10 5" /></svg><span>{messages.missionBoundary}</span></li>
          <li><svg viewBox="0 0 40 12" aria-hidden="true"><path d="M0 6H40" stroke="#ffcc66" strokeWidth="3" /></svg><span>{messages.productBoundary}</span></li>
          <li><svg viewBox="0 0 40 12" aria-hidden="true"><path d="M0 6H40" stroke="#fff" strokeWidth="2" strokeDasharray="2 6" /></svg><span>{messages.preparedBoundary}</span></li>
          <li><svg viewBox="0 0 40 20" aria-hidden="true"><circle cx="20" cy="10" r="7" fill="#ffcc66" stroke="#151b25" strokeWidth="3" /></svg><span>{messages.scienceSite}</span></li>
          <li><svg viewBox="0 0 40 24" aria-hidden="true"><circle cx="20" cy="12" r="10" fill="#fff" stroke="#151b25" strokeWidth="3" /></svg><span>{messages.selectedSite}</span></li>
          <li><span className="jezero-missing-swatch" aria-hidden="true" /><span>{messages.missingImagery}</span></li>
        </ul>
      </div>
      {choices.map(site => <Button key={site.id} size="sm" onClick={() => { onSelect(site.id); setChoices([]); }}>{site.name}</Button>)}
    </Panel>
    <details className="map-information border bg-card p-2 text-xs"><summary className="map-info-toggle">{messages.sources}</summary>
      <p>{messages.legend}</p>
      <p>{messages.coordinates} R = {radius} m.</p>
      <p>{messages.cache}</p>
      <a href={dataset.source.url} className="underline">{dataset.source.credit}</a>
    </details>
  </div>;
}
