"""Download the MVP extracts and freeze them with a manifest in apps/web/public/data.

Run explicitly with `pnpm data:prepare`. This is the only step that uses the network.
Output is built in a staging folder and swapped in only after validation succeeds.
"""

import hashlib
import json
import shutil
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime
from io import BytesIO
from pathlib import Path

import numpy as np
import tifffile
from PIL import Image

from . import check, geo, spec


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


def cached_dem() -> bytes:
    """The DEM is static and large: reuse a verified local copy instead of downloading again."""
    cache = spec.CACHE_DIR / Path(spec.DEM_URL).name
    if cache.exists() and sha256(cache.read_bytes()) == spec.DEM_SHA256:
        return cache.read_bytes()
    data = fetch(spec.DEM_URL)
    if sha256(data) != spec.DEM_SHA256:
        raise RuntimeError(
            "CTX DEM changed upstream (sha256 mismatch). Review the new file, then update DEM_SHA256."
        )
    cache.parent.mkdir(parents=True, exist_ok=True)
    cache.write_bytes(data)
    return data


def prepare_mola(retrieved_at: str) -> dict:
    """Global basemap: orientation only, streamed from Trek, never frozen."""
    capabilities = fetch(spec.MOLA_CAPABILITIES_URL)
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


def fetch_tile(job: tuple[int, int, int]) -> tuple[tuple[int, int, int], bytes, int]:
    zoom, col, row = job
    url = spec.HIRISE_TILE_TEMPLATE.format(z=zoom, y=row, x=col)
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
        for (zoom, col, row), data, transparent_count in pool.map(fetch_tile, jobs):
            transparent += transparent_count
            files.append(write_file(staging, f"jezero/hirise/{zoom}/{row}/{col}.png", data, "image/png"))

    finest = ranges[-1]
    extent = geo.union(
        geo.tile_extent(finest["z"], finest["colMin"], finest["rowMin"]),
        geo.tile_extent(finest["z"], finest["colMax"], finest["rowMax"]),
    )
    return {
        "id": "jezero-hirise-mosaic",
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


def clip_elevation(array: np.ndarray, nodata: float) -> np.ndarray:
    """Little-endian float32 with NaN wherever the source has no data; never 0."""
    clipped = array.astype("<f4", copy=True)
    clipped[(array == np.float32(nodata)) | ~np.isfinite(array)] = np.nan
    return clipped


def prepare_dem(staging: Path, retrieved_at: str) -> dict:
    raw = cached_dem()
    with tifffile.TiffFile(BytesIO(raw)) as tif:
        page = tif.pages[0]
        full = page.asarray()
        scale = page.tags["ModelPixelScaleTag"].value
        tiepoint = page.tags["ModelTiepointTag"].value
        nodata = float(page.tags["GDAL_NODATA"].value)
        pixel_is_area = page.geotiff_tags.get("GTRasterTypeGeoKey") == 1
    if scale[0] != spec.DEM_PIXEL_M or scale[1] != spec.DEM_PIXEL_M or tiepoint[:2] != (0.0, 0.0):
        raise RuntimeError("Unexpected DEM geotransform: review the window computation.")
    if not pixel_is_area:
        raise RuntimeError("DEM is not PixelIsArea: tie point would be a pixel centre.")

    origin = (tiepoint[3], tiepoint[4])
    window = geo.dem_window(origin, spec.DEM_PIXEL_M, full.shape, spec.SECTOR, spec.MARS_RADIUS_M)
    row0, row1, col0, col1 = window
    clipped = clip_elevation(full[row0:row1, col0:col1], nodata)
    nodata_cells = int(np.isnan(clipped).sum())
    entry = write_file(staging, "jezero/dem/ctx-20m.f32", clipped.tobytes(), "application/octet-stream")
    return {
        "id": "jezero-ctx-dem",
        "regionId": "jezero",
        "title": "Altitudes CTX 20 m de Jezero (secteur du front du delta)",
        "kind": "elevation",
        "instrument": "Mars Reconnaissance Orbiter, caméra CTX (modèle numérique stéréo)",
        "delivery": "local",
        "source": {
            "url": spec.DEM_URL,
            "retrievedAt": retrieved_at,
            "credit": "USGS Astrogeology Science Center ; NASA/JPL, Mars 2020 Terrain Relative Navigation CTX DTM",
            "terms": spec.UNVERIFIED_TERMS,
            "fingerprint": fingerprint("GeoTIFF", raw),
        },
        "acquisition": {
            "date": None,
            "sol": None,
            "note": "Mosaïque de modèles stéréo CTX ; dates non relevées.",
        },
        "units": {"elevation": "metre"},
        "crs": "Equirectangular Mars 2000 Sphere IAU (central meridian 0, standard parallel 0), metres",
        "extent": geo.window_extent(origin, spec.DEM_PIXEL_M, window, spec.MARS_RADIUS_M),
        "resolution": {"value": spec.DEM_PIXEL_M, "unit": "m/pixel"},
        "noData": {"kind": "nan", "sourceValue": nodata, "cellCount": nodata_cells},
        "status": "available" if nodata_cells == 0 else "partial",
        "version": "soc_008",
        "limitations": [
            "Une maille de 20 m ne résout pas les blocs isolés et ne certifie aucune praticabilité à pied.",
            "Datum vertical non documenté dans ce contrôle : ne pas le mélanger aux altitudes des prélèvements.",
            "Recalage horizontal et vertical non validé indépendamment.",
        ],
        "raster": {
            "width": int(clipped.shape[1]),
            "height": int(clipped.shape[0]),
            "dtype": "float32",
            "byteOrder": "little-endian",
            "rowOrder": "north-to-south",
            "pixelSizeMetres": spec.DEM_PIXEL_M,
        },
        "files": [entry],
    }


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


def not_integrated(capability_id: str, label: str) -> dict:
    return {
        "id": capability_id,
        "label": label,
        "status": "unavailable",
        "datasetIds": [],
        "reason": spec.CAPABILITY_NOT_INTEGRATED,
    }


def build_manifest(datasets: list[dict], sites: list[dict], generated_at: str) -> dict:
    by_id = {d["id"]: d for d in datasets}

    def available(capability_id: str, label: str, dataset_id: str) -> dict:
        return {
            "id": capability_id,
            "label": label,
            "status": by_id[dataset_id]["status"],
            "datasetIds": [dataset_id],
        }

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
                    available("terrain-dem", "Relief CTX 20 m", "jezero-ctx-dem"),
                    available("science-sites", "Sites scientifiques", "jezero-sampling-sites"),
                    not_integrated("rover-traverse", "Trace historique de Perseverance"),
                    not_integrated("thermal-themis", "Infrarouge nocturne THEMIS"),
                    not_integrated("weather-meda", "Température et pression MEDA"),
                    not_integrated("geology", "Carte géologique"),
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
    datasets = [
        prepare_mola(retrieved_at),
        prepare_hirise(staging, retrieved_at),
        prepare_dem(staging, retrieved_at),
        sites_dataset,
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
