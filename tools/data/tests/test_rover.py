from marps_data.rover import select_rover_features


def test_crossing_segment_is_retained_without_joining():
    segment = {"type": "Feature", "properties": {"sol": 1, "fromRMC": "a", "toRMC": "b"},
               "geometry": {"type": "LineString", "coordinates": [[-1, 0.5], [2, 0.5]]}}
    points, lines, quality = select_rover_features({"features": []}, {"features": [segment]},
        {"west": 0, "east": 1, "south": 0, "north": 1})
    assert lines["features"] == [segment]
    assert points["features"] == []
    assert quality["missingReferences"] == ["a", "b"]


def test_original_fixture_vertices_and_metadata_are_preserved():
    import json
    from pathlib import Path
    root = Path(__file__).resolve().parents[3] / 'data' / 'research'
    points = json.loads((root / 'perseverance-waypoints-extrait.json').read_text())
    lines = json.loads((root / 'perseverance-traverse-extrait.json').read_text())
    selected_points, selected_lines, _ = select_rover_features(points, lines,
        {'west': 77.395, 'east': 77.412, 'south': 18.445, 'north': 18.465})
    assert selected_lines == lines
    assert selected_points == points
    assert len(selected_lines['features'][0]['geometry']['coordinates']) == 20


def test_invalid_coordinates_fail_explicitly():
    import pytest
    with pytest.raises(ValueError):
        select_rover_features({'features': [{'properties': {'sol': 1}, 'geometry': {
            'type': 'Point', 'coordinates': [float('nan'), 0]}}]}, {'features': []}, {})
