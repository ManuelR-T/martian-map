"""Validate the frozen data and its manifest without any network access.

Run with `pnpm data:check`. Exits with status 1 and one line per problem.
"""

import hashlib
import json
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image

from . import geo, meda, spec

STATUSES = {"available", "partial", "unavailable"}
KINDS = {"basemap", "imagery", "elevation", "slope", "hillshade", "sites", "rover-waypoints", "rover-traverse", "weather", "thermal", "geology"}
DELIVERIES = {"local", "remote"}
NODATA_KINDS = {"not-applicable", "alpha-channel", "nan", "invalid-samples"}
# Mars spans about -8.2 km (Hellas) to +21.2 km (Olympus Mons) around the MOLA datum.
ELEVATION_RANGE_M = (-9000.0, 22000.0)
SLOPE_RANGE_DEG = (0.0, 90.0)
# The global map draws these two tiles when it is offline, so they are part of the frozen data.
MOLA_FALLBACK_DIR = "mola"
TEXT_FIELDS = ("id", "regionId", "title", "kind", "instrument", "delivery", "crs", "version", "status")


def transparent_pixels(image: Image.Image) -> int:
    """Pixels with alpha 0. Transparency is missing coverage and must stay distinct from black."""
    return int(image.convert("RGBA").getchannel("A").histogram()[0])


def missing(obj: dict, keys: tuple[str, ...]) -> list[str]:
    return [k for k in keys if obj.get(k) is None or obj.get(k) == ""]


def check_extent(extent: object, label: str) -> list[str]:
    if not isinstance(extent, dict):
        return [f"{label}: extent is missing"]
    reason = geo.extent_error(extent)
    return [f"{label}: invalid extent ({reason})"] if reason else []


def check_dataset_fields(d: dict) -> list[str]:
    label = f"dataset {d.get('id')}"
    errors = [f"{label}: missing field {k}" for k in missing(d, TEXT_FIELDS)]
    for key, allowed in (("kind", KINDS), ("delivery", DELIVERIES), ("status", STATUSES)):
        if d.get(key) not in allowed:
            errors.append(f"{label}: {key} must be one of {sorted(allowed)}")
    source = d.get("source") or {}
    errors += [f"{label}: missing source.{k}" for k in missing(source, ("url", "retrievedAt", "credit"))]
    errors += [f"{label}: missing source.terms.{k}" for k in missing(source.get("terms") or {}, ("summary", "url"))]
    errors += [f"{label}: missing source.fingerprint.{k}" for k in missing(source.get("fingerprint") or {}, ("target", "sha256"))]
    acquisition = d.get("acquisition") or {}
    if "date" not in acquisition or "sol" not in acquisition or not acquisition.get("note"):
        errors.append(f"{label}: acquisition needs explicit date, sol (null allowed) and a note")
    if not isinstance(d.get("units"), dict):
        errors.append(f"{label}: units must be an object")
    if "resolution" not in d:
        errors.append(f"{label}: resolution must be present (null for vector data)")
    elif d["resolution"] is not None and not (d["resolution"].get("value", 0) > 0 and d["resolution"].get("unit")):
        errors.append(f"{label}: resolution needs a positive value and a unit")
    if (d.get("noData") or {}).get("kind") not in NODATA_KINDS:
        errors.append(f"{label}: noData.kind must be one of {sorted(NODATA_KINDS)}")
    if not d.get("limitations"):
        errors.append(f"{label}: limitations must not be empty")
    if d.get("kind") == "weather":
        return errors  # a point: its extent is checked against the measurement position
    return errors + check_extent(d.get("extent"), label)


