import type { MarsCoordinate } from '@marps/mission-core';

/** Manifest format produced by tools/data; bump with `SCHEMA_VERSION` in tools/data/marps_data/spec.py. */
export const MANIFEST_SCHEMA_VERSION = 3;

/** Lon/lat box in planetocentric degrees, longitude positive east. */
export interface Extent {
  readonly west: number;
  readonly south: number;
  readonly east: number;
  readonly north: number;
}

/** `partial` means holes exist (NoData); `unavailable` means nothing usable. Never infer coverage from a basemap. */
export type DataStatus = 'available' | 'partial' | 'unavailable';
/** `slope` and `hillshade` are computed from the `elevation` dataset named by `derivedFrom`. */
export type DatasetKind = 'basemap' | 'imagery' | 'elevation' | 'slope' | 'hillshade' | 'sites' | 'rover-waypoints' | 'rover-traverse';
/** `local` files are frozen under the data root; `remote` is streamed and not available offline. */
export type DatasetDelivery = 'local' | 'remote';
export type RegionKind = 'orientation' | 'detailed';

export interface SourceTerms {
  readonly summary: string;
  readonly url: string;
  /** False when the terms of this specific product were not read yet. */
  readonly verified: boolean;
}

export interface SourceFingerprint {
  /** What was hashed, for example the upstream GeoTIFF or the WMTS capabilities document. */
  readonly target: string;
  readonly sha256: string;
  readonly bytes: number;
}

export interface DatasetSource {
  readonly url: string;
  readonly tileUrlTemplate?: string;
  /** UTC instant of the download, `YYYY-MM-DDTHH:MM:SSZ`. */
  readonly retrievedAt: string;
  readonly credit: string;
  readonly terms: SourceTerms;
  readonly fingerprint: SourceFingerprint;
}

/** `date` and `sol` are null when no single value applies; `note` says why. */
export interface Acquisition {
  readonly date: string | null;
  readonly sol: string | null;
  readonly note: string;
}

export interface Resolution {
  readonly value: number;
  readonly unit: 'm/pixel';
}

/** Absent data is never encoded as 0: transparent pixels for images, NaN for elevation and slope. */
export type NoDataPolicy =
  | { readonly kind: 'not-applicable' }
  | { readonly kind: 'alpha-channel'; readonly transparentPixelCount: number }
  | { readonly kind: 'nan'; readonly sourceValue: number; readonly cellCount: number };

export interface FrozenFile {
  /** Relative to the data root served at `/data/`. */
  readonly path: string;
  readonly bytes: number;
  readonly sha256: string;
  readonly mediaType: string;
}

export interface TileRange {
  readonly z: number;
  readonly colMin: number;
  readonly colMax: number;
  readonly rowMin: number;
  readonly rowMax: number;
}

/** Frozen WMTS tiles; the path is `urlTemplate` with z, y (row) and x (column) filled in. */
export interface TileSet {
  readonly matrixSet: string;
  readonly tileSize: number;
  readonly urlTemplate: string;
  readonly ranges: readonly TileRange[];
  readonly finestMetresPerPixel: number;
}

/**
 * Row-major float32 grid, first row at the north edge; NaN marks NoData.
 *
 * Cell (row, column) covers x from `origin.x + column * pixelSizeMetres` and y down from
 * `origin.y - row * pixelSizeMetres`, where x = R * longitude and y = R * latitude in radians.
 */
export interface RasterGrid {
  readonly width: number;
  readonly height: number;
  readonly dtype: 'float32';
  readonly byteOrder: 'little-endian';
  readonly rowOrder: 'north-to-south';
  /**
   * Cell size in projected metres. On the ground a cell is this long north-south
   * but only `pixelSizeMetres * cos(latitude)` wide east-west.
   */
  readonly pixelSizeMetres: number;
  /** Projected metres of the north-west corner of the grid. */
  readonly origin: { readonly x: number; readonly y: number };
  readonly projection: {
    readonly name: 'equirectangular';
    readonly centralMeridian: 0;
    readonly standardParallel: 0;
    readonly radiusMetres: number;
  };
  /** How source pixels were merged into a cell; null when the grid keeps the source pixels. */
  readonly aggregation: {
    readonly method: 'block-mean';
    readonly factor: number;
    readonly sourcePixelSizeMetres: number;
  } | null;
  /** A cell size is a sampling step, not a positioning accuracy: never present it as one. */
  readonly navigationGrade: false;
}

export interface ImageryWmts {
  readonly layer: string;
  readonly style: string;
  readonly matrixSet: string;
  readonly crs: string;
  readonly format: string;
  readonly extent: Extent;
  readonly matrices: readonly { readonly id: string; readonly origin: readonly number[]; readonly tileSize: number; readonly width: number; readonly height: number }[];
}

export interface DatasetDescriptor {
  readonly wmts?: ImageryWmts;
  readonly id: string;
  readonly regionId: string;
  readonly title: string;
  readonly kind: DatasetKind;
  readonly instrument: string;
  readonly delivery: DatasetDelivery;
  readonly source: DatasetSource;
  readonly acquisition: Acquisition;
  /** Unit of each value, for example `{ elevation: 'metre' }`; empty when values are unitless. */
  readonly units: Readonly<Record<string, string>>;
  /** Native CRS of the stored data. `extent` is always lon/lat degrees. */
  readonly crs: string;
  readonly extent: Extent;
  /** Null for vector data. */
  readonly resolution: Resolution | null;
  readonly noData: NoDataPolicy;
  readonly status: DataStatus;
  /** Version of the upstream product. */
  readonly version: string;
  readonly limitations: readonly string[];
  readonly files: readonly FrozenFile[];
  readonly tileset?: TileSet;
  /** Present for `elevation` and `slope`. A `hillshade` image covers the grid of `derivedFrom`. */
  readonly raster?: RasterGrid;
  /** Reference surface of the elevations; only for `elevation`. */
  readonly verticalDatum?: string;
  /** Id of the elevation dataset a `slope` or `hillshade` was computed from. */
  readonly derivedFrom?: string;
}

export interface SiteDescriptor {
  readonly id: string;
  readonly name: string;
  readonly regionId: string;
  readonly datasetId: string;
  readonly coordinate: MarsCoordinate;
  /** Null when unknown. `datum` is null when the source does not document it. */
  readonly elevation: { readonly value: number; readonly unit: 'metre'; readonly datum: string | null } | null;
  /** Source strings kept as published, for example "490 & 495". */
  readonly sol: string;
  readonly date: string;
  readonly sampleName: string;
  readonly rockType: string;
}

export interface Capability {
  readonly id: string;
  readonly label: string;
  readonly status: DataStatus;
  readonly datasetIds: readonly string[];
  /** Required when `status` is `unavailable`. */
  readonly reason?: string;
}

export interface RegionCoverage {
  readonly id: string;
  readonly name: string;
  /** `orientation` regions only guide navigation; detailed capabilities exist only where listed. */
  readonly kind: RegionKind;
  readonly extent: Extent;
  readonly capabilities: readonly Capability[];
}

export interface DataManifest {
  readonly schemaVersion: typeof MANIFEST_SCHEMA_VERSION;
  readonly generatedAt: string;
  readonly planet: {
    readonly name: string;
    readonly radiusMeters: number;
    readonly coordinates: 'planetocentric';
    readonly longitude: string;
  };
  readonly regions: readonly RegionCoverage[];
  readonly datasets: readonly DatasetDescriptor[];
  readonly sites: readonly SiteDescriptor[];
}
