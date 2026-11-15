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
        cap = capability(m, "weather-wind")
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


def test_night_infrared_extent_must_match_its_tiles(data_copy):
    # Extent shrunk to tile 9/203/732 while four tiles stay declared: the extent no longer describes what is drawn.
    edit_manifest(data_copy, lambda m: dataset(m, "jezero-themis-night-ir")["extent"].update(west=77.34375, east=77.6953125, south=18.28125, north=18.6328125))
    assert "dataset jezero-themis-night-ir: extent differs from the tiles of tileset.ranges" in check.validate(data_copy)


def test_night_infrared_tiles_must_cover_everything_hirise_can_show(data_copy):
    # Keep only column 731 (76.99–77.34° E): HiRISE reaches 77.58° E, so its east would show no night layer.
    def change(m):
        themis = dataset(m, "jezero-themis-night-ir")
        themis["tileset"]["ranges"][0]["colMax"] = 731
        themis["files"] = [f for f in themis["files"] if not f["path"].endswith("/732.png")]

    edit_manifest(data_copy, change)
    assert "dataset jezero-themis-night-ir: thermal tiles do not cover the imagery product extent" in check.validate(data_copy)


def test_every_night_infrared_tile_drawn_must_be_frozen(data_copy):
    edit_manifest(data_copy, lambda m: dataset(m, "jezero-themis-night-ir")["files"].pop())
    assert any("is in tileset.ranges but not frozen" in e for e in check.validate(data_copy))


def test_a_night_infrared_tile_without_coverage_is_rejected(data_copy):
    tile = data_copy / "jezero/themis/9/203/732.png"
    Image.new("LA", (geo.TILE_SIZE, geo.TILE_SIZE), (0, 0)).save(tile)
    content = tile.read_bytes()
    edit_manifest(data_copy, lambda m: next(f for f in dataset(m, "jezero-themis-night-ir")["files"] if f["path"].endswith("9/203/732.png")).update(bytes=len(content), sha256=prepare.sha256(content)))
    errors = check.validate(data_copy)
    assert "dataset jezero-themis-night-ir: jezero/themis/9/203/732.png is fully transparent (no coverage)" in errors
    assert "dataset jezero-themis-night-ir: status must be 'partial' exactly when transparent pixels exist" in errors

def rewrite_series(root, dataset_id, change):
    """Edit a frozen MEDA series and keep its recorded size and hash in step."""
    manifest = json.loads((root / "manifest.json").read_text("utf-8"))
    path = root / dataset(manifest, dataset_id)["files"][0]["path"]
    series = json.loads(path.read_text("utf-8"))
    change(series)
    path.write_text(json.dumps(series), "utf-8")
    data = path.read_bytes()
    edit_manifest(root, lambda m: dataset(m, dataset_id)["files"][0].update(sha256=prepare.sha256(data), bytes=len(data)))


def test_weather_capability_is_backed_by_temperature_and_pressure():
    manifest = json.loads((spec.DATA_DIR / "manifest.json").read_text("utf-8"))
    weather = capability(manifest, "weather-meda")
    assert (weather["status"], weather["datasetIds"]) == ("available", ["jezero-meda-temperature", "jezero-meda-pressure"])


def test_invalid_sentinel_leaked_into_an_hour_is_rejected(data_copy):
    rewrite_series(data_copy, "jezero-meda-pressure", lambda s: s["hours"][3].update(median=9999999999.0))
    assert any("physical range" in e for e in check.validate(data_copy))


def test_an_hour_cannot_have_a_value_without_valid_samples(data_copy):
    rewrite_series(data_copy, "jezero-meda-temperature", lambda s: s["hours"][5].update(samples=0))
    assert any("exactly when it has valid samples" in e for e in check.validate(data_copy))