def check_weather(root: Path, region: dict | None, d: dict) -> list[str]:
    """Hourly MEDA series: 24 hours, a value only where valid samples exist, the rover inside the sector."""
    label = f"dataset {d.get('id')}"
    units = d.get("units") or {}
    ranges = {p.unit: p.valid_range for p in spec.MEDA_PRODUCTS}
    errors, invalid, empty = [], 0, 0
    for f in d["files"]:
        series = json.loads((root / f["path"]).read_text("utf-8"))
        where = f"{label} {f['path']}"
        if units != {series.get("measure"): series.get("unit")} or series.get("unit") not in ranges:
            errors.append(f"{where}: unit differs from the dataset units")
            continue
        low, high = ranges[series["unit"]]
        hours = series.get("hours", [])
        if [h.get("hour") for h in hours] != list(meda.HOURS):
            errors.append(f"{where}: hours must be 0 to 23, in order")
        for h in hours:
            has_value = h.get("median") is not None
            if has_value != (h.get("samples", 0) > 0) or has_value != (h.get("firstLmst") is not None):
                errors.append(f"{where}: hour {h.get('hour')} has a value exactly when it has valid samples")
            elif has_value and not low <= h["median"] <= high:
                errors.append(f"{where}: hour {h['hour']} outside the physical range (invalid value leaked?)")
            invalid += h.get("invalid", 0)
            empty += 0 if has_value else 1
        location = series.get("location") or {}
        point = {k: location.get(k) for k in ("longitude", "latitude")}
        extent = d.get("extent") or {}
        if (extent.get("west"), extent.get("east")) != (point["longitude"],) * 2 or (
            extent.get("south"),
            extent.get("north"),
        ) != (point["latitude"],) * 2:
            errors.append(f"{where}: extent must be the measurement position")
        elif region and not geo.contains_point(region["extent"], point["longitude"], point["latitude"]):
            errors.append(f"{where}: rover position is outside the {region['id']} sector")
    no_data = d.get("noData") or {}
    if (invalid, empty) != (no_data.get("invalidSampleCount"), no_data.get("emptyHourCount")):
        errors.append(f"{label}: invalid samples or empty hours differ from noData")
    if (empty > 0) != (d.get("status") != "available"):
        errors.append(f"{label}: status must be 'partial' exactly when an hour has no value")
    return errors


def check_files(root: Path, d: dict) -> list[str]:
    label = f"dataset {d.get('id')}"
    files = d.get("files", [])
    if d.get("delivery") == "local" and not files:
        return [f"{label}: local dataset lists no file"]
    if d.get("delivery") == "remote" and files:
        return [f"{label}: remote dataset must not list frozen files"]
    errors = []
    for f in files:
        path = root / f["path"]
        if not path.is_file():
            errors.append(f"{label}: missing file {f['path']}")
            continue
        content = path.read_bytes()
        if len(content) != f["bytes"] or hashlib.sha256(content).hexdigest() != f["sha256"]:
            errors.append(f"{label}: {f['path']} does not match its recorded size or sha256")
    return errors


def grid_geometry(d: dict) -> tuple[tuple[float, float], float, tuple[int, int]]:
    """Origin, cell size and (rows, cols) declared by a gridded dataset."""
    raster = d["raster"]
    return (raster["origin"]["x"], raster["origin"]["y"]), raster["pixelSizeMetres"], (raster["height"], raster["width"])


