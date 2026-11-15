import { locale } from '../../i18n';
import { localize } from '@marps/ui';
import '../../i18n';
import { useEffect, useRef, useState } from 'react';
import type Map from 'ol/Map';
import ImageLayer from 'ol/layer/Image';
import ImageStatic from 'ol/source/ImageStatic';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import EsriJSON from 'ol/format/EsriJSON';
import { Fill, Stroke, Style } from 'ol/style';
import { Button, Panel } from '@marps/ui';
import { marsSolarTime } from '@marps/mission-core';
import atlas from '../../../public/atlas/manifest.json';
import { marsProjection } from './marsWmts';
import { LayerSwitch } from './LayerSwitch';

type Base = 'mola' | 'hrsc';
type Status = 'loading' | 'ready' | 'error';
const sources = [
  { title: 'Couleur HRSC · ESA/DLR/FU Berlin', url: 'https://hrscteam.dlr.de/public/data/globalcolor.php', note: 'Aperçu mondial 1 280 × 640 : environ 16,7 km/pixel ; produit original à 2 km/pixel. Couleurs assemblées, sans mesure d’altitude.' },
  { title: 'Géologie · USGS SIM 3292 (2014)', url: 'https://pubs.usgs.gov/sim/3292/', note: 'Carte au 1:20 000 000. Copie distribuée par Esri StoryMaps, simplifiée à 0,08°. Les limites ne décrivent pas un terrain de sortie précis.' },
  { title: 'Inertie thermique · NASA MGS/TES, ASU', url: 'https://www.mars.asu.edu/data/tes_ti/', note: '8 pixels/degré, environ 7,5 km/pixel à l’équateur. Couverture limitée à 60°S–60°N. Propriété thermique dérivée, pas une température actuelle.' },
  { title: 'Heure solaire · NASA GISS Mars24', url: 'https://www.giss.nasa.gov/tools/mars24/help/algorithm.html', note: 'Calcul local LMST, LTST et saison Ls. Conversion UTC vérifiée pour 2000–2026 ; ne calcule pas les ombres du relief.' },
  { title: 'Climat · Mars Climate Database LMD', url: 'https://www-mars.lmd.jussieu.fr/mars/access', note: 'Ressource externe : simulations de température, pression et vent. Base complète accessible après inscription ; aucun champ climatique intégré ici.' },
];

export function GlobalAtlasReferences() {
  return <div className="space-y-3 text-sm">{sources.map(source => <div key={source.url}>
    <a className="inline-flex min-h-11 items-center underline" href={source.url}>{localize(source.title)}</a>
    <p>{localize(source.note)}</p>
  </div>)}
    <a className="inline-flex min-h-11 items-center underline" href="https://services.arcgis.com/nzS0F0zdNLvs7nc8/ArcGIS/rest/services/Mars_Geology_feature_layer/FeatureServer/0">{localize("Distribution des polygones géologiques · Esri StoryMaps")}</a>
    <a className="inline-flex min-h-11 items-center underline" href="https://www-mars.lmd.jussieu.fr/mcd_python/">{localize("Explorer le climat simulé en ligne · MCD")}</a>
    <p>{localize("Fichiers locaux figés le 15 novembre 2026, disponibles après préparation hors ligne. Les couches mondiales n’étendent pas la planification détaillée hors Jezero.")}</p>
    <a className="inline-flex min-h-11 items-center underline" href={`${import.meta.env.BASE_URL}atlas/manifest.json`}>{localize("Provenance et empreintes des fichiers de l’atlas")}</a>
  </div>;
}

