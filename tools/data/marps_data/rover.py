"""Select original Mars rover features without reconstructing a route."""
import math


def intersects(a, b, extent):
    lower, upper = 0.0, 1.0
    for origin, delta, minimum, maximum in (
        (a[0], b[0] - a[0], extent['west'], extent['east']),
        (a[1], b[1] - a[1], extent['south'], extent['north']),
    ):
        if delta == 0:
            if not minimum <= origin <= maximum:
                return False
        else:
            entry, exit = sorted(((minimum - origin) / delta, (maximum - origin) / delta))
            lower, upper = max(lower, entry), min(upper, exit)
            if lower > upper:
                return False
    return True


def validate_feature(feature, geometry_type):
    geometry = feature.get('geometry', {})
    if geometry.get('type') != geometry_type:
        raise ValueError('Unexpected rover geometry')
    coordinates = geometry['coordinates']
    points = [coordinates] if geometry_type == 'Point' else coordinates
    if len(points) < (1 if geometry_type == 'Point' else 2):
        raise ValueError('Empty rover geometry')
    for point in points:
        if len(point) < 2 or not all(isinstance(value, (int, float)) and math.isfinite(value) for value in point):
            raise ValueError('Invalid rover coordinate')
        if not (-180 <= point[0] <= 180 and -90 <= point[1] <= 90):
            raise ValueError('Rover coordinate outside Mars')
    sol = feature.get('properties', {}).get('sol')
    if type(sol) is not int or sol < 0:
        raise ValueError('Invalid rover sol')


def select_rover_features(waypoints, traverse, extent):
    for feature in waypoints['features']:
        validate_feature(feature, 'Point')
    for feature in traverse['features']:
        validate_feature(feature, 'LineString')
    lines = [feature for feature in traverse['features'] if any(
        intersects(a, b, extent) for a, b in zip(feature['geometry']['coordinates'], feature['geometry']['coordinates'][1:]))]
    references = {feature['properties'][key] for feature in lines for key in ('fromRMC', 'toRMC')}
    points = [feature for feature in waypoints['features'] if feature['properties']['RMC'] in references or
              intersects(feature['geometry']['coordinates'], feature['geometry']['coordinates'], extent)]
    by_rmc = {}
    discrepancies = []
    for point in points:
        props = point['properties']
        identifier = props['RMC']
        if identifier in by_rmc:
            raise ValueError(f'Duplicate RMC: {identifier}')
        by_rmc[identifier] = point
        xy = point['geometry']['coordinates']
        if any(abs(props.get(key, xy[index]) - xy[index]) > 1e-7 for index, key in enumerate(('lon', 'lat'))):
            discrepancies.append(f'{identifier}: coordinate metadata mismatch')
    for line in lines:
        for key, index in (('fromRMC', 0), ('toRMC', -1)):
            identifier = line['properties'][key]
            if identifier in by_rmc and any(abs(a-b) > 1e-7 for a,b in zip(
                line['geometry']['coordinates'][index][:2], by_rmc[identifier]['geometry']['coordinates'][:2])):
                discrepancies.append(f"sol {line['properties']['sol']} {identifier}: endpoint mismatch")
    quality = {'missingReferences': sorted(references - by_rmc.keys()), 'discrepancies': discrepancies,
               'coordinates': 'Mars planetocentric degrees, east-positive; upstream CRS84 is not an Earth datum.'}
    return ({**waypoints, 'features': points}, {**traverse, 'features': lines}, quality)


def prepare_rover(staging, retrieved_at):
    from . import spec
    from .prepare import fetch, fingerprint, write_file, sha256
    import json
    raw = []
    collections = []
    for label, expected in spec.ROVER_HASHES.items():
        url = f'https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_{label}.json'
        cached = spec.CACHE_DIR / f'M20_{label}.json'
        body = cached.read_bytes() if cached.exists() else fetch(url)
        if sha256(body) != expected:
            raise ValueError(f'Changed rover source: {label}; review before refreshing pin')
        cached.parent.mkdir(parents=True, exist_ok=True)
        cached.write_bytes(body)
        raw.append((url, body))
        collections.append(json.loads(body))
    points, lines, quality = select_rover_features(*collections, spec.SECTOR)
    report = write_file(staging, 'jezero/rover/quality.json', json.dumps(quality, indent=2).encode(), 'application/json')
    datasets = []
    for label, collection, (url, body) in zip(('waypoints', 'traverse'), (points, lines), raw):
        coordinates = [p for feature in collection['features'] for p in
                       ([feature['geometry']['coordinates']] if label == 'waypoints' else feature['geometry']['coordinates'])]
        if not coordinates:
            raise ValueError('Empty prepared rover extract')
        entry = write_file(staging, f'jezero/rover/{label}.geojson', json.dumps(collection).encode(), 'application/geo+json')
        datasets.append({'id': f'jezero-perseverance-{label}', 'regionId': 'jezero', 'title': f'Perseverance {label}',
            'kind': f'rover-{label}', 'instrument': 'Mars 2020 Perseverance', 'delivery': 'local',
            'source': {'url': url, 'retrievedAt': retrieved_at, 'credit': 'NASA/JPL-Caltech', 'terms': spec.NASA_TERMS,
                       'fingerprint': fingerprint('Upstream GeoJSON', body)},
            'acquisition': {'date': None, 'sol': None, 'note': collection.get('name', '')},
            'units': {'longitude': 'degree', 'latitude': 'degree'}, 'crs': 'MARS:104905',
            'extent': {'west': min(p[0] for p in coordinates), 'east': max(p[0] for p in coordinates),
                       'south': min(p[1] for p in coordinates), 'north': max(p[1] for p in coordinates)},
            'resolution': None, 'noData': {'kind': 'not-applicable'}, 'status': 'partial',
            'version': collection.get('name', expected),
            'limitations': ['Historical extract; not a validated human route.', quality['coordinates'],
                            'Original vertices and elevations preserved; no vertical alignment performed.'],
            'files': [entry, report] if label == 'waypoints' else [entry]})
    return datasets
