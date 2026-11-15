import copy
import json
from marps_data import spec
from marps_data.annotations import validate_annotations, prepare_annotations

def inputs():
    manifest = json.loads((spec.DATA_DIR / 'manifest.json').read_text())
    collection = json.loads((spec.REPO_ROOT / 'data/research/jezero-terrain-annotations.geojson').read_text())
    return manifest, collection

def test_curated_annotations_and_reproducible_preparation(tmp_path):
    manifest, collection = inputs()
    assert validate_annotations(collection, manifest, spec.DATA_DIR) == []
    imagery = next(d for d in manifest['datasets'] if d['kind'] == 'imagery')
    descriptor = prepare_annotations(tmp_path, '2026-11-15T00:00:00Z', imagery)
    assert json.loads((tmp_path / descriptor['files'][0]['path']).read_text()) == collection
    assert descriptor['status'] == 'partial'

def test_invalid_references_coordinates_and_uncertainty():
    manifest, collection = inputs()
    for field, value in [('imageryVersion', 'bad'), ('evidenceFiles', ['../bad']), ('category', 'safe'), ('evidenceSha256', {})]:
        invalid = copy.deepcopy(collection)
        invalid['features'][0]['properties'][field] = value
        assert validate_annotations(invalid, manifest, spec.DATA_DIR)
    collection['features'][0]['geometry']['coordinates'].reverse()
    assert validate_annotations(collection, manifest, spec.DATA_DIR)
