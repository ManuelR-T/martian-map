import json
import shutil

import numpy as np
import pytest
from PIL import Image

from marps_data import check, prepare, spec


def test_nodata_becomes_nan_and_a_real_zero_stays_zero():
    sentinel = -3.4028226550889045e38
    source = np.array([[0.0, -2500.0], [sentinel, np.inf]], dtype=np.float32)
    clipped = prepare.clip_elevation(source, sentinel)
    assert clipped[0, 0] == 0.0
    assert clipped[0, 1] == -2500.0
    assert np.isnan(clipped[1]).all()
    assert clipped.dtype == np.dtype("<f4")


def test_transparent_pixels_are_counted_apart_from_black():
    image = Image.new("RGBA", (2, 2), (0, 0, 0, 255))
    image.putpixel((0, 0), (0, 0, 0, 0))
    assert check.transparent_pixels(image) == 1


def test_frozen_data_is_consistent():
    assert check.validate(spec.DATA_DIR) == []


@pytest.fixture
def data_copy(tmp_path):
    shutil.copytree(spec.DATA_DIR, tmp_path / "data")
    return tmp_path / "data"


def edit_manifest(root, change):
    path = root / "manifest.json"
    manifest = json.loads(path.read_text("utf-8"))
    change(manifest)
    path.write_text(json.dumps(manifest), "utf-8")


def test_altered_file_is_rejected_by_hash(data_copy):
    with (data_copy / "jezero/sites/sites.geojson").open("a") as f:
        f.write(" ")
    assert any("sha256" in e for e in check.validate(data_copy))


def test_missing_required_field_is_reported(data_copy):
    edit_manifest(data_copy, lambda m: m["datasets"][2].pop("crs"))
    assert "dataset jezero-ctx-dem: missing field crs" in check.validate(data_copy)


def test_site_outside_the_sector_is_rejected(data_copy):
    edit_manifest(data_copy, lambda m: m["sites"][0]["coordinate"].update(longitude=10.0))
    assert any("outside the jezero sector" in e for e in check.validate(data_copy))


def test_unavailable_capability_needs_a_reason_and_no_dataset(data_copy):
    def change(m):
        cap = m["regions"][1]["capabilities"][3]
        cap["reason"] = ""
        cap["datasetIds"] = ["mola-colorized-relief"]

    edit_manifest(data_copy, change)
    errors = check.validate(data_copy)
    assert any("needs a reason" in e for e in errors)
    assert any("must not reference datasets" in e for e in errors)


def test_basemap_cannot_back_a_detailed_capability(data_copy):
    def change(m):
        m["regions"][1]["capabilities"][1]["datasetIds"] = ["mola-colorized-relief"]

    edit_manifest(data_copy, change)
    assert any("belongs to region global" in e for e in check.validate(data_copy))


def test_nodata_cells_force_a_partial_status(data_copy):
    path = data_copy / "jezero/dem/ctx-20m.f32"
    values = np.frombuffer(path.read_bytes(), dtype="<f4").copy()
    values[0] = np.nan
    path.write_bytes(values.tobytes())

    def change(m):
        dem = m["datasets"][2]
        dem["files"][0]["bytes"] = path.stat().st_size
        dem["files"][0]["sha256"] = prepare.sha256(path.read_bytes())

    edit_manifest(data_copy, change)
    errors = check.validate(data_copy)
    assert any("NaN count" in e for e in errors)
    assert any("status must be 'partial'" in e for e in errors)
