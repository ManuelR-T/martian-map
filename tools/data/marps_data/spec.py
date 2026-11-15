"""Fixed inputs of the preparation: sector, upstream URLs, credits and known limits.

Strings that the app may display are in French; keys and identifiers are English.
"""

from dataclasses import dataclass
from pathlib import Path

from .geo import Extent

TOOL_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = TOOL_DIR.parents[1]
DATA_DIR = REPO_ROOT / "apps" / "web" / "public" / "data"
CACHE_DIR = TOOL_DIR / ".cache"

SCHEMA_VERSION = 3
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

USGS_MOSAICS = "https://planetarymaps.usgs.gov/mosaic/mars2020_trn"
# Constraints read on the USGS Astropedia record of each product.
USGS_TERMS_SUMMARY = "Fiche USGS Astropedia : aucune contrainte d'accès ; citer les auteurs (Fergason et al., 2020)."
# Stated by the product names (« MOLAtopography_DeltaGeoid ») ; the USGS records give no further definition.
VERTICAL_DATUM = "Topographie MOLA, hauteur au-dessus de l'aréoïde (d'après le nom du produit USGS)"


@dataclass(frozen=True)
class ElevationProduct:
    """An upstream elevation GeoTIFF and the grid frozen from it."""

    slug: str  # dataset ids are jezero-<slug>-dem, -slope and -hillshade
    title: str  # completes « Altitudes … », « Pentes … », « Relief ombré … »
    instrument: str
    url: str
    record_url: str
    credit: str
    version: str
    acquisition_note: str
    source_pixel_m: float
    aggregation: int  # source pixels averaged per stored cell side; 1 keeps the native grid
    whole_file: bool  # False: only the needed rows are read with an HTTP range request
    sha256: str  # of the whole file, or of the row block read; a changed source must be reviewed
    limitations: tuple[str, ...]

    @property
    def cell_m(self) -> float:
        return self.source_pixel_m * self.aggregation

    @property
    def file_stem(self) -> str:
        return f"jezero/dem/{self.slug}-{self.cell_m:g}m"


# The finest product comes first; the CTX grid is the fallback when HiRISE is unusable.
ELEVATION_PRODUCTS = (
    ElevationProduct(
        slug="hirise",
        title="HiRISE 4 m de Jezero (secteur du front du delta)",
        instrument="Mars Reconnaissance Orbiter, caméra HiRISE (mosaïque de modèles numériques stéréo)",
        url=f"{USGS_MOSAICS}/HiRISE/JEZ_hirise_soc_006_DTM_MOLAtopography_DeltaGeoid_1m_Eqc_latTs0_lon0_blend40.tif",
        record_url="https://astrogeology.usgs.gov/search/map/mars_2020_terrain_relative_navigation_hirise_dtm_mosaic",
        credit="USGS Astrogeology Science Center ; NASA/JPL-Caltech/University of Arizona, Mars 2020 Terrain Relative Navigation HiRISE DTM Mosaic",
        version="soc_006",
        acquisition_note="Mosaïque de modèles stéréo HiRISE ; dates des paires non relevées.",
        source_pixel_m=1.0,
        # 1 m would weigh 4.8 MB per grid; 4 m keeps 0.3 MB and divides the 20 m CTX cell.
        aggregation=4,
        whole_file=False,  # 1.8 GB upstream
        # Of source rows 12104 to 13303, the block read for the sector (first read on 2026-11-14).
        sha256="6b0094366c7b819061e70451f9a8f1d8cdd8e5962ae804bcece94c99e22bd0b4",
        limitations=(
            "Moyenne par blocs de 4 × 4 pixels du produit à 1 m : les reliefs de moins de quelques mètres sont lissés.",
            "Écart vertical médian publié avec le DEM CTX : environ 0,4 m (Fergason et al., 2020) ; ce n'est pas une précision absolue.",
        ),
    ),
    ElevationProduct(
        slug="ctx",
        title="CTX 20 m de Jezero (secteur du front du delta)",
        instrument="Mars Reconnaissance Orbiter, caméra CTX (modèle numérique stéréo)",
        url=f"{USGS_MOSAICS}/CTX/JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0.tif",
        record_url="https://astrogeology.usgs.gov/search/map/mars_2020_terrain_relative_navigation_ctx_dtm_mosaic",
        credit="USGS Astrogeology Science Center ; NASA/JPL, Mars 2020 Terrain Relative Navigation CTX DTM",
        version="soc_008",
        acquisition_note="Mosaïque de modèles stéréo CTX ; dates non relevées.",
        source_pixel_m=20.0,
        aggregation=1,
        whole_file=True,
        # Pin from data/research/marswalk-data-verification.json.
        sha256="16a1aa66c3f48c1bca252795827db7b417876217aff0f5e1aff18027fab2327b",
        limitations=(
            "Jeu de repli : préférer la grille HiRISE quand elle est disponible.",
            "Recalage publié entre modèles CTX : 3,8 m en vertical, 9,6 m de décalage horizontal moyen (Fergason et al., 2020).",
        ),
    ),
)

