# Relief de Jezero : altitudes, pentes et relief ombré

Vérification et préparation du 14 novembre 2026 (issue #10). Le relief du secteur
de Jezero vient du **DEM HiRISE à 1 m, agrégé à 4 m** ; le **DEM CTX à 20 m** reste
figé à côté comme jeu de repli. Les deux servent le profil d'altitude et les
alertes de pente. Aucun des deux n'est une donnée de navigation.

## Ce qui a été vérifié

### DEM HiRISE : utilisable

[Fiche USGS](https://astrogeology.usgs.gov/search/map/mars_2020_terrain_relative_navigation_hirise_dtm_mosaic) ·
[GeoTIFF](https://planetarymaps.usgs.gov/mosaic/mars2020_trn/HiRISE/JEZ_hirise_soc_006_DTM_MOLAtopography_DeltaGeoid_1m_Eqc_latTs0_lon0_blend40.tif)

- **Produit.** Mosaïque « Mars 2020 Terrain Relative Navigation HiRISE DTM », version
  `soc_006`, de la même série que l'imagerie HiRISE déjà figée. Ce n'est pas le DTM
  isolé `PSP_002387_1985` de l'université d'Arizona cité dans l'issue : celui-ci
  (320 Mo, 1 m/pixel, centre 18,49°N 77,41°E) est accessible mais n'a pas été
  téléchargé, la mosaïque USGS étant déjà recalée sur le DEM CTX.
- **Accès.** HTTP 200 après redirection vers le stockage USGS, sans compte ni clé.
  Les requêtes `Range` sont servies (HTTP 206).
- **Poids.** 1 839 545 409 octets : 21 400 colonnes × 21 488 lignes, float32 non
  compressé, une ligne par bande. Le fichier n'est jamais téléchargé en entier.
- **Emprise.** 77,2229–77,5840°E et 18,3068–18,6693°N. Elle contient le secteur.
- **Traitement.** L'en-tête (262 144 octets) donne la position de chaque ligne ; une
  seule requête lit les lignes 12 104 à 13 303, soit 102 720 000 octets, en 17 s
  environ lors du contrôle. Le bloc est mis en cache et son SHA-256 est épinglé dans
  `tools/data/marps_data/spec.py`.
- **Lacunes.** Aucune : les 1 200 × 1 020 pixels lus pour le secteur sont finis et
  aucun ne porte la valeur NoData déclarée (`-3.4028226550889045e+38`).
- **Projection.** Identique au DEM CTX : équirectangulaire, sphère de rayon
  3 396 190 m, méridien central et parallèle standard à 0°, pixel = surface.

### DEM CTX 20 m : repli conservé

Le GeoTIFF déjà vérifié (9 662 387 octets, 1 596 × 1 512, float32) est découpé comme
avant. Sa grille de 51 × 60 mailles est restée identique à l'octet près après la
refonte de la préparation.

## Projection et transformation

Les deux produits utilisent x = R·λ et y = R·φ (radians, R = 3 396 190 m). La maille
(ligne, colonne) couvre x à partir de `origin.x + colonne × pas` et y en descendant
depuis `origin.y − ligne × pas`. Le manifeste porte cette transformation dans
`raster` : `origin`, `pixelSizeMetres`, `projection`, `width`, `height`.

| Grille | Mailles (colonnes × lignes) | Pas | Origine x, y (m) |
| --- | --- | --- | --- |
| HiRISE | 253 × 298 | 4 m | 4 587 562,0 ; 1 094 510,0 |
| CTX | 51 × 60 | 20 m | 4 587 563,250853 ; 1 094 513,140188 |

**Le pas n'est pas une distance au sol dans les deux directions.** Avec un parallèle
standard à 0°, une maille mesure bien son pas du nord au sud, mais seulement
pas × cos(latitude) d'est en ouest : 18,97 m au lieu de 20 m à Jezero (18,45°N).
Les pentes tiennent compte de cet écart d'environ 5 %.

## Datum vertical

Le nom des deux fichiers indique `MOLAtopography_DeltaGeoid` : des altitudes de type
topographie MOLA, au-dessus de l'aréoïde. Les fiches USGS ne donnent pas d'autre
définition ; le manifeste le dit dans `verticalDatum`. Fergason et al. (2020)
indiquent que la mosaïque CTX a été décalée de 183,3 m en vertical pour s'aligner
sur HRSC, puis que la mosaïque HiRISE a été alignée sur la mosaïque CTX.

## Correspondance entre sites et mailles

Les trois arrêts tombent sur une maille valide des deux grilles. `pnpm data:check`
le contrôle, et les tests de `@marps/data` relisent les mêmes fichiers.

| Arrêt | Altitude HiRISE 4 m | Altitude CTX 20 m | Altitude du prélèvement (NASA) | Pente HiRISE | Pente CTX |
| --- | --- | --- | --- | --- | --- |
| Skinner Ridge | −2 520,37 m | −2 516,72 m | −2 520,19 m | 20,1° | 8,3° |
| Wildcat Ridge | −2 522,96 m | −2 519,85 m | −2 523,10 m | 8,3° | 10,3° |
| Amalik | −2 526,59 m | −2 526,77 m | −2 526,53 m | 3,9° | 3,4° |

Les altitudes HiRISE s'écartent de moins de 0,2 m de celles publiées avec les
prélèvements du rover, qui viennent d'une autre source. C'est un indice de bon
recalage sur trois points, pas une validation du datum : ne pas mélanger les deux
séries dans un même profil.

Sur le secteur, la grille HiRISE ramenée à 20 m diffère de la grille CTX de 0,09 m
en médiane, avec un écart quadratique de 3,2 m (5ᵉ et 95ᵉ centiles : −5,8 m et
+4,6 m). Fergason et al. (2020) publient un écart médian d'environ 0,4 m entre les
deux mosaïques, un recalage vertical de 3,8 m entre modèles CTX et un décalage
horizontal moyen de 9,6 m des images CTX.

## Fichiers produits

Tous sous `apps/web/public/data/jezero/dem/`, décrits dans le manifeste.

| Jeu de données | Fichier | Contenu |
| --- | --- | --- |
| `jezero-hirise-dem` | `hirise-4m.f32` (301 576 octets) | Altitudes en mètres |
| `jezero-hirise-slope` | `hirise-4m-slope.f32` | Pentes en degrés |
| `jezero-hirise-hillshade` | `hirise-4m-hillshade.png` | Relief ombré, 253 × 298 |
| `jezero-ctx-dem` | `ctx-20m.f32` (12 240 octets) | Altitudes en mètres |
| `jezero-ctx-slope` | `ctx-20m-slope.f32` | Pentes en degrés |
| `jezero-ctx-hillshade` | `ctx-20m-hillshade.png` | Relief ombré, 51 × 60 |

- **Agrégation HiRISE.** Moyenne par blocs de 4 × 4 pixels, alignés sur l'origine du
  fichier source. À 1 m, chaque grille pèserait 4,8 Mo ; à 4 m, 0,3 Mo. Un bloc
  contenant un seul pixel sans donnée reste sans donnée.
- **Pente.** Méthode de Horn sur 3 × 3 mailles : une pente moyenne sur une base de
  8 m (HiRISE) ou de 40 m (CTX), pas la pente locale sous le pied. Sur le secteur :
  médiane 4,6°, 95ᵉ centile 20,7° et maximum 60,1° en HiRISE ; 4,6°, 16,8° et 27,6°
  en CTX. Le même escarpement paraît donc deux fois moins raide à 20 m.
- **Relief ombré.** Éclairage fictif depuis le nord-ouest (azimut 315°, hauteur 45°),
  sans exagération verticale. Image en niveaux de gris avec transparence, à étirer
  sur l'emprise du jeu de données.

### Bords, lacunes et échelles

- **Bords.** La préparation lit une maille de plus de chaque côté du secteur : les
  mailles du bord ont de vrais voisins. Si la fenêtre sortait du fichier source, la
  maille manquante resterait sans donnée et la pente du bord aussi.
- **Lacunes.** Une altitude sans donnée est `NaN` dans la grille et `null` dans
  `sampleGrid` ; elle n'est jamais 0. Une pente est `NaN` dès qu'une des neuf mailles
  utilisées manque. Les pixels correspondants du relief ombré sont transparents. Le
  jeu de données passe alors à `partial`.
- **Échelles.** L'imagerie HiRISE figée descend à 0,64 m/pixel, le relief à 4 m ou
  20 m. Le relief ombré ne montre pas les détails visibles sur l'image.

## Limites à afficher

- **La taille de maille est un pas d'échantillonnage, pas une précision.** Aucune
  incertitude absolue de position ou d'altitude n'a été validée ici. Chaque grille
  porte `raster.navigationGrade: false` ; `data:check` refuse toute autre valeur.
- **Erreur d'échantillonnage.** Une valeur est la moyenne d'une maille. Entre deux
  mailles voisines l'altitude change de 0,18 m en médiane et jusqu'à 8,6 m en HiRISE
  4 m ; de 0,85 m en médiane et jusqu'à 12,5 m en CTX 20 m. Un bloc, une marche ou
  une crevasse plus petits que la maille n'apparaissent pas.
- **Pas de praticabilité.** Une pente faible ne dit rien de la portance du sol, des
  blocs ou du sable. Un seuil de pente est un choix de scénario.
- **Lecture au plus proche.** `sampleGrid` rend la valeur de la maille qui contient
  le point, sans interpolation.

## Utilisation dans l'application

```ts
import { loadGrid, loadManifest, sampleGrid, terrainDataset } from '@marps/data';

const manifest = await loadManifest();
const dataset = terrainDataset(manifest, 'jezero', 'elevation'); // HiRISE, sinon CTX
if (dataset) {
  const grid = await loadGrid(dataset);
  const elevation = sampleGrid(grid, { longitude: 77.40617493, latitude: 18.45893136 }); // mètres ou null
}
```

`terrainDataset` préfère une grille complète à une grille trouée, puis la maille la
plus fine. Utiliser la même grille sur tout un tracé.

## Référence

Fergason, R. L. et al., 2020, *Mars 2020 Terrain Relative Navigation Flight Product
Generation: Digital Terrain Model and Orthorectified Image Mosaics*, 51st Lunar and
Planetary Science Conference, <https://www.hou.usra.edu/meetings/lpsc2020/pdf/2020.pdf>.