def check_raster(d: dict) -> list[str]:
    """The declared transform must be complete and must reproduce the declared extent."""
    label = f"dataset {d.get('id')}"
    raster = d.get("raster") or {}
    projection = raster.get("projection") or {}
    origin = raster.get("origin") or {}
    numbers = (raster.get("width"), raster.get("height"), raster.get("pixelSizeMetres"), origin.get("x"), origin.get("y"))
    if not all(isinstance(v, (int, float)) and math.isfinite(v) and v > 0 for v in numbers):
        return [f"{label}: raster needs width, height, pixelSizeMetres and origin as positive numbers"]
    errors = []
    if (raster.get("dtype"), raster.get("byteOrder"), raster.get("rowOrder")) != ("float32", "little-endian", "north-to-south"):
        errors.append(f"{label}: raster must be little-endian float32, north to south")
    if projection != {
        "name": "equirectangular",
        "centralMeridian": 0.0,
        "standardParallel": 0.0,
        "radiusMetres": spec.MARS_RADIUS_M,
    }:
        errors.append(f"{label}: raster.projection must be the equirectangular Mars sphere of the sources")
    if raster.get("navigationGrade") is not False:
        errors.append(f"{label}: raster.navigationGrade must be false, a cell size is not a positioning accuracy")
    if d.get("resolution") != {"value": raster["pixelSizeMetres"], "unit": "m/pixel"}:
        errors.append(f"{label}: resolution differs from raster.pixelSizeMetres")
    aggregation = raster.get("aggregation")
    if "aggregation" not in raster or (
        aggregation is not None
        and aggregation.get("factor", 0) * aggregation.get("sourcePixelSizeMetres", 0) != raster["pixelSizeMetres"]
    ):
        errors.append(f"{label}: raster.aggregation must be null or explain the stored cell size")
    origin_xy, pixel_m, (rows, cols) = grid_geometry(d)
    expected = geo.window_extent(origin_xy, pixel_m, (0, rows, 0, cols), spec.MARS_RADIUS_M)
    if any(not math.isclose(expected[k], d["extent"].get(k, math.nan), abs_tol=1e-9) for k in expected):
        errors.append(f"{label}: extent does not match the raster origin, size and cell size")
    return errors


def read_grid(root: Path, d: dict) -> np.ndarray | None:
    """Values as (rows, cols), or None when the file does not hold exactly that grid."""
    raster = d["raster"]
    values = np.frombuffer((root / d["files"][0]["path"]).read_bytes(), dtype="<f4")
    if values.size != raster["width"] * raster["height"]:
        return None
    return values.reshape(raster["height"], raster["width"])


def check_grid(root: Path, d: dict, unit_key: str, unit: str, valid_range: tuple[float, float]) -> tuple[list[str], np.ndarray | None]:
    label = f"dataset {d.get('id')}"
    errors = check_raster(d)
    if errors:
        return errors, None
    if (d.get("units") or {}).get(unit_key) != unit:
        errors.append(f"{label}: units.{unit_key} must be '{unit}'")
    if d["noData"].get("kind") != "nan":
        errors.append(f"{label}: NoData must be encoded as NaN, never 0")
    values = read_grid(root, d)
    if values is None:
        return errors + [f"{label}: file size does not match raster width x height"], None
    nan_count = int(np.isnan(values).sum())
    if nan_count != d["noData"].get("cellCount"):
        errors.append(f"{label}: NaN count {nan_count} differs from noData.cellCount")
    if (nan_count > 0) != (d["status"] != "available"):
        errors.append(f"{label}: status must be 'partial' exactly when NoData cells exist")
    valid = values[~np.isnan(values)]
    if valid.size and (valid.min() < valid_range[0] or valid.max() > valid_range[1]):
        errors.append(f"{label}: {unit_key} outside the plausible range (NoData sentinel leaked?)")
    return errors, values


def check_elevation(root: Path, manifest: dict, d: dict) -> list[str]:
    label = f"dataset {d.get('id')}"
    errors, values = check_grid(root, d, "elevation", "metre", ELEVATION_RANGE_M)
    if not d.get("verticalDatum"):
        errors.append(f"{label}: verticalDatum must name the reference of the elevations")
    if values is None:
        return errors
    origin_xy, pixel_m, shape = grid_geometry(d)
    for site in manifest["sites"]:
        if site.get("regionId") != d["regionId"]:
            continue
        coordinate = site["coordinate"]
        cell = geo.cell_at(origin_xy, pixel_m, shape, coordinate["longitude"], coordinate["latitude"], spec.MARS_RADIUS_M)
        if cell is None or math.isnan(values[cell]):
            errors.append(f"{label}: site {site.get('id')} does not fall on a valid cell")
    return errors


