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

from . import geo, spec

STATUSES = {"available", "partial", "unavailable"}
KINDS = {"basemap", "imagery", "elevation", "slope", "hillshade", "sites"}
DELIVERIES = {"local", "remote"}
NODATA_KINDS = {"not-applicable", "alpha-channel", "nan"}
# Mars spans about -8.2 km (Hellas) to +21.2 km (Olympus Mons) around the MOLA datum.
ELEVATION_RANGE_M = (-9000.0, 22000.0)
SLOPE_RANGE_DEG = (0.0, 90.0)
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
    return errors + check_extent(d.get("extent"), label)


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

    datasets = {d.get("id"): d for d in manifest.get("datasets", [])}
    regions = {r.get("id"): r for r in manifest.get("regions", [])}
    for d in datasets.values():
        errors += check_dataset_fields(d)
        file_errors = check_files(root, d) if d.get("kind") in KINDS and d.get("delivery") in DELIVERIES else []
        errors += file_errors
        region = regions.get(d.get("regionId"))
        if region is None:
            errors.append(f"dataset {d.get('id')}: unknown region {d.get('regionId')}")
        elif not check_extent(d.get("extent"), "") and d["status"] == "available" and d["kind"] != "sites":
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
        elif d.get("kind") == "sites":
            errors += check_sites(root, manifest, d)
    return errors + check_capabilities(manifest, datasets)


def main() -> None:
    errors = validate(spec.DATA_DIR)
    if errors:
        print("\n".join(errors), file=sys.stderr)
        raise SystemExit(1)
    print(f"OK: {spec.DATA_DIR} is consistent.")


if __name__ == "__main__":
    main()
