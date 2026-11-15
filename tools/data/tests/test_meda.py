import pytest

from marps_data import meda

TEMPERATURE_RANGE = (120.0, 330.0)
HEADER = "SCLK,LMST,LTST,ATS_LOCAL_TEMP1,ATS_LOCAL_TEMP2"


def sol_csv(*rows: str) -> str:
    return "\r\n".join((HEADER, *rows)) + "\r\n"


def hour(hours, number):
    return next(h for h in hours if h["hour"] == number)


def test_each_hour_keeps_the_median_of_the_chosen_sensor_only():
    text = sol_csv(
        "1,00500M14:00:03.640,0500 13:50:00,233.00,260.00",
        "2,00500M14:00:04.613,0500 13:50:01,235.00,262.00",
        "3,00500M14:20:31.890,0500 14:10:00,240.00,264.00",
    )
    hours = meda.hourly_values(text, "ATS_LOCAL_TEMP1", 500, TEMPERATURE_RANGE)
    assert hour(hours, 14) == {
        "hour": 14,
        "median": 235.0,
        "samples": 3,
        "invalid": 0,
        "firstLmst": "14:00:03",
        "lastLmst": "14:20:31",
    }


def test_a_sol_always_lists_24_hours_and_an_hour_without_data_stays_empty():
    hours = meda.hourly_values(sol_csv("1,00500M06:00:00.000,x,190.00,191.00"), "ATS_LOCAL_TEMP1", 500, TEMPERATURE_RANGE)
    assert [h["hour"] for h in hours] == list(range(24))
    assert hour(hours, 7) == {"hour": 7, "median": None, "samples": 0, "invalid": 0, "firstLmst": None, "lastLmst": None}


@pytest.mark.parametrize("value", ["", "abc", "9999999999", "nan", "inf", "0.00", "-5.00", "400.00"])
def test_empty_sentinel_and_impossible_values_are_counted_as_invalid_never_used(value):
    text = sol_csv(f"1,00500M10:00:00.000,x,{value},200.00", "2,00500M10:00:01.000,x,220.00,200.00")
    ten = hour(meda.hourly_values(text, "ATS_LOCAL_TEMP1", 500, TEMPERATURE_RANGE), 10)
    assert (ten["median"], ten["samples"], ten["invalid"]) == (220.0, 1, 1)


def test_an_hour_with_only_invalid_values_is_unavailable():
    text = sol_csv("1,00500M10:00:00.000,x,9999999999,200.00", "2,00500M10:00:01.000,x,,200.00")
    ten = hour(meda.hourly_values(text, "ATS_LOCAL_TEMP1", 500, TEMPERATURE_RANGE), 10)
    assert (ten["median"], ten["samples"], ten["invalid"], ten["firstLmst"]) == (None, 0, 2, None)


def test_a_row_from_another_sol_or_a_missing_column_stops_the_preparation():
    with pytest.raises(ValueError, match="sol 501"):
        meda.hourly_values(sol_csv("1,00501M10:00:00.000,x,220.00,200.00"), "ATS_LOCAL_TEMP1", 500, TEMPERATURE_RANGE)
    with pytest.raises(ValueError, match="ATS_LOCAL_TEMP3"):
        meda.hourly_values(sol_csv(), "ATS_LOCAL_TEMP3", 500, TEMPERATURE_RANGE)


LABEL = """<?xml version="1.0" encoding="UTF-8"?>
<Product_Observational xmlns="http://pds.nasa.gov/pds4/pds/v1" xmlns:mars2020="http://pds.nasa.gov/pds4/mission/mars2020/v1">
  <Observation_Area>
    <Time_Coordinates>
      <start_date_time>2022-07-16T22:18:04.706Z</start_date_time>
      <stop_date_time>2022-07-17T22:16:38.386Z</stop_date_time>
    </Time_Coordinates>
    <Mission_Area><mars2020:Mars2020_Parameters><mars2020:Observation_Information>
      <mars2020:start_sol_number>00500</mars2020:start_sol_number>
      <mars2020:stop_sol_number>00500</mars2020:stop_sol_number>
    </mars2020:Observation_Information></mars2020:Mars2020_Parameters></Mission_Area>
  </Observation_Area>
  <File_Area_Observational>
    <File><md5_checksum>532451913baa9df3b5b47bdec4fedf05</md5_checksum></File>
    <Table_Delimited><Record_Delimited>
      <Field_Delimited><name>PRESSURE</name><unit>pascal</unit></Field_Delimited>
      <Field_Delimited><name>PRESSURE UNCERTAINTY</name><unit>kelvin</unit></Field_Delimited>
    </Record_Delimited></Table_Delimited>
  </File_Area_Observational>
</Product_Observational>
"""


def test_the_label_gives_checksum_sol_time_span_and_the_unit_of_the_chosen_column():
    assert meda.read_label(LABEL.encode(), "PRESSURE") == {
        "md5": "532451913baa9df3b5b47bdec4fedf05",
        "sol": 500,
        "startUtc": "2022-07-16T22:18:04.706Z",
        "stopUtc": "2022-07-17T22:16:38.386Z",
        "unit": "pascal",
    }