def parent_grid(datasets: dict[str, dict], d: dict) -> tuple[dict | None, list[str]]:
    """The elevation dataset a derived product was computed from, on the very same grid."""
    label = f"dataset {d.get('id')}"
    parent = datasets.get(d.get("derivedFrom"))
    if parent is None or parent.get("kind") != "elevation" or not parent.get("raster"):
        return None, [f"{label}: derivedFrom must name an elevation dataset"]
    if parent["extent"] != d["extent"] or parent["regionId"] != d["regionId"]:
        return None, [f"{label}: extent differs from {parent['id']}, the grid it derives from"]
    return parent, []


def check_slope(root: Path, datasets: dict[str, dict], d: dict) -> list[str]:
    label = f"dataset {d.get('id')}"
    parent, errors = parent_grid(datasets, d)
    grid_errors, values = check_grid(root, d, "slope", "degree", SLOPE_RANGE_DEG)
    errors += grid_errors
    if parent is None or values is None:
        return errors
    if d["raster"] != parent["raster"]:
        return errors + [f"{label}: raster differs from {parent['id']}"]
    elevation = read_grid(root, parent)
    if elevation is not None and (np.isnan(elevation) & ~np.isnan(values)).any():
        errors.append(f"{label}: a slope exists where {parent['id']} has no elevation")
    return errors


def check_hillshade(root: Path, datasets: dict[str, dict], d: dict) -> list[str]:
    label = f"dataset {d.get('id')}"
    parent, errors = parent_grid(datasets, d)
    if parent is None:
        return errors
    with Image.open(root / d["files"][0]["path"]) as image:
        image.load()
        if image.size != (parent["raster"]["width"], parent["raster"]["height"]):
            errors.append(f"{label}: image size differs from the grid of {parent['id']}")
        transparent = transparent_pixels(image)
    if d["noData"].get("kind") != "alpha-channel" or transparent != d["noData"].get("transparentPixelCount"):
        errors.append(f"{label}: unknown relief must be transparent and counted in noData")
    if (transparent > 0) != (d["status"] != "available"):
        errors.append(f"{label}: status must be 'partial' exactly when transparent pixels exist")
    return errors


def check_imagery(root: Path, d: dict) -> list[str]:
    label = f"dataset {d.get('id')}"
    transparent, errors = 0, []
    for f in d["files"]:
        if not f["path"].endswith(".png") or not (root / f["path"]).is_file():
            continue
        with Image.open(root / f["path"]) as image:
            image.load()
            if image.size != (geo.TILE_SIZE, geo.TILE_SIZE):
                errors.append(f"{label}: {f['path']} is not {geo.TILE_SIZE}x{geo.TILE_SIZE}")
            count = transparent_pixels(image)
            if count == image.size[0] * image.size[1]:
                errors.append(f"{label}: {f['path']} is fully transparent (no coverage)")
            transparent += count
    if transparent != d["noData"].get("transparentPixelCount"):
        errors.append(f"{label}: transparent pixel count differs from noData.transparentPixelCount")
    if (transparent > 0) != (d["status"] != "available"):
        errors.append(f"{label}: status must be 'partial' exactly when transparent pixels exist")
    return errors