def test_an_empty_hour_forces_a_partial_status(data_copy):
    def empty_hour(series):
        series["hours"][17].update(median=None, samples=0, firstLmst=None, lastLmst=None)

    rewrite_series(data_copy, "jezero-meda-temperature", empty_hour)
    edit_manifest(data_copy, lambda m: dataset(m, "jezero-meda-temperature")["noData"].update(emptyHourCount=1))
    assert any("'partial' exactly when an hour has no value" in e for e in check.validate(data_copy))


def test_rover_position_outside_the_sector_is_rejected(data_copy):
    rewrite_series(data_copy, "jezero-meda-pressure", lambda s: s["location"].update(longitude=77.5))
    edit_manifest(data_copy, lambda m: dataset(m, "jezero-meda-pressure")["extent"].update(west=77.5, east=77.5))
    assert any("outside the jezero sector" in e for e in check.validate(data_copy))


def test_wind_is_declared_unpublished_with_its_source():
    manifest = json.loads((spec.DATA_DIR / "manifest.json").read_text("utf-8"))
    wind = capability(manifest, "weather-wind")
    assert (wind["status"], wind["datasetIds"], wind["reasonUrl"]) == ("unavailable", [], spec.MEDA_RELEASE_NOTES_URL)
    assert "sol 315" in wind["reason"]


@pytest.mark.parametrize("level", ["CAL", "DER"])
def test_preparation_stops_when_a_prepared_sol_gets_a_wind_file(level):
    collection = {"CAL": "data_calibrated_env", "DER": "data_derived_env"}[level]
    without_wind = b'<table><a href="WE__0500___________CAL_ATS_________________P01.CSV">x</a></table>'
    with_wind = f'<table><a href="WE__0500___________{level}_WS__________________P01.CSV">x</a></table>'.encode()
    fetcher = lambda url: with_wind if f"/{collection}/" in url else without_wind  # noqa: E731
    with pytest.raises(RuntimeError, match="sol 500 now has wind files"):
        prepare.assert_no_wind(500, fetcher)


def test_a_capability_reason_link_must_be_https(data_copy):
    # The panel turns it into a link: a javascript: URL would run on click.
    def poison(manifest):
        capability(manifest, "weather-wind")["reasonUrl"] = "javascript:alert(1)"

    edit_manifest(data_copy, poison)
    assert any("reasonUrl must be an https link" in e for e in check.validate(data_copy))


def test_frozen_capabilities_are_those_the_preparation_writes():
    # The next `data:prepare` must keep wind declared unpublished, not drop it.
    manifest = json.loads((spec.DATA_DIR / "manifest.json").read_text("utf-8"))
    rebuilt = prepare.build_manifest(manifest["datasets"], manifest["sites"], manifest["generatedAt"])
    assert rebuilt["regions"] == manifest["regions"]


def edit_geology(root, change):
    edit_manifest(root, lambda m: change(dataset(m, "jezero-geology-units")["geology"]))


def test_a_site_cannot_be_given_a_unit_while_others_are_within_the_offset(data_copy):
    def change(info):
        info["sites"][0]["assignedSymbol"] = info["sites"][0]["candidates"][0]["symbol"]

    edit_geology(data_copy, change)
    assert any("although other units are within the uncertainty" in e for e in check.validate(data_copy))


def test_every_site_needs_its_geologic_context(data_copy):
    edit_geology(data_copy, lambda info: info["sites"].pop())
    assert any("has no geologic context" in e for e in check.validate(data_copy))


def test_a_geologic_map_must_stay_interpretive_and_declare_its_offset(data_copy):
    def change(info):
        info["interpretive"] = False
        info["registration"]["offsetMetres"]["max"] = 0

    edit_geology(data_copy, change)
    errors = check.validate(data_copy)
    assert any("declared interpretive" in e for e in errors)
    assert any("positive uncertainty" in e for e in errors)


def test_a_drawn_unit_must_be_in_the_legend(data_copy):
    edit_geology(data_copy, lambda info: info["units"].pop(0))
    assert any("drawn but missing from the legend" in e for e in check.validate(data_copy))
