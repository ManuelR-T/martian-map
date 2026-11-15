"""Hourly values of one MEDA sensor over one sol, and where the rover stood that sol.

A single column is read: sensors are never averaged together. A missing or invalid
sample is counted and left out, never replaced; an hour without valid sample has no value.
"""

import csv
import io
import math
import re
import statistics
import xml.etree.ElementTree as ET  # fixed NASA PDS labels; expat never fetches external entities

# readme.txt of the MEDA bundle: value written when a derived quantity could not be calculated.
INVALID_SENTINEL = 9_999_999_999.0
HOURS = range(24)
# Local Mean Solar Time as written by MEDA, for example 00500M14:00:03.640 (sol 500, 14:00:03).
LMST = re.compile(r"^(\d{5})M(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?$")
PDS = {"pds": "http://pds.nasa.gov/pds4/pds/v1", "m20": "http://pds.nasa.gov/pds4/mission/mars2020/v1"}


def parse_lmst(text: str) -> tuple[int, int, str]:
    """Sol, hour and hh:mm:ss of an LMST timestamp."""
    match = LMST.match(text.strip())
    if not match or int(match[2]) not in HOURS:
        raise ValueError(f"unexpected LMST timestamp {text!r}")
    return int(match[1]), int(match[2]), f"{match[2]}:{match[3]}:{match[4]}"


def parse_value(text: str, valid_range: tuple[float, float]) -> float | None:
    """The value, or None when it is empty, not a number, the invalid sentinel or physically impossible."""
    try:
        value = float(text)
    except ValueError:
        return None
    low, high = valid_range
    if not math.isfinite(value) or value == INVALID_SENTINEL or not low <= value <= high:
        return None
    return value


def hourly_values(csv_text: str, column: str, sol: int, valid_range: tuple[float, float]) -> list[dict]:
    """Median of the valid samples of each LMST hour, with the count and time span of what was measured."""
    reader = csv.DictReader(io.StringIO(csv_text))
    if column not in (reader.fieldnames or []) or "LMST" not in (reader.fieldnames or []):
        raise ValueError(f"column {column} or LMST missing from the CSV header")
    values: dict[int, list[float]] = {h: [] for h in HOURS}
    clocks: dict[int, list[str]] = {h: [] for h in HOURS}
    invalid = dict.fromkeys(HOURS, 0)
    for row in reader:
        row_sol, hour, clock = parse_lmst(row["LMST"])
        if row_sol != sol:
            raise ValueError(f"row of sol {row_sol} in the file of sol {sol}")
        value = parse_value(row[column] or "", valid_range)
        if value is None:
            invalid[hour] += 1
        else:
            values[hour].append(value)
            clocks[hour].append(clock)
    return [
        {
            "hour": h,
            "median": round(statistics.median(values[h]), 2) if values[h] else None,
            "samples": len(values[h]),
            "invalid": invalid[h],
            "firstLmst": min(clocks[h]) if clocks[h] else None,
            "lastLmst": max(clocks[h]) if clocks[h] else None,
        }
        for h in HOURS
    ]


def read_label(xml_bytes: bytes, column: str) -> dict:
    """Checksum, sol, UTC span and unit of `column` declared by the PDS4 label of a MEDA CSV."""
    root = ET.fromstring(xml_bytes)
    fields = {
        field.findtext("pds:name", namespaces=PDS): field.findtext("pds:unit", namespaces=PDS)
        for field in root.iterfind(".//pds:Field_Delimited", PDS)
    }
    if column not in fields:
        raise ValueError(f"column {column} is not described by the label")
    start_sol = root.findtext(".//m20:start_sol_number", namespaces=PDS)
    stop_sol = root.findtext(".//m20:stop_sol_number", namespaces=PDS)
    if start_sol is None or start_sol != stop_sol:
        raise ValueError(f"label spans sols {start_sol} to {stop_sol}; one sol per file is expected")
    return {
        "md5": root.findtext(".//pds:File/pds:md5_checksum", namespaces=PDS),
        "sol": int(start_sol),
        "startUtc": root.findtext(".//pds:start_date_time", namespaces=PDS),
        "stopUtc": root.findtext(".//pds:stop_date_time", namespaces=PDS),
        "unit": fields[column],
    }


def rover_position(waypoints: dict, sol: int) -> dict:
    """Last end-of-drive position before `sol`. A sol with its own drive has no single position."""
    stops = sorted(
        (f["properties"] for f in waypoints["features"] if isinstance(f["properties"].get("sol"), int)),
        key=lambda p: p["sol"],
    )
    if any(p["sol"] == sol for p in stops):
        raise ValueError(f"the rover drove on sol {sol}: its measurements come from several places")
    before = [p for p in stops if p["sol"] < sol]
    if not before:
        raise ValueError(f"no rover position known before sol {sol}")
    after = [p for p in stops if p["sol"] > sol]
    last = before[-1]
    return {
        "longitude": last["lon"],
        "latitude": last["lat"],
        "waypoint": last["RMC"],
        "sinceSol": last["sol"],
        "untilSol": after[0]["sol"] if after else None,
    }


def distance_m(a: dict, b: dict, radius_m: float) -> float:
    """Great-circle distance between two planetocentric positions (haversine)."""
    lat1, lat2 = math.radians(a["latitude"]), math.radians(b["latitude"])
    dlat = lat2 - lat1
    dlon = math.radians(b["longitude"] - a["longitude"])
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 2 * radius_m * math.asin(math.sqrt(h))


def nearest_site(position: dict, sites: list[dict], radius_m: float) -> dict:
    site = min(sites, key=lambda s: distance_m(position, s["coordinate"], radius_m))
    return {"id": site["id"], "name": site["name"], "distanceMetres": round(distance_m(position, site["coordinate"], radius_m))}