def check_thermal_footprint(datasets: dict[str, dict], d: dict) -> list[str]:
    """The night layer is drawn over HiRISE: its frozen tiles must cover every place the HiRISE product can show.

    The app draws `tileset.ranges` only, so coverage is judged on those tiles, not on the declared extent.
    """
    label = f"dataset {d.get('id')}"
    tileset = d.get("tileset") or {}
    ranges = tileset.get("ranges") or []
    if not ranges or not tileset.get("urlTemplate") or check_extent(d.get("extent"), ""):
        return [f"{label}: thermal dataset needs tileset ranges and a valid extent"]
    frozen = {f["path"] for f in d.get("files", [])}
    errors = []
    for r in ranges:
        for row in range(r["rowMin"], r["rowMax"] + 1):
            for col in range(r["colMin"], r["colMax"] + 1):
                path = tileset["urlTemplate"].replace("{z}", str(r["z"])).replace("{y}", str(row)).replace("{x}", str(col))
                if path not in frozen:
                    errors.append(f"{label}: tile {path} is in tileset.ranges but not frozen")
    finest = max(ranges, key=lambda r: r["z"])
    drawn = geo.union(geo.tile_extent(finest["z"], finest["colMin"], finest["rowMin"]),
                      geo.tile_extent(finest["z"], finest["colMax"], finest["rowMax"]))
    if not (geo.contains(drawn, d["extent"]) and geo.contains(d["extent"], drawn)):
        errors.append(f"{label}: extent differs from the tiles of tileset.ranges")
    products = [i["wmts"]["extent"] for i in datasets.values()
                if i.get("kind") == "imagery" and i.get("regionId") == d.get("regionId") and i.get("wmts")]
    if any(not geo.contains(drawn, product) for product in products):
        errors.append(f"{label}: thermal tiles do not cover the imagery product extent")
    return errors


def check_sites(root: Path, manifest: dict, d: dict) -> list[str]:
    label = f"dataset {d.get('id')}"
    region = next((r for r in manifest["regions"] if r["id"] == d["regionId"]), None)
    sites = [s for s in manifest["sites"] if s.get("datasetId") == d["id"]]
    path = root / d["files"][0]["path"]
    if not path.is_file():
        return []
    features = json.loads(path.read_text("utf-8")).get("features", [])
    errors = [] if len(features) == len(sites) else [f"{label}: {len(features)} features but {len(sites)} sites"]
    for site in sites:
        where = f"site {site.get('id')}"
        errors += [f"{where}: missing field {k}" for k in missing(site, ("id", "name", "regionId", "sol", "date"))]
        longitude = site.get("coordinate", {}).get("longitude")
        latitude = site.get("coordinate", {}).get("latitude")
        if not all(isinstance(v, float) and math.isfinite(v) for v in (longitude, latitude)):
            errors.append(f"{where}: coordinate must be finite numbers")
        elif not (-180 <= longitude <= 180 and -90 <= latitude <= 90):
            errors.append(f"{where}: coordinate out of range")
        elif region and not geo.contains_point(region["extent"], longitude, latitude):
            errors.append(f"{where}: coordinate is outside the {region['id']} sector")
        elevation = site.get("elevation")
        if elevation is not None and (not math.isfinite(elevation.get("value", math.nan)) or elevation.get("unit") != "metre"):
            errors.append(f"{where}: elevation needs a finite value in metres, or null when unknown")
        if not any(f["geometry"]["coordinates"][:2] == [longitude, latitude] for f in features):
            errors.append(f"{where}: coordinate differs from the frozen GeoJSON")
    return errors