function clock(hours: number) {
  const minutes = Math.floor(hours * 60) % 1440;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

export function GlobalAtlas({ map }: { map: Map | null }) {
  const [base, setBase] = useState<Base>('mola');
  const [geology, setGeology] = useState(false);
  const [thermal, setThermal] = useState(false);
  const [opacity, setOpacity] = useState(.65);
  const [attempt, setAttempt] = useState(0);
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [point, setPoint] = useState([77.58, 18.44]);
  const [unit, setUnit] = useState<{ code: string; description: string } | null>(null);
  const [utc, setUtc] = useState(() => new Date().toISOString().slice(0, 16));
  const layers = useRef<{ hrsc: ImageLayer<ImageStatic>; tes: ImageLayer<ImageStatic>; geology: VectorLayer<VectorSource> } | null>(null);
  const readAtCenter = useRef<() => void>(() => {});

  useEffect(() => {
    if (!map) return;
    const url = (path: string) => `${import.meta.env.BASE_URL}atlas/${path}`;
    const status = (id: string, value: Status) => setStatuses(previous => ({ ...previous, [id]: value }));
    const image = (id: string, path: string, extent: number[], credit: string) => {
      const source = new ImageStatic({ url: url(path), projection: marsProjection, imageExtent: extent, attributions: credit, interpolate: false });
      source.on('imageloadstart', () => status(id, 'loading'));
      source.on('imageloadend', () => status(id, 'ready'));
      source.on('imageloaderror', () => status(id, 'error'));
      return new ImageLayer({ source, visible: false, zIndex: id === 'hrsc' ? 1 : 2 });
    };
    const hrsc = image('hrsc', 'hrsc.jpg', atlas.hrsc.extent, 'ESA/DLR/FU Berlin — HRSC');
    const tes = image('tes', 'tes.png', atlas.tes.extent, localize("NASA MGS/TES — Christensen et al. (2001), ASU"));
    const source = new VectorSource({ wrapX: false });
    const geo = new VectorLayer({ source, visible: false, zIndex: 3 });
    map.addLayer(hrsc); map.addLayer(tes); map.addLayer(geo);
    layers.current = { hrsc, tes, geology: geo };
    const abort = new AbortController();
    status('geology', 'loading');
    void Promise.all(['geology.json', 'geology-colors.json'].map(path => fetch(url(path), { signal: AbortSignal.any([abort.signal, AbortSignal.timeout(15000)]) }).then(response => {
      if (!response.ok) throw new Error('Atlas unavailable');
      return response.json();
    }))).then(([data, colors]) => {
      if (abort.signal.aborted) return;
      const features = new EsriJSON().readFeatures(data, { dataProjection: marsProjection, featureProjection: marsProjection });
      if (features.length !== atlas.geology.count) throw new Error('Incomplete geology');
      const styles = new globalThis.Map<string, Style>();
      geo.setStyle(feature => {
        const code = String(feature.get('Unit'));
        if (!styles.has(code)) {
          const color: number[] = colors[code] ?? [128, 128, 128, 255];
          styles.set(code, new Style({ fill: new Fill({ color: [color[0]!, color[1]!, color[2]!, .65] }), stroke: new Stroke({ color: '#151b25', width: .5 }) }));
        }
        return styles.get(code);
      });
      source.addFeatures(features);
      status('geology', 'ready');
    }).catch(() => { if (!abort.signal.aborted) status('geology', 'error'); });
    const choose = (coordinate: number[]) => {
      const selected = [Math.max(-180, Math.min(180, coordinate[0]!)), Math.max(-90, Math.min(90, coordinate[1]!))];
      setPoint(selected);
      const feature = geo.getVisible() ? source.getFeaturesAtCoordinate(selected)[0] : undefined;
      setUnit(feature ? { code: String(feature.get('Unit')), description: String(feature.get('UnitDesc')) } : null);
    };
    const click = map.on('singleclick', event => choose(event.coordinate));
    // Reading at the centre also works without pointer input.
    const readCenter = () => { const center = map.getView().getCenter(); if (center) choose(center); };
    readAtCenter.current = readCenter;
    return () => {
      abort.abort(); map.un('singleclick', click.listener); readAtCenter.current = () => {};
      layers.current = null;
      map.removeLayer(hrsc); map.removeLayer(tes); map.removeLayer(geo);
      hrsc.getSource()?.dispose(); tes.getSource()?.dispose(); source.dispose();
      hrsc.dispose(); tes.dispose(); geo.dispose();
    };
  }, [map, attempt]);

  useEffect(() => {
    layers.current?.hrsc.setVisible(base === 'hrsc');
    layers.current?.tes.setVisible(thermal);
    layers.current?.tes.setOpacity(opacity);
    layers.current?.geology.setVisible(geology);
  }, [map, attempt, base, thermal, opacity, geology]);

  let time: ReturnType<typeof marsSolarTime> | null = null;
  try { time = marsSolarTime(Date.parse(`${utc}Z`), point[0]!); } catch { /* Outside verified UTC conversion. */ }
  const visible = [base === 'hrsc' ? 'hrsc' : '', thermal ? 'tes' : '', geology ? 'geology' : ''].filter(Boolean);
  return <Panel title={localize("Atlas de Mars")} floating className="text-sm" collapsible={false}>
    <fieldset className="space-y-2"><legend className="font-semibold">{localize("Fond mondial")}</legend>
      <label className="flex min-h-11 items-center gap-2"><input type="radio" name="atlas-base" checked={base === 'mola'} onChange={() => setBase('mola')} />{localize("Relief MOLA")}</label>
      <label className="flex min-h-11 items-center gap-2"><input type="radio" name="atlas-base" checked={base === 'hrsc'} onChange={() => setBase('hrsc')} />{localize("Couleur HRSC")}</label>
      {base === 'hrsc' && <p className="text-xs">{localize("Aperçu couleur : environ 16,7 km/pixel. ESA/DLR/FU Berlin.")}</p>}
    </fieldset>
    <LayerSwitch label={localize("Géologie USGS")} checked={geology} onChange={setGeology} />
    {geology && <p className="text-xs">{localize("Unités simplifiées au 1:20 000 000. Cliquez sur un terrain pour lire son unité ; description originale en anglais.")}</p>}
    <LayerSwitch label={localize("Inertie thermique TES")} checked={thermal} onChange={setThermal} />
    {thermal && <div className="space-y-2 text-xs">
      <p>{localize("Propriété thermique dérivée · 7,5 km/pixel · 60°S–60°N. Hors bande : aucune donnée TES.")}</p>
      <div aria-hidden="true" className="h-3" style={{ background: 'linear-gradient(to right, #7000c0, blue, cyan, #00dc00, yellow, red, pink, white)' }} />
      <p>{localize("Violet : faible inertie → blanc : forte inertie. Lecture qualitative ; aucune température ni valeur numérique au clic.")}</p>
      <label className="grid gap-2">{localize("Opacité TES :")} {Math.round(opacity * 100)} {localize("%")}<input className="min-h-11 w-full" type="range" min="0" max="100" value={Math.round(opacity * 100)} onChange={event => setOpacity(Number(event.target.value) / 100)} /></label>
    </div>}
    {visible.map(id => statuses[id] && <p role="status" key={id}>{id === 'tes' ? 'TES' : id === 'hrsc' ? 'HRSC' : localize("Géologie")} {localize(":")} {statuses[id] === 'ready' ? localize("données locales chargées") : statuses[id] === 'loading' ? localize("chargement…") : localize("indisponible, le fond MOLA reste accessible")}</p>)}
    {visible.some(id => statuses[id] === 'error') && <Button size="sm" variant="outline" onClick={() => setAttempt(value => value + 1)}>{localize("Réessayer les couches")}</Button>}
    <div className="mt-3 space-y-2 border-t pt-3">
      <h3 className="font-semibold">{localize("Point exploré")}</h3>
      <p>{localize(point[0]!.toLocaleString(locale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}{localize("° E ·")} {localize(point[1]!.toLocaleString(locale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}{localize("° N")}</p>
      <p className="text-xs">{localize("Cliquez sur Mars ou déplacez la carte puis lisez son centre.")}</p>
      <Button size="sm" variant="outline" onClick={() => readAtCenter.current()}>{localize("Lire au centre de la carte")}</Button>
      {geology && <p aria-live="polite">{unit ? <><strong>{localize(unit.code)}</strong> {localize("·")} {localize(unit.description)}</> : localize("Aucune unité sélectionnée. Cliquez sur une zone après chargement.")}</p>}
      <label className="grid gap-2">{localize("Date et heure terrestres (UTC)")}<input className="min-h-11 min-w-0 w-full border bg-background p-2" type="datetime-local" min="2000-01-01T00:00" max="2026-12-31T23:59" value={utc} onChange={event => setUtc(event.target.value)} /></label>
      {time ? <dl><dt>{localize("Heure solaire moyenne (LMST)")}</dt><dd>{clock(time.meanHours)}</dd><dt>{localize("Heure solaire vraie (LTST)")}</dt><dd>{clock(time.trueHours)}</dd><dt>{localize("Saison martienne (Ls)")}</dt><dd>{time.solarLongitude.toLocaleString(locale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{localize("°")}</dd></dl> : <p role="status">{localize("Heure solaire indisponible : choisir une date entre 2000 et 2026.")}</p>}
      <p className="text-xs">{localize("Calcul Mars24 pour la date choisie, indépendant de l’heure de la mission et des mesures MEDA.")}</p>
    </div>
    <details className="mt-3 border-t"><summary className="min-h-11 cursor-pointer py-3 font-semibold">{localize("Sources et climat mondial")}</summary><GlobalAtlasReferences /></details>
  </Panel>;
}