# Shared by every elevation, slope and shaded-relief grid.
TERRAIN_LIMITATIONS = (
    "La taille de maille est un pas d'échantillonnage, pas une précision : ne pas s'en servir pour la navigation.",
    "Les blocs, marches et crevasses plus petits que la maille ne sont pas résolus ; aucune praticabilité à pied n'est certifiée.",
    "Recalage horizontal et vertical non validé indépendamment ; ne pas mélanger ces altitudes à celles des prélèvements.",
)

SITES_URL = "https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_SAMPLE_v3.json"

# End-of-drive positions of Perseverance: tell where the rover stood during a MEDA sol.
WAYPOINTS_URL = "https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_waypoints.json"

MEDA_BUNDLE = "https://atmos.nmsu.edu/PDS/data/PDS4/Mars2020/mars2020_meda"
MEDA_PORTAL = "https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/PERSEVERANCE/meda.html"
MEDA_CREDIT = "NASA/JPL-Caltech, CAB (CSIC-INTA), instrument MEDA de Perseverance ; archive PDS Atmospheres Node"


@dataclass(frozen=True)
class MedaProduct:
    """One MEDA CSV of one sol and the single column kept from it."""

    measure: str  # temperature | pressure; dataset id is jezero-meda-<measure>
    title: str
    sol: int
    collection: str  # data_calibrated_env or data_derived_env
    product: str  # file name without extension
    column: str
    unit: str  # as declared by the PDS4 label; the preparation stops if the label says otherwise
    # Physically possible values; anything outside is an invalid sample, never a measurement.
    valid_range: tuple[float, float]
    sensor: str
    sha256: str  # of the CSV; a changed source must be reviewed
    limitations: tuple[str, ...]

    @property
    def base_url(self) -> str:
        return f"{MEDA_BUNDLE}/{self.collection}/sol_0420_0539/sol_{self.sol:04d}/{self.product}"


MEDA_PRODUCTS = (
    MedaProduct(
        measure="temperature",
        title="Température de l'air au rover (MEDA, sol 500)",
        sol=500,
        # No derived ATS product exists: the readme says to use the calibrated level then.
        collection="data_calibrated_env",
        product="WE__0500___________CAL_ATS_________________P01",
        # ATS1, on the mast at 1.45 m: on sol 500 it is the coldest of the five sensors in
        # 18 hours out of 24 (20 out of 24 among the three mast sensors), so the least
        # heated by the rover (Munguira et al., 2023).
        column="ATS_LOCAL_TEMP1",
        unit="kelvin",
        valid_range=(120.0, 330.0),
        sensor="Capteur ATS1, sur le mât à 1,45 m du sol",
        sha256="14cb6fec22daed2ceaef66355629a0fe12c41999bae4c9694a35be62e9a05280",
        limitations=(
            "Un seul capteur retenu, jamais une moyenne des cinq : les autres lisent jusqu'à 25 °C de plus en journée, chauffés par le rover.",
            "Médiane des mesures de chaque heure ; MEDA ne mesure qu'une partie de l'heure.",
        ),
    ),
    MedaProduct(
        measure="pressure",
        title="Pression de l'air au rover (MEDA, sol 500)",
        sol=500,
        # The readme recommends the derived level when it exists.
        collection="data_derived_env",
        product="WE__0500___________DER_PS__________________P01",
        column="PRESSURE",
        unit="pascal",
        valid_range=(100.0, 1300.0),
        sensor="Capteur de pression, dans le boîtier du rover",
        sha256="988eaf6b84a5a88094b9b350275c1bc2d14637f60a93c56eabd6e7ae5c3e4a22",
        limitations=(
            "Incertitude non utilisée : colonne vide, et le label lui donne l'unité kelvin au lieu du pascal.",
            "Transducteur 1 sur tout le sol ; les notes de version MEDA signalent des sauts possibles de ce capteur.",
        ),
    ),
)

MEDA_LIMITATIONS = (
    "Mesure passée au rover, pas une prévision ni une mesure le long du parcours.",
    "Aucune limite pour l'astronaute n'en est déduite.",
)

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

ROVER_HASHES = {'waypoints': 'bd143ee69241229926abd373e6305b8bbb326d6b5a7b4a8d6935262696f93dc4', 'traverse': '6ddd0ece913d75b45d105946082f95ed84e68f4718b68d32a4421dc30877e7e6'}