def check_geology(root: Path, manifest: dict, d: dict) -> list[str]:
    """Interpretive units: credited, offset declared, polygons inside the extent, no unit forced onto a site."""
    label = f"dataset {d.get('id')}"
    info = d.get("geology")
    if not isinstance(info, dict):
        return [f"{label}: geology metadata is missing"]
    errors = [f"{label}: missing geology.{k}" for k in missing(info, ("authors", "published", "scale", "recordUrl"))]
    if info.get("interpretive") is not True:
        errors.append(f"{label}: a geologic map must be declared interpretive")
    offset = (info.get("registration") or {}).get("offsetMetres") or {}
    if not (isinstance(offset.get("max"), (int, float)) and offset["max"] > 0):
        errors.append(f"{label}: registration.offsetMetres.max must be a positive uncertainty")
        return errors
    legend = {u.get("symbol"): u for u in info.get("units", [])}
    for symbol, unit in legend.items():
        if missing(unit, ("symbol", "name", "period")) or not str(unit.get("colour", "")).startswith("#"):
            errors.append(f"{label}: unit {symbol} needs a name, a period and a colour")

    collection = json.loads((root / d["files"][0]["path"]).read_text("utf-8"))
    drawn = set()
    for feature in collection.get("features", []):
        symbol = (feature.get("properties") or {}).get("symbol")
        drawn.add(symbol)
        if symbol not in legend:
            errors.append(f"{label}: unit {symbol} is drawn but missing from the legend")
        geometry = feature.get("geometry") or {}
        points = [p for polygon in geometry.get("coordinates", []) for ring in polygon for p in ring]
        if geometry.get("type") != "MultiPolygon" or not points:
            errors.append(f"{label}: unit {symbol} must be a non-empty MultiPolygon")
        elif not all(len(p) == 2 and all(math.isfinite(v) for v in p) and geo.contains_point(d["extent"], *p) for p in points):
            errors.append(f"{label}: unit {symbol} has coordinates outside the dataset extent")
    errors += [f"{label}: legend unit {s} has a sector share but no polygon" for s, u in legend.items() if u.get("sectorShare") and s not in drawn]

    entries = {s.get("siteId"): s for s in info.get("sites", [])}
    for site in (s for s in manifest["sites"] if s.get("regionId") == d.get("regionId")):
        entry = entries.get(site["id"])
        if entry is None:
            errors.append(f"{label}: site {site['id']} has no geologic context")
            continue
        candidates = entry.get("candidates") or []
        if any(c.get("symbol") not in legend or not 0 <= c.get("distanceMetres", -1) <= offset["max"] for c in candidates):
            errors.append(f"{label}: site {site['id']} lists a candidate outside the legend or the uncertainty")
        assigned = entry.get("assignedSymbol")
        if assigned is not None and (len(candidates) != 1 or candidates[0].get("symbol") != assigned):
            errors.append(f"{label}: site {site['id']} is assigned {assigned} although other units are within the uncertainty")
    return errors


def check_mola_fallback(root: Path) -> list[str]:
    errors = []
    for name in spec.MOLA_FALLBACK_TILES:
        path = root / MOLA_FALLBACK_DIR / f"{name}.jpg"
        try:
            with Image.open(path) as image:
                bad = image.format != "JPEG" or image.size != (geo.TILE_SIZE, geo.TILE_SIZE)
        except OSError:
            bad = True
        if bad:
            errors.append(f"{MOLA_FALLBACK_DIR}/{name}.jpg: missing or not a {geo.TILE_SIZE}-pixel JPEG tile")
    return errors


def check_capabilities(manifest: dict, datasets: dict[str, dict]) -> list[str]:
    errors = []
    for region in manifest["regions"]:
        label = f"region {region.get('id')}"
        errors += [f"{label}: missing field {k}" for k in missing(region, ("id", "name", "kind"))]
        errors += check_extent(region.get("extent"), label)
        for cap in region.get("capabilities", []):
            where = f"{label} capability {cap.get('id')}"
            if cap.get("status") not in STATUSES:
                errors.append(f"{where}: invalid status")
            if cap.get("status") == "unavailable" and cap.get("datasetIds"):
                errors.append(f"{where}: an unavailable capability must not reference datasets")
            if cap.get("status") != "unavailable" and not cap.get("datasetIds"):
                errors.append(f"{where}: an available capability must reference datasets")
            if cap.get("status") == "unavailable" and not cap.get("reason"):
                errors.append(f"{where}: an unavailable capability needs a reason")
            if "reasonUrl" in cap and not str(cap["reasonUrl"]).startswith("https://"):
                errors.append(f"{where}: reasonUrl must be an https link")
            for dataset_id in cap.get("datasetIds", []):
                dataset = datasets.get(dataset_id)
                if dataset is None:
                    errors.append(f"{where}: unknown dataset {dataset_id}")
                elif dataset["regionId"] != region["id"]:
                    errors.append(f"{where}: dataset {dataset_id} belongs to region {dataset['regionId']}")
                elif cap["status"] == "available" and dataset["status"] != "available":
                    errors.append(f"{where}: marked available but {dataset_id} is {dataset['status']}")
    return errors


