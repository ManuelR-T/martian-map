# Atlas mondial intégré

Ajout du 15 novembre 2026. Sources et choix scientifiques détaillés dans
[la recherche initiale](ressources-mars-global.md).

## Fichiers et préparation

`apps/web/public/atlas/manifest.json` est le manifeste indépendant de l’atlas.
Il conserve les URL effectivement acquises, dates, empreintes SHA-256 des
réponses et des fichiers dérivés, dimensions, emprises et transformations.
Il ne modifie pas les capacités du secteur de mission du manifeste Jezero.

Depuis l’environnement Python de `tools/data` (Pillow, déjà déclaré) :

```sh
python tools/data/prepare_atlas.py
```

Le serveur ASU présentait une chaîne TLS incomplète à l’acquisition. Une
exception ponctuelle a été utilisée pour ce seul téléchargement public TES,
explicitement enregistrée par `tlsVerified: false` dans le manifeste. Pour
reproduire cette acquisition dans le même environnement :

```sh
python tools/data/prepare_atlas.py --allow-insecure-tes
```

Cette option ne concerne ni HRSC ni les polygones géologiques. Aucun accès
réseau n’est nécessaire au build ou à l’utilisation de l’atlas installé.
Les assertions du préparateur vérifient dimensions, référentiel natif et
pagination complète. `pnpm test` vérifie aussi les empreintes des fichiers figés.

## Transformations et portée

- **HRSC** : aperçu JPEG équirectangulaire fourni par l’équipe ESA/DLR/FU Berlin,
  1 280 × 640, sans retouche colorimétrique. Le GeoTIFF original fait environ
  683 Mo : seuls ses 65 536 premiers octets ont été acquis avec HTTP Range
  pour lire dimensions, pas et ancrage géographique. L’empreinte de cette
  réponse concerne ce fragment, pas le GeoTIFF complet. Rayon source
  3 396 000 m, projection équirectangulaire centrée à 0° ; emprise convertie en
  degrés à partir des métadonnées. Échantillonnage livré : 16 671,875 m/pixel à
  l’équateur. Les marges débordant légèrement ±180°/±90° viennent du raster
  d’origine ; la vue conserve les limites martiennes habituelles.
- **Géologie** : USGS SIM 3292, Tanaka et al. (2014), 1:20 000 000. Distribution
  accessible par Esri StoryMaps (`dasbury_storymaps`), et non téléchargement
  direct USGS (403 dans cet environnement). Tous les 1 311 objets ont été
  récupérés en deux pages, avec unités, descriptions originales, géométries
  et palette de la distribution. Référentiel natif WKID 104971, Mars 2000
  sphérique en degrés ; aucune conversion terrestre. Simplification serveur
  à 0,08°, arrondi des coordonnées à quatre décimales. Ces frontières
  généralisées servent à la lecture régionale ; les couleurs ne codent pas
  un score de sécurité. La description de l’unité sélectionnée est la légende
  au point lu. Pas de traduction ni de réinterprétation automatique des âges.
- **TES** : PNG WMS ASU à 2 880 × 1 440, longitude −180° à +180°, latitude
  planétocentrique. Recadrage des lignes 240 à 1 200 pour limiter strictement
  l’affichage à ±60° ; pas d’extrapolation aux pôles. Image conservée en RGBA,
  sans transformation de palette ni lissage. Légende qualitative conforme à
  l’image de référence ASU : violet faible, blanc fort. Aucune valeur numérique
  n’est reconstruite depuis les couleurs. Crédit NASA MGS/TES, ASU,
  Christensen et al. (2001).
- **Mars24** : calculs purs TypeScript dans `mission-core`, contrôlés avec les
  deux exemples publiés par NASA GISS (2000 et atterrissage Spirit 2004).
  Longitudes est positives ; résultats cycliques LMST/LTST et `Ls`. Table
  TAI−UTC applicable de 2000 à 2026, dont les changements de 2006, 2009, 2012,
  2015 et 2017. Aucune seconde supplémentaire fin 2026 selon
  [USNO / IERS Bulletin C](https://maia.usno.navy.mil/products/leap-second).
  Hors plage : indisponible, pas de prolongation silencieuse de la table.
- **MCD** : liens vers documentation et interface officielle LMD. La base
  complète demande une inscription ; aucun scénario ni fichier NetCDF acquis,
  aucune météo en direct ou valeur climatique affichée dans l’application.

## Validation

Tests des exemples NASA, des limites temporelles et longitudes, intégrité des
fichiers, lecture OpenLayers des polygones dans leur référentiel Mars, coordonnées
et attributs, activation des couches, lecture géologique au centre au clavier et
nettoyage des abonnements. Le build de production inclut l’atlas dans le précache
versionné de la PWA. L’affichage et les interactions sur navigateur et matériel
réels restent à valider ; les tests de composants n’établissent pas cette recette.
