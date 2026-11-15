import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import Point from 'ol/geom/Point';
import ImageLayer from 'ol/layer/Image';
import VectorLayer from 'ol/layer/Vector';
import ImageStatic from 'ol/source/ImageStatic';
import VectorSource from 'ol/source/Vector';
import { Fill, RegularShape, Stroke, Style } from 'ol/style';
import { DATA_BASE_URL, type DatasetDescriptor } from '@marps/data';
import type { MarsCoordinate } from '@marps/mission-core';
import { marsProjection } from '../features/map/marsWmts';

// Deeper blue than the dashed sector outline (#50c8ff), so the route is not mistaken for it.
export const ROUTE_COLOUR = '#2f6bff';
export const STEEP_COLOUR = '#ff4d4d';
export const HILLSHADE_DEFAULT_OPACITY = 0.5;
const CASING = '#151b25';

const lonLat = (coordinate: MarsCoordinate) => [coordinate.longitude, coordinate.latitude];

/** Shaded relief stretched over the grid it was computed from, hidden until the crew turns it on. */
export function createHillshadeLayer(dataset: DatasetDescriptor, baseUrl = DATA_BASE_URL) {
  const file = dataset.files[0];
  if (!file) throw new Error(`Dataset ${dataset.id} has no frozen file.`);
  const { west, south, east, north } = dataset.extent;
  return new ImageLayer({
    visible: false,
    opacity: HILLSHADE_DEFAULT_OPACITY,
    source: new ImageStatic({
      url: `${baseUrl}${file.path}`,
      imageExtent: [west, south, east, north],
      projection: marsProjection,
      attributions: dataset.source.credit,
    }),
  });
}

/** Demo route, with each steep stretch drawn over it in red. A dark casing keeps both readable on the photo. */
export function routeFeatures(stops: readonly MarsCoordinate[], stretches: readonly MarsCoordinate[][]) {
  const line = (coordinates: readonly MarsCoordinate[], colour: string, width: number) => {
    const feature = new Feature(new LineString(coordinates.map(lonLat)));
    feature.setStyle([
      new Style({ stroke: new Stroke({ color: CASING, width: width + 3 }) }),
      new Style({ stroke: new Stroke({ color: colour, width }) }),
    ]);
    return feature;
  };
  const route = line(stops, ROUTE_COLOUR, 3);
  route.set('kind', 'route');
  // A one-point stretch cannot be drawn as a line; the profile still shows it.
  const steep = stretches.filter((stretch) => stretch.length > 1).map((stretch) => {
    const feature = line(stretch, STEEP_COLOUR, 5);
    feature.set('kind', 'steep');
    return feature;
  });
  return [route, ...steep];
}

/** White diamond on the point designated on the profile. */
export function focusFeature(coordinate: MarsCoordinate) {
  const feature = new Feature(new Point(lonLat(coordinate)));
  feature.setStyle(
    new Style({
      image: new RegularShape({
        points: 4,
        radius: 10,
        fill: new Fill({ color: '#fff' }),
        stroke: new Stroke({ color: CASING, width: 3 }),
      }),
    }),
  );
  return feature;
}

/** Vector layer drawn above the rover history (2) and below the sites (3) or above them (4). */
export const overlayLayer = (zIndex: number) => new VectorLayer({ zIndex, source: new VectorSource({ wrapX: false }) });
