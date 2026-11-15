"""Download the MVP extracts and freeze them with a manifest in apps/web/public/data.

Run explicitly with `pnpm data:prepare`. This is the only step that uses the network.
Output is built in a staging folder and swapped in only after validation succeeds.
"""

import hashlib
import json
import shutil
import urllib.request
import zipfile
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from datetime import UTC, datetime
from functools import partial
from io import BytesIO
from pathlib import Path

import numpy as np
import pyogrio
import shapely
import tifffile
from PIL import Image

from .wmts import imagery_wmts
from . import check, geo, geology, meda, spec, terrain
from .rover import prepare_rover

# Covers the TIFF tags and the row offsets of the largest source (HiRISE: 172 609 bytes).
HEADER_BYTES = 262_144


def now_utc() -> str:
    return datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def fetch(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": spec.USER_AGENT})
    with urllib.request.urlopen(request, timeout=60) as response:  # noqa: S310 (fixed https URLs)
        if response.status != 200:
            raise RuntimeError(f"{url}: HTTP {response.status}")
        return response.read()


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def fingerprint(target: str, data: bytes) -> dict:
    return {"target": target, "sha256": sha256(data), "bytes": len(data)}


def write_file(root: Path, relative: str, data: bytes, media_type: str) -> dict:
    path = root / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    return {"path": relative, "bytes": len(data), "sha256": sha256(data), "mediaType": media_type}


def fetch_range(url: str, start: int, end: int) -> bytes:
    """Bytes start to end (exclusive), for sources too large to download whole."""
    headers = {"User-Agent": spec.USER_AGENT, "Range": f"bytes={start}-{end - 1}"}
    request = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(request, timeout=600) as response:  # noqa: S310 (fixed https URLs)
        data = response.read()
        if response.status != 206 or len(data) != end - start:
            raise RuntimeError(f"{url}: range {start}-{end} not served (HTTP {response.status}, {len(data)} bytes)")
        return data


def cached(name: str, expected_sha256: str, download: Callable[[], bytes]) -> bytes:
    """Static upstream files (elevation, MEDA CSV): reuse a verified local copy instead of downloading again."""
    cache = spec.CACHE_DIR / name
    if cache.exists() and sha256(cache.read_bytes()) == expected_sha256:
        return cache.read_bytes()
    data = download()
    if sha256(data) != expected_sha256:
        raise RuntimeError(
            f"{name}: sha256 {sha256(data)} differs from the pin. The source changed upstream "
            "or the sector moved. Review the data, then update the pin in spec.py."
        )
    cache.parent.mkdir(parents=True, exist_ok=True)
    cache.write_bytes(data)
    return data


def prepare_mola(staging: Path, retrieved_at: str) -> dict:
    """Global basemap: orientation only, streamed from Trek. Only its two level-0 tiles are frozen, as the offline fallback."""
    capabilities = fetch(spec.MOLA_CAPABILITIES_URL)
    for name, tile in spec.MOLA_FALLBACK_TILES.items():
        _, data, _ = fetch_tile(spec.MOLA_TILE_TEMPLATE, tile)
        write_file(staging, f"{check.MOLA_FALLBACK_DIR}/{name}.jpg", data, "image/jpeg")
    return {
        "id": "mola-colorized-relief",
        "regionId": "global",
        "title": "Relief colorisé MOLA (orientation mondiale)",
        "kind": "basemap",
        "instrument": "Mars Global Surveyor, altimètre laser MOLA (relief colorisé et ombré)",
        "delivery": "remote",
        "source": {
            "url": spec.MOLA_CAPABILITIES_URL,
            "tileUrlTemplate": spec.MOLA_TILE_TEMPLATE,
            "retrievedAt": retrieved_at,
            "credit": "NASA / équipe scientifique MGS MOLA ; distribué par NASA Mars Trek",
            "terms": spec.NASA_TERMS,
            "fingerprint": fingerprint("WMTSCapabilities.xml", capabilities),
        },
        "acquisition": {
            "date": None,
            "sol": None,
            "note": "Mosaïque globale ; pas de date d'acquisition unique.",
        },
        "units": {},
        "crs": "urn:ogc:def:crs:EPSG::104905",
        "extent": spec.GLOBAL_EXTENT,
        "resolution": {"value": 463.0, "unit": "m/pixel"},
        "noData": {"kind": "not-applicable"},
        "status": "available",
        "version": "merge_global_463m",
        "limitations": [
            "Représentation colorisée : aucune valeur d'altitude numérique.",
            "Orientation uniquement : n'active aucune donnée scientifique détaillée.",
            "Grille équirectangulaire 2 × 1 tuiles au niveau 0, pas Web Mercator.",
        ],
        "files": [],
    }


def fetch_tile(template: str, job: tuple[int, int, int]) -> tuple[tuple[int, int, int], bytes, int]:
    zoom, col, row = job
    url = template.format(z=zoom, y=row, x=col)
    data = fetch(url)
    image = Image.open(BytesIO(data))
    image.load()
    if image.size != (geo.TILE_SIZE, geo.TILE_SIZE):
        raise RuntimeError(f"{url}: unexpected tile size {image.size}")
    return job, data, check.transparent_pixels(image)


def prepare_hirise(staging: Path, retrieved_at: str) -> dict:
    capabilities = fetch(spec.HIRISE_CAPABILITIES_URL)
    files = [write_file(staging, "jezero/hirise/WMTSCapabilities.xml", capabilities, "application/xml")]

    ranges, jobs = [], []
    for zoom in spec.HIRISE_ZOOMS:
        col_min, col_max, row_min, row_max = geo.tile_range(spec.SECTOR, zoom)
        ranges.append({"z": zoom, "colMin": col_min, "colMax": col_max, "rowMin": row_min, "rowMax": row_max})
        jobs += [(zoom, c, r) for r in range(row_min, row_max + 1) for c in range(col_min, col_max + 1)]

    transparent = 0
    with ThreadPoolExecutor(max_workers=4) as pool:
        for (zoom, col, row), data, transparent_count in pool.map(partial(fetch_tile, spec.HIRISE_TILE_TEMPLATE), jobs):
            transparent += transparent_count
            files.append(write_file(staging, f"jezero/hirise/{zoom}/{row}/{col}.png", data, "image/png"))

    finest = ranges[-1]
    extent = geo.union(
        geo.tile_extent(finest["z"], finest["colMin"], finest["rowMin"]),
        geo.tile_extent(finest["z"], finest["colMax"], finest["rowMax"]),
    )
    return {
        "id": "jezero-hirise-mosaic",
        "wmts": imagery_wmts(capabilities),
        "regionId": "jezero",
        "title": "Mosaïque HiRISE de Jezero (secteur du front du delta)",
        "kind": "imagery",
        "instrument": "Mars Reconnaissance Orbiter, caméra HiRISE (mosaïque orthorectifiée)",
        "delivery": "local",
        "source": {
            "url": spec.HIRISE_CAPABILITIES_URL,
            "tileUrlTemplate": spec.HIRISE_TILE_TEMPLATE,
            "retrievedAt": retrieved_at,
            "credit": "NASA/JPL-Caltech/University of Arizona ; distribué par NASA Mars Trek",
            "terms": spec.UNVERIFIED_TERMS,
            "fingerprint": fingerprint("WMTSCapabilities.xml", capabilities),
        },
        "acquisition": {
            "date": None,
            "sol": None,
            "note": "Mosaïque d'observations multiples ; dates non relevées par tuile.",
        },
        "units": {},
        "crs": "urn:ogc:def:crs:EPSG::104905",
        "extent": extent,
        "resolution": {"value": 0.25, "unit": "m/pixel"},
        "noData": {"kind": "alpha-channel", "transparentPixelCount": transparent},
        "status": "available" if transparent == 0 else "partial",
        "version": "soc_006",
        "limitations": [
            "Tuiles figées de zoom 12 à 16 sur le secteur ; le zoom 16 vaut environ 0,64 m/pixel.",
            "Les pixels transparents signifient absence de couverture, pas du noir.",
            "L'image ne mesure ni pente, ni portance du sol.",
        ],
        "tileset": {
            "matrixSet": "default028mm",
            "tileSize": geo.TILE_SIZE,
            "urlTemplate": "jezero/hirise/{z}/{y}/{x}.png",
            "ranges": ranges,
            "finestMetresPerPixel": geo.metres_per_pixel(finest["z"], spec.MARS_RADIUS_M),
        },
        "files": files,
    }


def prepare_themis(staging: Path, retrieved_at: str, footprint: geo.Extent) -> dict:
    """Night infrared context: the finest THEMIS level over the whole HiRISE product, frozen for offline use."""
    capabilities = fetch(spec.THEMIS_CAPABILITIES_URL)
    files = [write_file(staging, "jezero/themis/WMTSCapabilities.xml", capabilities, "application/xml")]
    zoom = spec.THEMIS_ZOOM
    col_min, col_max, row_min, row_max = geo.tile_range(footprint, zoom)
    jobs = [(zoom, c, r) for r in range(row_min, row_max + 1) for c in range(col_min, col_max + 1)]

    transparent = 0
    with ThreadPoolExecutor(max_workers=4) as pool:
        for (_, col, row), data, transparent_count in pool.map(partial(fetch_tile, spec.THEMIS_TILE_TEMPLATE), jobs):
            transparent += transparent_count
            files.append(write_file(staging, f"jezero/themis/{zoom}/{row}/{col}.png", data, "image/png"))

    return {
        "id": "jezero-themis-night-ir",
        "regionId": "jezero",
        "title": "Infrarouge de nuit THEMIS (contexte thermique)",
        "kind": "thermal",
        "instrument": "Mars Odyssey, caméra THEMIS (mosaïque contrôlée de l'infrarouge de nuit)",
        "delivery": "local",
        "source": {
            "url": spec.THEMIS_CAPABILITIES_URL,
            "tileUrlTemplate": spec.THEMIS_TILE_TEMPLATE,
            "retrievedAt": retrieved_at,
            "credit": "NASA/JPL-Caltech/Arizona State University ; mosaïque USGS ; distribué par NASA Mars Trek",
            "terms": spec.UNVERIFIED_TERMS,
            "fingerprint": fingerprint("WMTSCapabilities.xml", capabilities),
        },
        "acquisition": {
            "date": None,
            "sol": None,
            "note": "Mosaïque historique publiée en octobre 2018, assemblée à partir de nombreuses nuits ; dates non relevées par tuile.",
        },
        "units": {},
        "crs": "urn:ogc:def:crs:EPSG::104905",
        "extent": geo.union(geo.tile_extent(zoom, col_min, row_min), geo.tile_extent(zoom, col_max, row_max)),
        "resolution": {"value": 100.0, "unit": "m/pixel"},
        "noData": {"kind": "alpha-channel", "transparentPixelCount": transparent},
        "status": "available" if transparent == 0 else "partial",
        "version": "v2_oct2018",
        "limitations": [
            "Niveaux de gris étirés pour l'affichage (USGS : produit qualitatif) : ni température, ni inertie thermique chiffrée.",
            "Sombre : matériaux fins (poussière, sable) ; clair : roche ou sol induré. Lecture qualitative.",
            "Seul le niveau 9 (environ 81 m/pixel) est figé, sur l'emprise du produit HiRISE ; aucune tuile au-delà.",
        ],
        "tileset": {
            "matrixSet": "default028mm",
            "tileSize": geo.TILE_SIZE,
            "urlTemplate": "jezero/themis/{z}/{y}/{x}.png",
            "ranges": [{"z": zoom, "colMin": col_min, "colMax": col_max, "rowMin": row_min, "rowMax": row_max}],
            "finestMetresPerPixel": geo.metres_per_pixel(zoom, spec.MARS_RADIUS_M),
        },
        "files": files,
    }


def clip_elevation(array: np.ndarray, nodata: float) -> np.ndarray:
    """Little-endian float32 with NaN wherever the source has no data; never 0."""
    clipped = array.astype("<f4", copy=True)
    clipped[(array == np.float32(nodata)) | ~np.isfinite(array)] = np.nan
    return clipped


@dataclass(frozen=True)
class SourceGrid:
    """Layout of an upstream elevation GeoTIFF, read from its header alone."""

    shape: tuple[int, int]
    origin: tuple[float, float]  # projected metres of the north-west corner
    nodata: float
    data_offset: int  # byte of the first row; rows follow one another without gaps


def read_grid_header(head: bytes, product: spec.ElevationProduct) -> SourceGrid:
    """Refuses any layout the byte arithmetic and the lon/lat conversion do not handle."""
    with tifffile.TiffFile(BytesIO(head)) as tif:
        page = tif.pages[0]
        keys = page.geotiff_tags
        scale = page.tags["ModelPixelScaleTag"].value
        tiepoint = page.tags["ModelTiepointTag"].value
        nodata = float(page.tags["GDAL_NODATA"].value)
        offsets = np.asarray(page.dataoffsets)
        shape = (int(page.shape[0]), int(page.shape[1]))
        raw_float32 = page.compression == 1 and page.dtype == np.float32 and tif.byteorder == "<"
        strip_bytes = page.rowsperstrip * shape[1] * 4
    if not raw_float32 or not (np.diff(offsets) == strip_bytes).all():
        raise RuntimeError(f"{product.slug}: expected uncompressed little-endian float32 rows stored in order.")
    if scale[:2] != (product.source_pixel_m, product.source_pixel_m) or tiepoint[:2] != (0.0, 0.0):
        raise RuntimeError(f"{product.slug}: unexpected geotransform, review the window computation.")
    if keys.get("GTRasterTypeGeoKey") != 1:
        raise RuntimeError(f"{product.slug}: not PixelIsArea, the tie point would be a pixel centre.")
    if (
        keys.get("ProjCoordTransGeoKey") != 17  # CT_Equirectangular
        or keys.get("ProjStdParallel1GeoKey") != 0.0
        or keys.get("ProjCenterLongGeoKey") != 0.0
        or keys.get("GeogSemiMajorAxisGeoKey") != spec.MARS_RADIUS_M
    ):
        raise RuntimeError(f"{product.slug}: projection is not the expected equirectangular Mars sphere.")
    return SourceGrid(shape, (tiepoint[3], tiepoint[4]), nodata, int(offsets[0]))


def padded_block(rows: np.ndarray, first_row: int, wanted: tuple[int, int, int, int], nodata: float) -> np.ndarray:
    """Source pixels of the wanted window (row0, row1, col0, col1), NaN where it leaves the raster.

    rows holds full-width source rows starting at first_row.
    """
    row0, row1, col0, col1 = wanted
    block = np.full((row1 - row0, col1 - col0), np.nan, dtype="<f4")
    top, left = max(row0, first_row), max(col0, 0)
    inside = clip_elevation(rows[top - first_row : row1 - first_row, left:col1], nodata)
    block[top - row0 : top - row0 + inside.shape[0], left - col0 : left - col0 + inside.shape[1]] = inside
    return block


def shade_png(shade: np.ndarray) -> bytes:
    """Greyscale PNG with a transparent pixel wherever the relief is unknown."""
    known = ~np.isnan(shade)
    grey = np.where(known, np.rint(np.nan_to_num(shade) * 255), 0).astype(np.uint8)
    buffer = BytesIO()
    Image.fromarray(np.dstack([grey, known.astype(np.uint8) * 255]), "LA").save(buffer, "PNG")
    return buffer.getvalue()


def prepare_terrain(staging: Path, retrieved_at: str, product: spec.ElevationProduct) -> list[dict]:
    """Elevation, slope and shaded relief of the sector, all on the same grid."""
    name = Path(product.url).name
    if product.whole_file:
        whole = cached(name, product.sha256, lambda: fetch(product.url))
        grid = read_grid_header(whole, product)
    else:
        grid = read_grid_header(fetch_range(product.url, 0, HEADER_BYTES), product)

    factor, cell = product.aggregation, product.cell_m
    cells = (grid.shape[0] // factor, grid.shape[1] // factor)
    row0, row1, col0, col1 = geo.dem_window(grid.origin, cell, cells, spec.SECTOR, spec.MARS_RADIUS_M)
    # One extra cell on each side feeds the 3x3 slope kernel, so the stored edges have real neighbours.
    wanted = ((row0 - 1) * factor, (row1 + 1) * factor, (col0 - 1) * factor, (col1 + 1) * factor)
    first, last = max(wanted[0], 0), min(wanted[1], grid.shape[0])
    row_bytes = grid.shape[1] * 4
    start, end = grid.data_offset + first * row_bytes, grid.data_offset + last * row_bytes
    if product.whole_file:
        block, source_print = whole[start:end], fingerprint("GeoTIFF", whole)
    else:
        block = cached(f"{name}.rows-{first}-{last}", product.sha256, lambda: fetch_range(product.url, start, end))
        source_print = fingerprint(f"GeoTIFF, lignes {first} à {last - 1} (octets {start} à {end - 1})", block)
    rows = np.frombuffer(block, dtype="<f4").reshape(last - first, grid.shape[1])

    padded = terrain.block_mean(padded_block(rows, first, wanted, grid.nodata), factor)
    elevation = padded[1:-1, 1:-1].astype("<f4")
    origin = (grid.origin[0] + col0 * cell, grid.origin[1] - row0 * cell)
    east_m, north_m = terrain.ground_cell_size(origin[1], cell, elevation.shape[0], spec.MARS_RADIUS_M)
    to_east, to_north = terrain.gradients(padded, east_m, north_m)
    slope = terrain.slope_degrees(to_east, to_north).astype("<f4")
    shade = terrain.hillshade(to_east, to_north)

    raster = {
        "width": int(elevation.shape[1]),
        "height": int(elevation.shape[0]),
        "dtype": "float32",
        "byteOrder": "little-endian",
        "rowOrder": "north-to-south",
        "pixelSizeMetres": cell,
        "origin": {"x": origin[0], "y": origin[1]},
        "projection": {
            "name": "equirectangular",
            "centralMeridian": 0.0,
            "standardParallel": 0.0,
            "radiusMetres": spec.MARS_RADIUS_M,
        },
        "aggregation": None
        if factor == 1
        else {"method": "block-mean", "factor": factor, "sourcePixelSizeMetres": product.source_pixel_m},
        "navigationGrade": False,
    }
    def dataset(suffix: str, kind: str, title: str, units: dict, no_data: dict, missing: int, limitations: tuple) -> dict:
        return {
            "id": f"jezero-{product.slug}-{suffix}",
            "regionId": "jezero",
            "title": f"{title} {product.title}",
            "kind": kind,
            "instrument": product.instrument,
            "delivery": "local",
            "source": {
                "url": product.url,
                "retrievedAt": retrieved_at,
                "credit": product.credit,
                "terms": {"summary": spec.USGS_TERMS_SUMMARY, "url": product.record_url, "verified": True},
                "fingerprint": source_print,
            },
            "acquisition": {"date": None, "sol": None, "note": product.acquisition_note},
            "units": units,
            "crs": "Equirectangular Mars 2000 Sphere IAU (central meridian 0, standard parallel 0), metres",
            "extent": geo.window_extent(grid.origin, cell, (row0, row1, col0, col1), spec.MARS_RADIUS_M),
            "resolution": {"value": cell, "unit": "m/pixel"},
            "noData": no_data,
            "status": "available" if missing == 0 else "partial",
            "version": product.version,
            "limitations": [*limitations, *spec.TERRAIN_LIMITATIONS],
        }

    def grid_dataset(suffix: str, kind: str, title: str, units: dict, values: np.ndarray, limitations: tuple) -> dict:
        missing = int(np.isnan(values).sum())
        no_data = {"kind": "nan", "sourceValue": grid.nodata, "cellCount": missing}
        file_suffix = "" if kind == "elevation" else f"-{suffix}"
        entry = write_file(staging, f"{product.file_stem}{file_suffix}.f32", values.tobytes(), "application/octet-stream")
        return {**dataset(suffix, kind, title, units, no_data, missing, limitations), "raster": raster, "files": [entry]}

    dem = grid_dataset("dem", "elevation", "Altitudes", {"elevation": "metre"}, elevation, product.limitations)
    slopes = grid_dataset(
        "slope",
        "slope",
        "Pentes",
        {"slope": "degree"},
        slope,
        (
            f"Pente moyenne sur 3 × 3 mailles (méthode de Horn), soit une base de {2 * cell:g} m : "
            "pas la pente locale sous le pied.",
            "Largeur est-ouest des mailles réduite de cos(latitude) : la projection l'étire d'environ 5 % à Jezero.",
        ),
    )
    unlit = int(np.isnan(shade).sum())
    shaded = dataset(
        "hillshade",
        "hillshade",
        "Relief ombré",
        {},
        {"kind": "alpha-channel", "transparentPixelCount": unlit},
        unlit,
        (
            f"Éclairage fictif (azimut {terrain.LIGHT_AZIMUTH_DEG:g}°, hauteur {terrain.LIGHT_ALTITUDE_DEG:g}°) "
            "sans exagération verticale : aide visuelle, pas une mesure.",
            "Image à la maille de la grille : l'étirer sur son emprise, sans la comparer au détail de l'imagerie.",
        ),
    )
    shade_entry = write_file(staging, f"{product.file_stem}-hillshade.png", shade_png(shade), "image/png")
    return [
        {**dem, "verticalDatum": spec.VERTICAL_DATUM},
        {**slopes, "derivedFrom": dem["id"]},
        {**shaded, "derivedFrom": dem["id"], "files": [shade_entry]},
    ]


def slug(name: str) -> str:
    return name.lower().replace(" ", "-")


def prepare_sites(staging: Path, retrieved_at: str) -> tuple[dict, list[dict]]:
    raw = fetch(spec.SITES_URL)
    collection = json.loads(raw)
    features = [f for f in collection["features"] if f["properties"].get("outcrop_name") in spec.SITE_NAMES]
    found = sorted(f["properties"]["outcrop_name"] for f in features)
    if found != sorted(spec.SITE_NAMES):
        raise RuntimeError(f"Expected one feature per site {spec.SITE_NAMES}, found {found}.")

    frozen = {**collection, "features": features}
    body = (json.dumps(frozen, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
    entry = write_file(staging, "jezero/sites/sites.geojson", body, "application/geo+json")

    sites = []
    for name in spec.SITE_NAMES:
        feature = next(f for f in features if f["properties"]["outcrop_name"] == name)
        longitude, latitude, elevation = feature["geometry"]["coordinates"]
        props = feature["properties"]
        sites.append(
            {
                "id": slug(name),
                "name": name,
                "regionId": "jezero",
                "datasetId": "jezero-sampling-sites",
                "coordinate": {"longitude": longitude, "latitude": latitude},
                "elevation": {"value": elevation, "unit": "metre", "datum": None},
                "sol": props["sol"],
                "date": props["date"],
                "sampleName": props["sample_name"],
                "rockType": props["rock_type"],
            }
        )
    extent = {
        "west": min(s["coordinate"]["longitude"] for s in sites),
        "east": max(s["coordinate"]["longitude"] for s in sites),
        "south": min(s["coordinate"]["latitude"] for s in sites),
        "north": max(s["coordinate"]["latitude"] for s in sites),
    }
    dataset = {
        "id": "jezero-sampling-sites",
        "regionId": "jezero",
        "title": "Points de prélèvement Perseverance : Skinner Ridge, Wildcat Ridge, Amalik",
        "kind": "sites",
        "instrument": "Rover Perseverance (Mars 2020), positions de prélèvement publiées par NASA",
        "delivery": "local",
        "source": {
            "url": spec.SITES_URL,
            "retrievedAt": retrieved_at,
            "credit": "NASA/JPL-Caltech, Mars 2020 Perseverance, carte des prélèvements (mars.nasa.gov)",
            "terms": spec.NASA_TERMS,
            "fingerprint": fingerprint("GeoJSON", raw),
        },
        "acquisition": {
            "date": None,
            "sol": None,
            "note": "Dates et sols propres à chaque prélèvement, conservés tels que publiés.",
        },
        "units": {"longitude": "degree", "latitude": "degree", "elevation": "metre"},
        "crs": "urn:ogc:def:crs:OGC:1.3:CRS84",
        "extent": extent,
        "resolution": None,
        "noData": {"kind": "not-applicable"},
        "status": "available",
        "version": "M20_SAMPLE_v3",
        "limitations": [
            "Points de prélèvement du rover, pas des positions humaines ni des centres d'affleurements.",
            "Datum vertical de l'altitude non documenté dans le fichier source.",
        ],
        "files": [entry],
    }
    return dataset, sites


def assert_no_wind(sol: int, fetcher: Callable[[str], bytes] = lambda url: fetch(url)) -> None:
    """Wind is declared unpublished only after checking both collections of the sol."""
    for collection in ("data_calibrated_env", "data_derived_env"):
        url = f"{spec.MEDA_BUNDLE}/{collection}/sol_0420_0539/sol_{sol:04d}/"
        found = meda.wind_files(fetcher(url).decode("utf-8"), sol)
        if found:
            raise RuntimeError(f"sol {sol} now has wind files {found}: integrate them instead of declaring wind unpublished.")


def prepare_meda(staging: Path, retrieved_at: str, sites: list[dict]) -> list[dict]:
    """One dataset per measure; each file holds the 24 LMST hours of one sol."""
    # Same pinned file as the rover layer (#20), so the map and the panel agree on the position.
    waypoints = json.loads(cached("M20_waypoints.json", spec.ROVER_HASHES["waypoints"], lambda: fetch(spec.WAYPOINTS_URL)))
    for sol in sorted({product.sol for product in spec.MEDA_PRODUCTS}):
        assert_no_wind(sol)
    datasets = []
    for product in spec.MEDA_PRODUCTS:
        label = meda.read_label(fetch(f"{product.base_url}.xml"), product.column)
        if label["unit"] != product.unit or label["sol"] != product.sol:
            raise RuntimeError(f"{product.product}: label declares {label['unit']} on sol {label['sol']}; review spec.py.")
        raw = cached(f"{product.product}.CSV", product.sha256, lambda url=f"{product.base_url}.CSV": fetch(url))
        if hashlib.md5(raw).hexdigest() != label["md5"]:  # noqa: S324 (PDS integrity checksum, not security)
            raise RuntimeError(f"{product.product}: CSV does not match the md5 of its PDS label.")
        hours = meda.hourly_values(raw.decode("ascii"), product.column, product.sol, product.valid_range)
        position = meda.rover_position(waypoints, product.sol)
        location = {**position, "nearestSite": meda.nearest_site(position, sites, spec.MARS_RADIUS_M)}
        series = {
            "measure": product.measure,
            "sol": product.sol,
            "column": product.column,
            "unit": product.unit,
            "sensor": product.sensor,
            "aggregation": "median",
            "timeScale": "LMST",
            "startUtc": label["startUtc"],
            "stopUtc": label["stopUtc"],
            "location": location,
            "hours": hours,
        }
        body = (json.dumps(series, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
        entry = write_file(staging, f"jezero/meda/{product.measure}-sol{product.sol:04d}.json", body, "application/json")
        empty_hours = sum(1 for h in hours if h["median"] is None)
        datasets.append(
            {
                "id": f"jezero-meda-{product.measure}",
                "regionId": "jezero",
                "title": product.title,
                "kind": "weather",
                "instrument": f"Rover Perseverance, station météo MEDA ({product.sensor})",
                "delivery": "local",
                "source": {
                    "url": f"{product.base_url}.CSV",
                    "labelUrl": f"{product.base_url}.xml",
                    "retrievedAt": retrieved_at,
                    "credit": spec.MEDA_CREDIT,
                    "terms": spec.UNVERIFIED_TERMS,
                    "fingerprint": fingerprint("CSV", raw),
                },
                "acquisition": {
                    "date": label["startUtc"][:10],
                    "sol": str(product.sol),
                    "note": f"Sol {product.sol}, du {label['startUtc']} au {label['stopUtc']} (UTC).",
                },
                "units": {product.measure: product.unit},
                "crs": "urn:ogc:def:crs:OGC:1.3:CRS84",
                # A rover that did not drive measures at one point.
                "extent": {
                    "west": position["longitude"],
                    "east": position["longitude"],
                    "south": position["latitude"],
                    "north": position["latitude"],
                },
                "resolution": None,
                "noData": {
                    "kind": "invalid-samples",
                    "invalidSampleCount": sum(h["invalid"] for h in hours),
                    "emptyHourCount": empty_hours,
                },
                "status": "available" if empty_hours == 0 else "partial",
                "version": product.product[-3:],
                "limitations": [*product.limitations, *spec.MEDA_LIMITATIONS],
                "files": [entry],
            }
        )
    return datasets


def prepare_geology(staging: Path, retrieved_at: str, sites: list[dict]) -> dict:
    """Interpretive geologic units around the sector (#28), from the geodatabase entries of the SIM 3464 zip."""
    size = spec.GEOLOGY_ZIP_BYTES
    tail_start = size - 65_536  # holds the central directory (about 23 KB) and its end record
    tail = fetch_range(spec.GEOLOGY_ZIP_URL, tail_start, size)
    start, end = geology.entry_span(zipfile.ZipFile(geology.SparseFile(size, {tail_start: tail})), spec.GEOLOGY_GDB_FOLDER)
    block = cached("sim3464-gdb.bin", spec.GEOLOGY_GDB_SHA256, lambda: fetch_range(spec.GEOLOGY_ZIP_URL, start, end))
    folder = spec.CACHE_DIR / "sim3464" / "Nili.gdb"
    shutil.rmtree(folder, ignore_errors=True)
    archive = zipfile.ZipFile(geology.SparseFile(size, {tail_start: tail, start: block}))
    geology.extract(archive, spec.GEOLOGY_GDB_FOLDER, folder)

    offset = spec.GEOLOGY_OFFSET_M[1]
    meta, _, wkb, fields = pyogrio.raw.read(folder, layer=spec.GEOLOGY_LAYER, bbox=geology.mtm_bounds(spec.SECTOR, 2 * offset))
    crs = meta["crs"].replace(" ", "")
    if '"central_meridian",77.5' not in crs or "3396190" not in crs:
        raise RuntimeError(f"{spec.GEOLOGY_LAYER}: projection differs from MTM 77.5° E on the Mars 2000 sphere; review geology.py.")
    columns = list(meta["fields"])
    symbols, names = fields[columns.index("symbol")], fields[columns.index("name")]
    units = [(str(symbols[i]), shapely.from_wkb(geometry)) for i, geometry in enumerate(wkb)]
    unit_names = {str(symbols[i]): str(names[i]) for i in range(len(units))}

    clipped = geology.clip_units(units, spec.SECTOR)
    site_units = geology.site_candidates(units, sites, offset)
    shown = sorted(set(clipped) | {c["symbol"] for s in site_units for c in s["candidates"]})
    unknown = [symbol for symbol in shown if symbol not in spec.GEOLOGY_UNITS]
    if unknown:
        raise RuntimeError(f"units {unknown} are new in the sector: give them a colour in spec.GEOLOGY_UNITS.")
    sector_area = shapely.box(spec.SECTOR["west"], spec.SECTOR["south"], spec.SECTOR["east"], spec.SECTOR["north"]).area
    covered = sum(geometry.area for geometry in clipped.values()) / sector_area

    collection = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {"symbol": symbol, "name": unit_names[symbol]},
                "geometry": {"type": "MultiPolygon", "coordinates": geology.polygon_rings(geometry)},
            }
            for symbol, geometry in clipped.items()
        ],
    }
    body = (json.dumps(collection, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8")
    entry = write_file(staging, "jezero/geology/units.geojson", body, "application/geo+json")
    return {
        "id": "jezero-geology-units",
        "regionId": "jezero",
        "title": "Unités géologiques de Jezero (carte USGS SIM 3464, secteur du front du delta)",
        "kind": "geology",
        "instrument": "Cartographie géologique interprétative sur mosaïque CTX semi-contrôlée (Mars Reconnaissance Orbiter)",
        "delivery": "local",
        "source": {
            "url": spec.GEOLOGY_ZIP_URL,
            "retrievedAt": retrieved_at,
            "credit": spec.GEOLOGY_CREDIT,
            "terms": spec.GEOLOGY_TERMS,
            "fingerprint": fingerprint("Octets de la géodatabase Nili.gdb dans l'archive", block),
        },
        "acquisition": {
            "date": None,
            "sol": None,
            "note": f"Carte publiée en {spec.GEOLOGY_PUBLISHED}, dessinée avant la mosaïque CTX contrôlée de juillet 2020.",
        },
        "units": {},
        "crs": "urn:ogc:def:crs:EPSG::104905",
        "extent": spec.SECTOR,
        "resolution": None,
        "noData": {"kind": "not-applicable"},
        "status": "available" if covered > 0.999 else "partial",
        "version": f"SIM 3464, couche {spec.GEOLOGY_LAYER}",
        "limitations": list(spec.GEOLOGY_LIMITATIONS),
        "files": [entry],
        "geology": {
            "authors": spec.GEOLOGY_AUTHORS,
            "published": spec.GEOLOGY_PUBLISHED,
            "scale": spec.GEOLOGY_SCALE,
            "interpretive": True,
            "recordUrl": spec.GEOLOGY_RECORD_URL,
            "registration": {
                "method": "none",
                "offsetMetres": {"min": spec.GEOLOGY_OFFSET_M[0], "max": offset},
                "sourceUrl": spec.GEOLOGY_README_URL,
            },
            "units": [
                {
                    "symbol": symbol,
                    "name": unit_names[symbol],
                    "period": geology.period(symbol),
                    "colour": spec.GEOLOGY_UNITS[symbol]["colour"],
                    "sectorShare": round(clipped[symbol].area / sector_area, 3) if symbol in clipped else 0.0,
                }
                for symbol in shown
            ],
            "sites": site_units,
        },
    }


def not_integrated(capability_id: str, label: str) -> dict:
    return {
        "id": capability_id,
        "label": label,
        "status": "unavailable",
        "datasetIds": [],
        "reason": spec.CAPABILITY_NOT_INTEGRATED,
    }


def unpublished(capability_id: str, label: str, reason: str, reason_url: str) -> dict:
    return {"id": capability_id, "label": label, "status": "unavailable", "datasetIds": [], "reason": reason, "reasonUrl": reason_url}


def build_manifest(datasets: list[dict], sites: list[dict], generated_at: str) -> dict:
    by_id = {d["id"]: d for d in datasets}

    def available(capability_id: str, label: str, *dataset_ids: str) -> dict:
        statuses = {by_id[dataset_id]["status"] for dataset_id in dataset_ids}
        return {
            "id": capability_id,
            "label": label,
            "status": "available" if statuses == {"available"} else "partial",
            "datasetIds": list(dataset_ids),
        }

    def terrain_ids(suffix: str) -> list[str]:
        return [f"jezero-{product.slug}-{suffix}" for product in spec.ELEVATION_PRODUCTS]

    return {
        "schemaVersion": spec.SCHEMA_VERSION,
        "generatedAt": generated_at,
        "planet": {
            "name": "Mars",
            "radiusMeters": spec.MARS_RADIUS_M,
            "coordinates": "planetocentric",
            "longitude": "degrees, positive east",
        },
        "regions": [
            {
                "id": "global",
                "name": "Mars",
                "kind": "orientation",
                "extent": spec.GLOBAL_EXTENT,
                "capabilities": [available("orientation-basemap", "Fond d'orientation", "mola-colorized-relief")],
            },
            {
                "id": "jezero",
                "name": "Jezero",
                "kind": "detailed",
                "extent": spec.SECTOR,
                "capabilities": [
                    available("imagery-hirise", "Imagerie HiRISE", "jezero-hirise-mosaic"),
                    available("terrain-dem", "Altitudes (HiRISE 4 m, repli CTX 20 m)", *terrain_ids("dem")),
                    available("terrain-slope", "Pentes (HiRISE 4 m, repli CTX 20 m)", *terrain_ids("slope")),
                    available("terrain-hillshade", "Relief ombré", *terrain_ids("hillshade")),
                    available("science-sites", "Sites scientifiques", "jezero-sampling-sites"),
                    available("rover-traverse", "Trace historique de Perseverance", "jezero-perseverance-waypoints", "jezero-perseverance-traverse"),
                    available("thermal-themis", "Infrarouge nocturne THEMIS", "jezero-themis-night-ir"),
                    available("weather-meda", "Température et pression MEDA", "jezero-meda-temperature", "jezero-meda-pressure"),
                    unpublished("weather-wind", "Vent MEDA", spec.MEDA_WIND_REASON, spec.MEDA_RELEASE_NOTES_URL),
                    available("geology", "Carte géologique (interprétative)", "jezero-geology-units"),
                ],
            },
        ],
        "datasets": datasets,
        "sites": sites,
    }


def main() -> None:
    retrieved_at = now_utc()
    staging = spec.CACHE_DIR / "staging"
    shutil.rmtree(staging, ignore_errors=True)
    staging.mkdir(parents=True)

    sites_dataset, sites = prepare_sites(staging, retrieved_at)
    hirise = prepare_hirise(staging, retrieved_at)
    datasets = [
        prepare_mola(staging, retrieved_at),
        hirise,
        prepare_themis(staging, retrieved_at, hirise["wmts"]["extent"]),
        *(d for product in spec.ELEVATION_PRODUCTS for d in prepare_terrain(staging, retrieved_at, product)),
        sites_dataset,
        *prepare_rover(staging, retrieved_at),
        *prepare_meda(staging, retrieved_at, sites),
        prepare_geology(staging, retrieved_at, sites),
    ]
    manifest = build_manifest(datasets, sites, retrieved_at)
    (staging / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", "utf-8")

    errors = check.validate(staging)
    if errors:
        raise SystemExit("Prepared data is invalid, nothing was written:\n" + "\n".join(errors))

    shutil.rmtree(spec.DATA_DIR, ignore_errors=True)
    spec.DATA_DIR.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(staging, spec.DATA_DIR)
    print(f"Wrote {len(datasets)} datasets to {spec.DATA_DIR}")


if __name__ == "__main__":
    main()