def validate(root: Path) -> list[str]:
    path = root / "manifest.json"
    if not path.is_file():
        return [f"{path} not found: run `pnpm data:prepare`"]
    manifest = json.loads(path.read_text("utf-8"))
    errors = [] if manifest.get("schemaVersion") == spec.SCHEMA_VERSION else ["unsupported schemaVersion"]
    planet = manifest.get("planet", {})
    if planet.get("radiusMeters") != spec.MARS_RADIUS_M or planet.get("coordinates") != "planetocentric":
        errors.append("planet: expected the Mars radius and planetocentric coordinates")

    errors += check_mola_fallback(root)
    datasets = {d.get("id"): d for d in manifest.get("datasets", [])}
    regions = {r.get("id"): r for r in manifest.get("regions", [])}
    for d in datasets.values():
        errors += check_dataset_fields(d)
        file_errors = check_files(root, d) if d.get("kind") in KINDS and d.get("delivery") in DELIVERIES else []
        errors += file_errors
        region = regions.get(d.get("regionId"))
        if region is None:
            errors.append(f"dataset {d.get('id')}: unknown region {d.get('regionId')}")
        elif d["status"] == "available" and d["kind"] not in {"sites", "rover-waypoints", "rover-traverse", "weather"} and not check_extent(d.get("extent"), ""):
            if not geo.contains(d["extent"], region["extent"]):
                errors.append(f"dataset {d['id']}: extent does not cover the {region['id']} region")
        if file_errors:
            continue  # content checks are meaningless on missing or altered files
        if d.get("kind") == "elevation":
            errors += check_elevation(root, manifest, d)
        elif d.get("kind") == "slope":
            errors += check_slope(root, datasets, d)
        elif d.get("kind") == "hillshade":
            errors += check_hillshade(root, datasets, d)
        elif d.get("kind") == "imagery":
            errors += check_imagery(root, d)
            if d.get("wmts") is not None:
                from .wmts import imagery_wmts
                try:
                    expected = imagery_wmts((root / "jezero/hirise/WMTSCapabilities.xml").read_bytes())
                    if d["wmts"] != expected:
                        errors.append("imagery: WMTS metadata differs from frozen capabilities")
                except (OSError, ValueError, AttributeError, TypeError) as error:
                    errors.append(f"imagery: invalid WMTS metadata: {error}")
        elif d.get("kind") in {"rover-waypoints", "rover-traverse"}:
            from .rover import validate_feature
            try:
                collection = json.loads((root / d["files"][0]["path"]).read_text())
                for feature in collection["features"]:
                    validate_feature(feature, "Point" if d["kind"] == "rover-waypoints" else "LineString")
            except (ValueError, KeyError, TypeError) as error:
                errors.append(f"rover: {error}")
        elif d.get("kind") == "thermal":
            errors += check_imagery(root, d) + check_thermal_footprint(datasets, d)
        elif d.get("kind") == "sites":
            errors += check_sites(root, manifest, d)
        elif d.get("kind") == "weather":
            errors += check_weather(root, region, d)
        elif d.get("kind") == "geology":
            errors += check_geology(root, manifest, d)
    return errors + check_capabilities(manifest, datasets)


def main() -> None:
    errors = validate(spec.DATA_DIR)
    if errors:
        print("\n".join(errors), file=sys.stderr)
        raise SystemExit(1)
    print(f"OK: {spec.DATA_DIR} is consistent.")


if __name__ == "__main__":
    main()
