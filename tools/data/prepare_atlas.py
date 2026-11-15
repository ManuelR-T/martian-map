"""Prepare optional worldwide context independently of the Jezero data pipeline.
Run with the tools/data Python environment (Pillow). No network during builds.
"""
import argparse
import hashlib
import io
import json
import math
from pathlib import Path
import ssl
import struct
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from PIL import Image

ROOT = Path(__file__).resolve().parents[2] / 'apps/web/public/atlas'
HRSC = 'https://hrscteam.dlr.de/public/data/global_mosaic/extra/'
GEOLOGY = 'https://services.arcgis.com/nzS0F0zdNLvs7nc8/ArcGIS/rest/services/Mars_Geology_feature_layer/FeatureServer/0'
TES = 'https://ms-mars.mars.asu.edu/TES_Thermal_Inertia?SERVICE=WMS&REQUEST=GetMap&FORMAT=image/png&WIDTH=2880&HEIGHT=1440&SRS=JMARS:4&BBOX=-180,-90,180,90&STYLES=&VERSION=1.1.1&LAYERS=TES_Thermal_Inertia'


def prepare(allow_insecure_tes=False):
    ROOT.mkdir(parents=True, exist_ok=True)
    records = []
    def fetch(url, headers=None, insecure=False):
        context = ssl._create_unverified_context() if insecure else ssl.create_default_context()
        with urllib.request.urlopen(urllib.request.Request(url, headers=headers or {}), context=context, timeout=60) as response:
            data = response.read()
            records.append({'url': url, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(), 'tlsVerified': not insecure, 'requestHeaders': headers or {}})
            return data
    def write_json(name, data):
        (ROOT / name).write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n')

    # Inspect GeoTIFF geometry without downloading its 683 MB float raster.
    header = fetch(HRSC + 'globalmosaic.rgb.tif', {'Range': 'bytes=0-65535'})
    assert len(header) == 65536 and header[:4] == b'II*\x00'
    tags = {}
    for i in range(struct.unpack_from('<H', header, 8)[0]):
        tag, kind, count, value = struct.unpack_from('<HHII', header, 10 + i * 12)
        tags[tag] = (kind, count, value)
    width, height = tags[256][2], tags[257][2]
    dx, dy, _ = struct.unpack_from('<3d', header, tags[33550][2])
    _, _, _, x, y, _ = struct.unpack_from('<6d', header, tags[33922][2])
    # Sphere radius 3396000 m, EQC central meridian/standard parallel 0 from GeoKeys.
    extent = [math.degrees(v / 3396000) for v in [x, y - height * dy, x + width * dx, y]]
    photo = fetch(HRSC + 'jpg/globalmosaic_rgb.jpg')
    im = Image.open(io.BytesIO(photo))
    assert im.size == (1280, 640) and abs(width / height - 2) < .001
    (ROOT / 'hrsc.jpg').write_bytes(photo)

    meta = json.loads(fetch(GEOLOGY + '?f=json'))
    assert meta['spatialReference']['wkid'] == 104971
    expected = json.loads(fetch(GEOLOGY + '/query?where=1%3D1&returnCountOnly=true&f=json'))['count']
    features = []
    while len(features) < expected:
        params = urllib.parse.urlencode({'where': '1=1', 'outFields': 'OBJECTID,Unit,UnitDesc', 'returnGeometry': 'true', 'maxAllowableOffset': .08, 'geometryPrecision': 4, 'orderByFields': 'OBJECTID', 'resultOffset': len(features), 'resultRecordCount': 1000, 'f': 'json'})
        page = json.loads(fetch(GEOLOGY + '/query?' + params))
        batch = page.get('features', [])
        if not batch: raise ValueError('Incomplete geology response')
        features.extend(batch)
    assert len(features) == expected and len({f['attributes']['OBJECTID'] for f in features}) == expected
    write_json('geology.json', {'geometryType': 'esriGeometryPolygon', 'spatialReference': meta['spatialReference'], 'features': features})
    colors = {item['value']: item['symbol']['color'] for item in meta['drawingInfo']['renderer']['uniqueValueInfos']}
    write_json('geology-colors.json', colors)

    thermal = fetch(TES, insecure=allow_insecure_tes)
    im = Image.open(io.BytesIO(thermal)).convert('RGBA')
    assert im.size == (2880, 1440)
    # Product valid only 60 S..60 N. Retain native transparency inside that band.
    im.crop((0, 240, 2880, 1200)).save(ROOT / 'tes.png', optimize=True)
    manifest = {'schemaVersion': 1, 'retrievedAt': datetime.now(timezone.utc).isoformat(), 'sources': records,
                'hrsc': {'extent': extent, 'width': 1280, 'height': 640, 'sourceMetresPerPixel': 2000, 'sourceProjection': 'EQC, lon_0=0, lat_ts=0, sphere radius 3396000 m', 'displayMetresPerPixel': width * dx / 1280},
                'geology': {'count': expected, 'simplificationDegrees': .08, 'nativeWkid': 104971, 'distribution': 'Esri StoryMaps copy of USGS SIM 3292 (2014)'},
                'tes': {'extent': [-180, -60, 180, 60], 'width': 2880, 'height': 960, 'pixelsPerDegree': 8},
                'files': [{'path': p.name, 'bytes': p.stat().st_size, 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(ROOT.iterdir()) if p.name != 'manifest.json']}
    write_json('manifest.json', manifest)
    print('Atlas prepared:', expected, 'geologic polygons')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--allow-insecure-tes', action='store_true', help='Explicit workaround for the ASU public server incomplete TLS certificate chain; recorded in provenance.')
    prepare(parser.parse_args().allow_insecure_tes)
