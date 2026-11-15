import json
import shutil

import numpy as np
import pytest
from PIL import Image

from marps_data import check, geo, prepare, spec


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


def dataset(manifest, dataset_id):
    return next(d for d in manifest["datasets"] if d["id"] == dataset_id)


def capability(manifest, capability_id):
    return next(c for c in manifest["regions"][1]["capabilities"] if c["id"] == capability_id)


def rewrite_grid(root, dataset_id, change):
    """Edit the values of a frozen grid and keep its recorded size and hash in step."""
    manifest = json.loads((root / "manifest.json").read_text("utf-8"))
    path = root / dataset(manifest, dataset_id)["files"][0]["path"]
    values = np.frombuffer(path.read_bytes(), dtype="<f4").copy()
    change(values)
    path.write_bytes(values.tobytes())
    edit_manifest(root, lambda m: dataset(m, dataset_id)["files"][0].update(sha256=prepare.sha256(path.read_bytes())))


def test_altered_file_is_rejected_by_hash(data_copy):
    with (data_copy / "jezero/sites/sites.geojson").open("a") as f:
        f.write(" ")
    assert any("sha256" in e for e in check.validate(data_copy))


def test_missing_required_field_is_reported(data_copy):
    edit_manifest(data_copy, lambda m: dataset(m, "jezero-ctx-dem").pop("crs"))
    assert "dataset jezero-ctx-dem: missing field crs" in check.validate(data_copy)


def test_site_outside_the_sector_is_rejected(data_copy):
    edit_manifest(data_copy, lambda m: m["sites"][0]["coordinate"].update(longitude=10.0))
    assert any("outside the jezero sector" in e for e in check.validate(data_copy))


def test_unavailable_capability_needs_a_reason_and_no_dataset(data_copy):
    def change(m):
        cap = capability(m, "thermal-themis")
        cap["reason"] = ""
        cap["datasetIds"] = ["mola-colorized-relief"]

    edit_manifest(data_copy, change)
    errors = check.validate(data_copy)
    assert any("needs a reason" in e for e in errors)
    assert any("must not reference datasets" in e for e in errors)


def test_basemap_cannot_back_a_detailed_capability(data_copy):
    def change(m):
        capability(m, "terrain-dem")["datasetIds"] = ["mola-colorized-relief"]

    edit_manifest(data_copy, change)
    assert any("belongs to region global" in e for e in check.validate(data_copy))


def test_nodata_cells_force_a_partial_status(data_copy):
    rewrite_grid(data_copy, "jezero-ctx-dem", lambda values: values.__setitem__(0, np.nan))
    errors = check.validate(data_copy)
    assert any("NaN count" in e for e in errors)
    assert any("status must be 'partial'" in e for e in errors)


@pytest.mark.parametrize("dataset_id", ["jezero-hirise-dem", "jezero-ctx-dem"])
def test_every_site_falls_on_a_valid_cell_of_each_elevation_grid(data_copy, dataset_id):
    manifest = json.loads((data_copy / "manifest.json").read_text("utf-8"))
    origin, pixel_m, shape = check.grid_geometry(dataset(manifest, dataset_id))
    site = manifest["sites"][0]["coordinate"]
    row, col = geo.cell_at(origin, pixel_m, shape, site["longitude"], site["latitude"], spec.MARS_RADIUS_M)

    rewrite_grid(data_copy, dataset_id, lambda values: values.__setitem__(row * shape[1] + col, np.nan))
    assert f"dataset {dataset_id}: site skinner-ridge does not fall on a valid cell" in check.validate(data_copy)


def test_shifted_grid_origin_no_longer_matches_the_extent(data_copy):
    edit_manifest(data_copy, lambda m: dataset(m, "jezero-hirise-dem")["raster"]["origin"].update(x=4587566.0))
    assert any("extent does not match the raster origin" in e for e in check.validate(data_copy))


def test_a_grid_cannot_be_declared_navigation_grade(data_copy):
    edit_manifest(data_copy, lambda m: dataset(m, "jezero-hirise-slope")["raster"].update(navigationGrade=True))
    assert any("navigationGrade must be false" in e for e in check.validate(data_copy))


def test_elevation_needs_a_vertical_datum(data_copy):
    edit_manifest(data_copy, lambda m: dataset(m, "jezero-ctx-dem").pop("verticalDatum"))
    assert any("verticalDatum" in e for e in check.validate(data_copy))


def test_slope_must_derive_from_an_elevation_grid_and_stay_in_range(data_copy):
    edit_manifest(data_copy, lambda m: dataset(m, "jezero-ctx-slope").update(derivedFrom="jezero-hirise-mosaic"))
    rewrite_grid(data_copy, "jezero-hirise-slope", lambda values: values.__setitem__(0, 120.0))
    errors = check.validate(data_copy)
    assert "dataset jezero-ctx-slope: derivedFrom must name an elevation dataset" in errors
    assert any("jezero-hirise-slope: slope outside the plausible range" in e for e in errors)


def test_slope_cannot_exist_where_elevation_is_missing(data_copy):
    def change(m):
        dem = dataset(m, "jezero-ctx-dem")
        dem["noData"]["cellCount"], dem["status"] = 1, "partial"
        capability(m, "terrain-dem")["status"] = "partial"

    rewrite_grid(data_copy, "jezero-ctx-dem", lambda values: values.__setitem__(0, np.nan))
    edit_manifest(data_copy, change)
    assert any("a slope exists where jezero-ctx-dem has no elevation" in e for e in check.validate(data_copy))


def test_hillshade_must_match_its_grid(data_copy):
    edit_manifest(data_copy, lambda m: dataset(m, "jezero-ctx-hillshade").update(derivedFrom="jezero-hirise-dem"))
    assert any("jezero-ctx-hillshade: extent differs from jezero-hirise-dem" in e for e in check.validate(data_copy))
