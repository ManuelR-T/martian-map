"""Fixed inputs of the preparation: sector, upstream URLs, credits and known limits.

Strings that the app may display are in French; keys and identifiers are English.
"""

from pathlib import Path

from .geo import Extent

TOOL_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = TOOL_DIR.parents[1]
DATA_DIR = REPO_ROOT / "apps" / "web" / "public" / "data"
CACHE_DIR = TOOL_DIR / ".cache"

SCHEMA_VERSION = 1
USER_AGENT = "marps-data-prepare/1.0"

# Radius provided by the NASA Mars location-map configuration (docs/verification-sites-jezero.md).
MARS_RADIUS_M = 3_396_190.0

GLOBAL_EXTENT: Extent = {"west": -180.0, "south": -90.0, "east": 180.0, "north": 90.0}

# Delta-front sector around the three demo stops: about 0.95 km east-west by 1.2 km north-south.
SECTOR: Extent = {"west": 77.395, "south": 18.445, "east": 77.412, "north": 18.465}
SITE_NAMES = ("Skinner Ridge", "Wildcat Ridge", "Amalik")

TREK = "https://trek.nasa.gov/tiles/Mars/EQ"
MOLA_LAYER = "Mars_MGS_MOLA_ClrShade_merge_global_463m"
HIRISE_LAYER = "JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd"
MOLA_CAPABILITIES_URL = f"{TREK}/{MOLA_LAYER}/1.0.0/WMTSCapabilities.xml"
MOLA_TILE_TEMPLATE = f"{TREK}/{MOLA_LAYER}/1.0.0/default/default028mm/{{z}}/{{y}}/{{x}}.jpg"
HIRISE_CAPABILITIES_URL = f"{TREK}/{HIRISE_LAYER}/1.0.0/WMTSCapabilities.xml"
HIRISE_TILE_TEMPLATE = f"{TREK}/{HIRISE_LAYER}/1.0.0/default/default028mm/{{z}}/{{y}}/{{x}}.png"
HIRISE_ZOOMS = range(12, 17)  # z16 is about 0.64 m/pixel; native product is 0.25 m/pixel

DEM_URL = (
    "https://planetarymaps.usgs.gov/mosaic/mars2020_trn/CTX/"
    "JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0.tif"
)
# Pin from data/research/marswalk-data-verification.json: a changed source must be reviewed.
DEM_SHA256 = "16a1aa66c3f48c1bca252795827db7b417876217aff0f5e1aff18027fab2327b"
DEM_PIXEL_M = 20.0

SITES_URL = "https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_SAMPLE_v3.json"

NASA_TERMS = {
    "summary": (
        "Contenu NASA réutilisable sans autorisation préalable pour un usage factuel "
        "sans suggestion de soutien ; NASA doit être citée comme source."
    ),
    "url": "https://www.nasa.gov/nasa-brand-center/images-and-media/",
    "verified": True,
}
UNVERIFIED_TERMS = {
    "summary": (
        "Conditions propres à ce produit non vérifiées ; appliquer au minimum la "
        "citation de la source et confirmer avant toute redistribution."
    ),
    "url": NASA_TERMS["url"],
    "verified": False,
}

CAPABILITY_NOT_INTEGRATED = "Non intégré à cette version du manifeste."
