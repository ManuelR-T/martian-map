"""Geologic units of USGS SIM 3464 (Sun and Stack, 2020) around the sector.

The map ships as a 349 MB zip holding an Esri file geodatabase in Mars Transverse Mercator
metres (sphere of 3 396 190 m, central meridian 77.5° E). Only the geodatabase entries are
read, with HTTP range requests; the units are clipped to the sector and converted to lon/lat.
"""

import io
import math
import zipfile
from pathlib import Path

import numpy as np
import shapely

from .geo import Extent

# Parameters of the CoordinateSystems/MTM_clon77_5E.prj file of the archive.
MTM_RADIUS_M = 3_396_190.0
MTM_CENTRAL_MERIDIAN = 77.5

# First letters of a unit symbol (pamphlet, "Map units"): N Noachian, H Hesperian, A Amazonian.
PERIODS = {"N": "Noachien", "H": "Hespérien", "A": "Amazonien"}


def to_mtm(longitude: float, latitude: float) -> tuple[float, float]:
    """Spherical transverse Mercator, scale 1, no false easting or northing."""
    lam = math.radians(longitude - MTM_CENTRAL_MERIDIAN)
    phi = math.radians(latitude)
    return (
        MTM_RADIUS_M * math.atanh(math.cos(phi) * math.sin(lam)),
        MTM_RADIUS_M * math.atan2(math.tan(phi), math.cos(lam)),
    )


def from_mtm(xy: np.ndarray) -> np.ndarray:
    """Inverse of `to_mtm` on an (n, 2) array of metres; returns longitude, latitude in degrees."""
    x = xy[:, 0] / MTM_RADIUS_M
    y = xy[:, 1] / MTM_RADIUS_M
    latitude = np.degrees(np.arcsin(np.sin(y) / np.cosh(x)))
    longitude = MTM_CENTRAL_MERIDIAN + np.degrees(np.arctan2(np.sinh(x), np.cos(y)))
    return np.column_stack([longitude, latitude])


def mtm_bounds(extent: Extent, margin_m: float) -> tuple[float, float, float, float]:
    """MTM box holding the lon/lat extent, widened by `margin_m` on each side."""
    corners = [to_mtm(lon, lat) for lon in (extent["west"], extent["east"]) for lat in (extent["south"], extent["north"])]
    xs, ys = [c[0] for c in corners], [c[1] for c in corners]
    return (min(xs) - margin_m, min(ys) - margin_m, max(xs) + margin_m, max(ys) + margin_m)


def period(symbol: str) -> str:
    """"NHjf2" gives "Noachien–Hespérien"; unknown prefixes raise, so a new unit is reviewed."""
    letters = []
    for char in symbol:
        if char not in PERIODS:
            break
        letters.append(PERIODS[char])
    if not letters:
        raise ValueError(f"unit {symbol}: no chronologic period prefix")
    return "–".join(letters)


class SparseFile(io.RawIOBase):
    """Seekable view of a remote file of which only some byte ranges were downloaded."""

    def __init__(self, size: int, segments: dict[int, bytes]):
        self.size = size
        self.segments = segments
        self.position = 0

    def readable(self) -> bool:
        return True

    def seekable(self) -> bool:
        return True

    def tell(self) -> int:
        return self.position

    def seek(self, offset: int, whence: int = io.SEEK_SET) -> int:
        self.position = {io.SEEK_SET: offset, io.SEEK_CUR: self.position + offset, io.SEEK_END: self.size + offset}[whence]
        return self.position

    def readinto(self, buffer) -> int:
        if self.position >= self.size:
            return 0
        for start, data in self.segments.items():
            if start <= self.position < start + len(data):
                chunk = data[self.position - start : self.position - start + len(buffer)]
                buffer[: len(chunk)] = chunk
                self.position += len(chunk)
                return len(chunk)
        raise OSError(f"byte {self.position} was not downloaded")


def wanted(name: str, folder: str) -> bool:
    # ArcGIS lock files are leftovers of the authors' session, not data.
    return name.startswith(folder) and not name.endswith("/") and not name.endswith(".lock")


def entry_span(central: zipfile.ZipFile, folder: str) -> tuple[int, int]:
    """Bytes holding every entry of `folder`: from its first local header to the next entry's header."""
    entries = sorted(central.infolist(), key=lambda i: i.header_offset)
    inside = [i for i, info in enumerate(entries) if wanted(info.filename, folder)]
    if not inside:
        raise RuntimeError(f"{folder} not found in the archive")
    first, last = inside[0], inside[-1]
    if any(not e.filename.startswith(folder) for e in entries[first : last + 1]):
        raise RuntimeError(f"{folder} entries are not contiguous in the archive")
    end = entries[last + 1].header_offset if last + 1 < len(entries) else central.start_dir
    return entries[first].header_offset, end


def extract(archive: zipfile.ZipFile, folder: str, destination: Path) -> Path:
    """Write the entries of `folder` (CRC checked by zipfile) and return the extracted folder."""
    for info in archive.infolist():
        if wanted(info.filename, folder):
            target = destination / info.filename[len(folder) :]
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(archive.read(info))
    return destination


def site_candidates(units: list[tuple[str, shapely.Geometry]], sites: list[dict], offset_m: float) -> list[dict]:
    """Every unit within `offset_m` of each site, in MTM metres (scale within 0.01 % here).

    A unit is assigned only when it is the single candidate: the map can be shifted by up to
    `offset_m`, so any other unit that close could be the one under the site.
    """
    result = []
    for site in sites:
        point = shapely.Point(to_mtm(site["coordinate"]["longitude"], site["coordinate"]["latitude"]))
        distances: dict[str, float] = {}
        for symbol, geometry in units:
            distance = float(shapely.distance(geometry, point))
            if distance <= offset_m:
                distances[symbol] = min(distance, distances.get(symbol, math.inf))
        candidates = [
            {"symbol": symbol, "distanceMetres": round(distance, 1)}
            for symbol, distance in sorted(distances.items(), key=lambda item: (item[1], item[0]))
        ]
        result.append({
            "siteId": site["id"],
            "candidates": candidates,
            "assignedSymbol": candidates[0]["symbol"] if len(candidates) == 1 else None,
        })
    return result


def clip_units(units: list[tuple[str, shapely.Geometry]], extent: Extent) -> dict[str, shapely.Geometry]:
    """One lon/lat (multi)polygon per unit symbol, cut to the extent; units absent from it are dropped."""
    box = shapely.box(extent["west"], extent["south"], extent["east"], extent["north"])
    merged: dict[str, list[shapely.Geometry]] = {}
    for symbol, geometry in units:
        clipped = shapely.intersection(shapely.transform(geometry, from_mtm), box)
        polygons = [g for g in shapely.get_parts(clipped) if isinstance(g, shapely.Polygon) and not g.is_empty]
        if polygons:
            merged.setdefault(symbol, []).extend(polygons)
    # 1e-7° is about 6 mm: far below the 1:75,000 map scale, and it keeps the GeoJSON small.
    return {symbol: shapely.set_precision(shapely.union_all(parts), 1e-7) for symbol, parts in sorted(merged.items())}


def polygon_rings(geometry: shapely.Geometry) -> list[list[list[list[float]]]]:
    """MultiPolygon coordinates, exterior rings first, as GeoJSON lists."""
    polygons = [g for g in shapely.get_parts(geometry) if isinstance(g, shapely.Polygon) and not g.is_empty]
    return [
        [[list(point) for point in ring.coords] for ring in (polygon.exterior, *polygon.interiors)]
        for polygon in polygons
    ]
