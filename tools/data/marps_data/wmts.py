"""Read the pinned geographic NASA WMTS product contract."""
import xml.etree.ElementTree as ET


def imagery_wmts(contents: bytes) -> dict:
    root = ET.fromstring(contents)
    namespaces = {"w": "http://www.opengis.net/wmts/1.0", "o": "http://www.opengis.net/ows/1.1"}
    layer = root.find("w:Contents/w:Layer", namespaces)
    matrix_set = root.find("w:Contents/w:TileMatrixSet", namespaces)
    if layer is None or matrix_set is None:
        raise ValueError("Missing WMTS layer or matrix set")
    lower = [float(value) for value in layer.findtext("o:BoundingBox/o:LowerCorner", namespaces=namespaces).split()]
    upper = [float(value) for value in layer.findtext("o:BoundingBox/o:UpperCorner", namespaces=namespaces).split()]
    matrices = []
    for matrix in matrix_set.findall("w:TileMatrix", namespaces):
        def number(name: str) -> int:
            return int(float(matrix.findtext(f"w:{name}", namespaces=namespaces)))
        matrices.append({"id": matrix.findtext("o:Identifier", namespaces=namespaces),
                         "origin": [float(value) for value in matrix.findtext("w:TopLeftCorner", namespaces=namespaces).split()],
                         "tileSize": number("TileWidth"), "width": number("MatrixWidth"), "height": number("MatrixHeight")})
    return {"layer": layer.findtext("o:Identifier", namespaces=namespaces), "style": "default",
            "matrixSet": matrix_set.findtext("o:Identifier", namespaces=namespaces),
            "crs": matrix_set.findtext("o:SupportedCRS", namespaces=namespaces),
            "format": layer.findtext("w:Format", namespaces=namespaces),
            "extent": {"west": lower[0], "south": lower[1], "east": upper[0], "north": upper[1]},
            "matrices": matrices}
