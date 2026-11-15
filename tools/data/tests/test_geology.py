import io
import os
import zipfile

import numpy as np
import pytest
import shapely

from marps_data import geology


def test_projection_round_trips_and_matches_the_central_meridian():
    assert geology.to_mtm(77.5, 0.0) == pytest.approx((0.0, 0.0))
    x, y = geology.to_mtm(77.40617493, 18.45893136)  # Skinner Ridge
    # Reference values computed with PROJ from the archive's MTM_clon77_5E.prj.
    assert (x, y) == pytest.approx((-5275.3225, 1094148.9406), abs=1e-3)
    assert geology.from_mtm(np.array([[x, y]]))[0] == pytest.approx([77.40617493, 18.45893136], abs=1e-10)


def test_period_comes_from_the_symbol_prefix():
    assert geology.period("NHjf2") == "Noachien–Hespérien"
    assert geology.period("Aeb") == "Amazonien"
    with pytest.raises(ValueError):
        geology.period("cr")


def site(longitude, latitude):
    return {"id": "s", "coordinate": {"longitude": longitude, "latitude": latitude}}


def square(x, y, half=50.0):
    return shapely.box(x - half, y - half, x + half, y + half)


def test_a_site_is_assigned_only_when_a_single_unit_is_within_the_offset():
    x, y = geology.to_mtm(77.4, 18.45)
    alone = geology.site_candidates([("A", square(x, y)), ("B", square(x + 500, y))], [site(77.4, 18.45)], 200.0)
    assert alone[0]["assignedSymbol"] == "A"
    near = geology.site_candidates([("A", square(x, y)), ("B", square(x + 200, y))], [site(77.4, 18.45)], 200.0)
    assert near[0]["assignedSymbol"] is None
    assert [c["symbol"] for c in near[0]["candidates"]] == ["A", "B"]
    assert near[0]["candidates"][1]["distanceMetres"] == pytest.approx(150.0, abs=0.5)


def test_units_are_clipped_to_the_extent_and_merged_per_symbol():
    x, y = geology.to_mtm(77.4, 18.45)
    units = [("A", square(x, y, 5000)), ("A", square(x + 20000, y)), ("B", square(x + 30000, y))]
    extent = {"west": 77.39, "south": 18.44, "east": 77.41, "north": 18.46}
    clipped = geology.clip_units(units, extent)
    assert list(clipped) == ["A"]
    assert clipped["A"].bounds == pytest.approx((77.39, 18.44, 77.41, 18.46))


def test_only_the_geodatabase_bytes_are_needed_to_extract_it(tmp_path):
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("x/raster.tif", os.urandom(5000))
        archive.writestr("x/db.gdb/a.gdbtable", b"table")
        archive.writestr("x/db.gdb/old.lock", b"")
        archive.writestr("x/db.gdb/b.spx", b"index")
        archive.writestr("x/other.tif", os.urandom(5000))
    data = buffer.getvalue()
    tail_start = len(data) - 600
    central = zipfile.ZipFile(geology.SparseFile(len(data), {tail_start: data[tail_start:]}))
    start, end = geology.entry_span(central, "x/db.gdb/")
    sparse = geology.SparseFile(len(data), {tail_start: data[tail_start:], start: data[start:end]})
    folder = geology.extract(zipfile.ZipFile(sparse), "x/db.gdb/", tmp_path / "db.gdb")
    assert sorted(p.name for p in folder.iterdir()) == ["a.gdbtable", "b.spx"]
    assert (folder / "a.gdbtable").read_bytes() == b"table"
    with pytest.raises(OSError, match="not downloaded"):
        zipfile.ZipFile(sparse).read("x/raster.tif")