def test_a_column_absent_from_the_label_is_refused():
    with pytest.raises(ValueError, match="TEMPERATURE"):
        meda.read_label(LABEL.encode(), "TEMPERATURE")


def waypoint(rmc, sol, longitude, latitude):
    properties = {"RMC": rmc, "sol": sol, "lon": longitude, "lat": latitude}
    return {"type": "Feature", "properties": properties, "geometry": {"type": "Point", "coordinates": [longitude, latitude]}}


# Real end-of-drive waypoints around sol 500 (M20_waypoints.json).
WAYPOINTS = {
    "features": [
        waypoint("26_1004", 477, 77.40616768, 18.45889532),
        waypoint("26_1154", 501, 77.40595178, 18.45869497),
    ]
}


def test_the_rover_stands_at_the_last_stop_before_the_sol_when_it_did_not_drive():
    assert meda.rover_position(WAYPOINTS, 500) == {
        "longitude": 77.40616768,
        "latitude": 18.45889532,
        "waypoint": "26_1004",
        "sinceSol": 477,
        "untilSol": 501,
    }


def test_a_sol_with_a_drive_has_no_single_position():
    with pytest.raises(ValueError, match="drove on sol 501"):
        meda.rover_position(WAYPOINTS, 501)


def test_the_nearest_site_and_its_distance_in_metres():
    sites = [
        {"id": "skinner-ridge", "name": "Skinner Ridge", "coordinate": {"longitude": 77.40617493, "latitude": 18.45893136}},
        {"id": "amalik", "name": "Amalik", "coordinate": {"longitude": 77.40144029, "latitude": 18.45072631}},
    ]
    position = {"longitude": 77.40616768, "latitude": 18.45889532}
    # 3.6e-5 degree of latitude on a 3396.19 km sphere: about 2.1 m; longitude adds about 0.4 m.
    assert meda.nearest_site(position, sites, 3_396_190.0) == {"id": "skinner-ridge", "name": "Skinner Ridge", "distanceMetres": 2}


SKINNER = {"id": "skinner-ridge", "name": "Skinner Ridge", "coordinate": {"longitude": 77.40617493, "latitude": 18.45893136}}


@pytest.fixture
def offline_meda(tmp_path, monkeypatch):
    """Serves one pressure CSV, its label and the waypoints without network; returns a function to alter the label."""
    from dataclasses import replace

    from marps_data import prepare, spec

    csv_bytes = (
        "SCLK,LMST,LTST,PRESSURE,PRESSURE_UNCERTAINTY,TRANSDUCER\r\n"
        "1,00500M14:00:06.000,x,781.20,,1\r\n"
        "2,00500M14:00:07.000,x,9999999999,,1\r\n"
    ).encode()
    product = replace(spec.MEDA_PRODUCTS[1], sha256=prepare.sha256(csv_bytes))
    label = {"text": LABEL.replace("532451913baa9df3b5b47bdec4fedf05", prepare.hashlib.md5(csv_bytes).hexdigest())}  # noqa: S324
    waypoints_bytes = prepare.json.dumps(WAYPOINTS).encode()
    responses = {
        f"{product.base_url}.CSV": lambda: csv_bytes,
        f"{product.base_url}.xml": lambda: label["text"].encode(),
        spec.WAYPOINTS_URL: lambda: waypoints_bytes,
    }
    monkeypatch.setitem(spec.ROVER_HASHES, "waypoints", prepare.sha256(waypoints_bytes))
    monkeypatch.setattr(spec, "MEDA_PRODUCTS", (product,))
    monkeypatch.setattr(spec, "CACHE_DIR", tmp_path / "cache")
    monkeypatch.setattr(prepare, "fetch", lambda url: responses[url]())

    def run(change_label=lambda text: text):
        label["text"] = change_label(label["text"])
        return prepare.prepare_meda(tmp_path / "staging", "2026-11-14T00:00:00Z", [SKINNER])

    return run


def test_preparation_freezes_the_hours_counts_invalid_samples_and_names_the_place(offline_meda):
    (dataset,) = offline_meda()
    assert dataset["id"] == "jezero-meda-pressure"
    assert dataset["noData"] == {"kind": "invalid-samples", "invalidSampleCount": 1, "emptyHourCount": 23}
    assert dataset["status"] == "partial"
    assert dataset["acquisition"]["sol"] == "500"


def test_preparation_stops_when_the_label_declares_another_unit(offline_meda):
    with pytest.raises(RuntimeError, match="kelvin"):
        offline_meda(lambda text: text.replace("<name>PRESSURE</name><unit>pascal</unit>", "<name>PRESSURE</name><unit>kelvin</unit>"))


def test_preparation_stops_when_the_csv_does_not_match_its_label_checksum(offline_meda):
    with pytest.raises(RuntimeError, match="md5"):
        offline_meda(lambda text: text.replace("<md5_checksum>", "<md5_checksum>0"))
