"""Project-authored visual interpretations, anchored to frozen HiRISE pixels."""
import json
import math
from pathlib import Path
from PIL import Image
from . import spec


def validate_annotations(collection: object, manifest: dict, root: Path | None = None) -> list[str]:
    try:
        if not isinstance(collection, dict) or collection['type'] != 'FeatureCollection' or not isinstance(collection['features'], list):
            raise ValueError('expected FeatureCollection')
        sector = next(r['extent'] for r in manifest['regions'] if r['id'] == 'jezero')
        identifiers = set()
        def text(value):
            return isinstance(value, str) and bool(value.strip())
        for feature in collection['features']:
            identifier, properties, geometry = feature['id'], feature['properties'], feature['geometry']
            if feature['type'] != 'Feature' or not text(identifier) or identifier in identifiers:
                raise ValueError('invalid or duplicate id')
            identifiers.add(identifier)
            for key in ('title', 'observation', 'inspectionReason', 'imageryDatasetId', 'imageryVersion', 'imagerySourceSha256', 'curatedBy', 'curatedAt'):
                if not text(properties[key]):
                    raise ValueError(f'missing {key}')
            if properties['regionId'] != 'jezero' or properties['category'] not in ('dune', 'block-field', 'scarp'):
                raise ValueError('invalid region/category')
            if not isinstance(properties['limitations'], list) or not properties['limitations'] or not all(text(item) for item in properties['limitations']):
                raise ValueError('missing limitations')
            if properties['confidence']['level'] not in ('low', 'medium', 'high') or not text(properties['confidence']['reason']):
                raise ValueError('invalid confidence')
            registration = properties['registration']
            if not all(text(registration[key]) for key in ('checkedAt', 'method', 'note')):
                raise ValueError('missing registration')
            uncertainty = registration['positionalUncertaintyMetres']
            if uncertainty is not None and (isinstance(uncertainty, bool) or not isinstance(uncertainty, (float, int)) or not math.isfinite(uncertainty) or uncertainty <= 0):
                raise ValueError('invalid uncertainty')
            imagery = next(d for d in manifest['datasets'] if d['id'] == properties['imageryDatasetId'] and d['kind'] == 'imagery' and d['regionId'] == 'jezero' and d['delivery'] == 'local' and d['status'] != 'unavailable')
            if imagery['version'] != properties['imageryVersion'] or imagery['source']['fingerprint']['sha256'] != properties['imagerySourceSha256']:
                raise ValueError('imagery version mismatch')
            evidence = properties['evidenceFiles']
            paths = {entry['path'] for entry in imagery['files']}
            if not isinstance(evidence, list) or not evidence or any(not isinstance(path, str) or '..' in path or path not in paths or not path.startswith('jezero/hirise/') or not path.endswith('.png') for path in evidence):
                raise ValueError('invalid evidence files')
            hashes = {entry['path']: entry['sha256'] for entry in imagery['files']}
            if not isinstance(properties['evidenceSha256'], dict) or any(properties['evidenceSha256'].get(path) != hashes[path] for path in evidence):
                raise ValueError('evidence pixel fingerprint mismatch')
            if geometry['type'] == 'Point':
                positions = [geometry['coordinates']]
            elif geometry['type'] == 'Polygon':
                rings = geometry['coordinates']
                if len(rings) != 1 or len(rings[0]) < 4 or rings[0][0] != rings[0][-1]:
                    raise ValueError('invalid polygon ring')
                positions = rings[0]
            else:
                raise ValueError('unsupported geometry')
            for position in positions:
                if len(position) != 2 or any(isinstance(value, bool) or not isinstance(value, (float, int)) or not math.isfinite(value) for value in position):
                    raise ValueError('invalid coordinates')
                longitude, latitude = position
                if not (sector['west'] <= longitude <= sector['east'] and sector['south'] <= latitude <= sector['north']):
                    raise ValueError('outside mission sector')
                if root is not None:
                    covered = False
                    for path in evidence:
                        zoom, row, column = map(int, Path(path).with_suffix('').parts[-3:])
                        pixel_x = (longitude + 180) / (180 / 2**zoom) * 256 - column * 256
                        pixel_y = (90 - latitude) / (180 / 2**zoom) * 256 - row * 256
                        if 0 <= pixel_x < 256 and 0 <= pixel_y < 256:
                            with Image.open(root / path) as image:
                                covered |= image.convert('RGBA').getpixel((int(pixel_x), int(pixel_y)))[3] > 0
                    if not covered:
                        raise ValueError('no nontransparent evidence pixel')
            if geometry['type'] == 'Polygon':
                origin = positions[0]
                area = sum((a[0]-origin[0])*(b[1]-origin[1])-(b[0]-origin[0])*(a[1]-origin[1]) for a,b in zip(positions, positions[1:]))
                if abs(area) < 1e-14:
                    raise ValueError('degenerate polygon')
                def cross(a,b,c):
                    return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
                for index in range(len(positions)-1):
                    for other in range(index+2,len(positions)-1):
                        if index == 0 and other == len(positions)-2:
                            continue
                        a,b,c,d = positions[index],positions[index+1],positions[other],positions[other+1]
                        if (cross(a,b,c)*cross(a,b,d) <= 0 and cross(c,d,a)*cross(c,d,b) <= 0
                                and max(min(a[0],b[0]),min(c[0],d[0])) <= min(max(a[0],b[0]),max(c[0],d[0]))
                                and max(min(a[1],b[1]),min(c[1],d[1])) <= min(max(a[1],b[1]),max(c[1],d[1]))):
                            raise ValueError('self-intersecting polygon')
        return []
    except (KeyError, TypeError, ValueError, StopIteration, IndexError, OSError) as error:
        return [f'annotations: {error}']


def prepare_annotations(staging: Path, retrieved_at: str, imagery: dict) -> dict:
    from .prepare import fingerprint, write_file
    source = spec.REPO_ROOT / 'data/research/jezero-terrain-annotations.geojson'
    contents = source.read_bytes()
    errors = validate_annotations(json.loads(contents), {'regions': [{'id': 'jezero', 'extent': spec.SECTOR}], 'datasets': [imagery]})
    if errors:
        raise ValueError('; '.join(errors))
    return {
        'id': 'jezero-terrain-annotations', 'regionId': 'jezero', 'title': 'Terrain inspection annotations',
        'kind': 'terrain-annotations', 'instrument': 'Visual interpretation of HiRISE imagery', 'delivery': 'local',
        'source': {'url': 'https://github.com/ManuelR-T/martian-map/blob/dev/data/research/jezero-terrain-annotations.geojson',
                   'retrievedAt': retrieved_at, 'credit': 'Marps curators; imagery NASA/JPL-Caltech/University of Arizona',
                   'terms': imagery['source']['terms'], 'fingerprint': fingerprint(source.name, contents)},
        'acquisition': {**imagery['acquisition'], 'note': 'Image acquisition dates unknown; curation dates are separate.'},
        'units': {}, 'crs': imagery['crs'], 'extent': spec.SECTOR, 'resolution': None,
        'noData': {'kind': 'not-applicable'}, 'status': 'partial', 'version': '2026-11-15-v1',
        'limitations': ['Selected visual interpretations; unannotated terrain has not been assessed.', 'Not measured bearing capacity or an operational exclusion.'],
        'files': [write_file(staging, 'jezero/annotations/terrain.geojson', contents, 'application/geo+json')],
    }
