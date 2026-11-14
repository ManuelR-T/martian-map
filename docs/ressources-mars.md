# Ressources Mars pour un prototype en 48 h

Vérification : 14 novembre 2026. Sources primaires uniquement. Aucun `AGENTS.md`/`CLAUDE.md` trouvé dans le checkout ni `AGENTS.md` dans ses parents ; README initial : `# martian-map`. Cette note porte sur les données, sans interpréter le brief du challenge.

**Choix conseillé pour cette équipe d'étudiants SWE : une carte 2D d'un petit secteur, trois fiches scientifiques et un parcours avec budget de temps aller, observations et retour.** Trek + nomenclature constituent le socle technique le mieux vérifié ici ; les noms officiels ne remplacent pas la sélection de cibles scientifiques locales. Préparer des fichiers locaux pour la démo ; garder CTX/HiRISE comme enrichissements ciblés. SWIM est une ressource complémentaire, à utiliser seulement si la région et l'objectif scientifique s'y prêtent.

## Six ressources prioritaires

### 1. NASA Mars Trek — fond cartographique immédiatement exploitable

[Portail](https://trek.nasa.gov/mars/) · [Documentation WMTS](https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars) · [Capabilities MOLA colorisé](https://trek.nasa.gov/tiles/Mars/EQ/Mars_MGS_MOLA_ClrShade_merge_global_463m/1.0.0/WMTSCapabilities.xml) · [Tuile JPEG testée](https://trek.nasa.gov/tiles/Mars/EQ/Mars_MGS_MOLA_ClrShade_merge_global_463m/1.0.0/default/default028mm/0/0/0.jpg).

- **Format/usage :** WMTS REST, images JPEG pour cette couche ; fond de relief colorisé dérivé de MOLA à 463 m/pixel. URL adaptable : `…/default/default028mm/{z}/{y}/{x}.jpg`.
- **Accès testé :** GET du XML et de la tuile → HTTP 200 ; signature JPEG valide ; `Access-Control-Allow-Origin: *` sur les deux réponses avec `Origin: http://localhost:5173`. Pas de clé demandée pour ces requêtes.
- **Limites :** grille mondiale de 2 × 1 tuiles au niveau 0, origine −180°, +90° ; ce n'est pas la grille Web Mercator habituelle. Configurer explicitement projection et matrice à partir du XML. Ce JPEG fournit une représentation, pas des altitudes numériques. Le portail répond en HTML, mais son fonctionnement interactif complet n'a pas été testé.

### 2. MOLA / USGS — altitudes numériques et relief régional

[Fiche USGS](https://astrogeology.usgs.gov/search/map/mars_mgs_mola_dem_463m) · [GeoTIFF direct annoncé](https://planetarymaps.usgs.gov/mosaic/Mars_MGS_MOLA_DEM_mosaic_global_463m.tif).

- **Format/usage :** DEM GeoTIFF mondial, environ 2 Go selon la fiche ; 128 pixels/degré, soit 463 m/pixel à l'équateur. Prétraiter une petite région en altitudes simplifiées et ombrage avec un outil SIG ; servir seulement ces dérivés dans l'application.
- **Limites scientifiques :** altitude référencée à l'aréoïde ; incertitude verticale totale annoncée d'au moins ±3 m. Interpolation entre traces, avec des lacunes atteignant 12 km à l'équateur ; couverture polaire clairsemée. Une pente calculée ici décrit le relief régional et ne valide pas la praticabilité d'un trajet.
- **Accès :** le GET partiel du GeoTIFF a renvoyé **403 depuis cet environnement**. La fiche documente le produit, mais le téléchargement n'est pas validé. Ne pas rendre le MVP dépendant de ce fichier : repli sur le fond Trek, sans valeur d'altitude inventée.

### 3. SWIM — indices de glace enfouie, avec profondeur et incertitude

[Projet PSI et produits](https://swim.psi.edu/) · [Article des auteurs, 2025](https://doi.org/10.3847/PSJ/ad9b24) · [Publication initiale et formats](https://www.nature.com/articles/s41550-020-01290-z) · [Carte NASA/JPL et légende](https://www.jpl.nasa.gov/images/pia26045-swim-map-shows-subsurface-water-ice-on-mars/) · [JPEG de présentation](https://d2pn8kiwq2w21t.cloudfront.net/original_images/PIA26045.jpg).

- **Format/usage :** produits SIG GeoTIFF et images de consultation documentés par les auteurs. L'article 2025 décrit des cartes à 20 pixels/degré, environ 3 km/pixel à l'équateur, pour les intervalles 0–1 m, 1–5 m et >5 m. Utiliser une version identifiée pour expliquer les indices favorables à la glace sur une fiche de région.
- **Limites :** l'indice de cohérence avec la présence de glace n'est ni une probabilité calibrée, ni une quantité d'eau extractible, ni une profondeur exacte. Les sources et zones couvertes diffèrent ; des cartes masquent les altitudes ≥1 km. Ne pas confondre absence de données et absence de glace.
- **Accès :** PSI renvoie 403 via requête directe et échoue via lecture web ; aucun GeoTIFF SWIM téléchargé. La page JPL et son JPEG sont accessibles via l'outil web. Son lien vers `ammos.nasa.gov/marswatermaps/` renvoie 404. **Repli 48 h :** fiche illustrée et sourcée ; le JPEG de communication n'est pas validé comme raster géoréférencé, donc pas de superposition quantitative automatique.

### 4. CTX / Murray Lab — contexte visuel à 5 m/pixel

[Source Caltech et documentation](https://murray-lab.caltech.edu/CTX/) · [Répertoire des tuiles V01](https://murray-lab.caltech.edu/CTX/V01/tiles/) · [Formats décrits par l'USGS](https://astrogeology.usgs.gov/search/map/mars-mro-ctx-global-mosaic-murray-lab-v1).

- **Format/usage :** mosaïque V01 en GeoTIFF dans des archives ZIP par secteurs de 4° × 4°, avec informations de raccordement. Échantillonnage à 5 m/pixel, couverture de 99,5 % entre 88°S et 88°N. Choisir un seul secteur pour illustrer cratères, dunes ou vallées.
- **Limites :** images de dates différentes ; raccords et trous possibles. Caltech annonce des erreurs de position absolue inférieures à 200 m : 5 m/pixel ne signifie pas une localisation à 5 m. Pas de relief numérique déduit directement de la luminance.
- **Accès :** documentation primaire retrouvée dans l'index web ; accès HTTPS direct Caltech en échec de validation de certificat dans cet environnement. Archives et service de diffusion non testés ; aucune promesse d'API, de CORS ou d'intégration immédiate. Crédit demandé : NASA/JPL/MSSS/The Murray Lab.

### 5. HiRISE — une ou deux observations détaillées

[Catalogue de l'équipe](https://www.uahirise.org/catalog/) · [Observation exemple ESP_018747_2065](https://www.uahirise.org/ESP_018747_2065) · [JPEG direct testé](https://hirise-pds.lpl.arizona.edu/PDS/EXTRAS/RDR/ESP/ORB_018700_018799/ESP_018747_2065/ESP_018747_2065_RED.browse.jpg).

- **Format/usage :** JPEG de consultation ; JPEG2000 scientifique et étiquettes PDS accessibles depuis la fiche. Pour cet exemple : image originale à 30,6 cm/pixel, reprojetée à 25 cm/pixel ; objets résolus d'environ 92 cm selon l'équipe. Utiliser une vignette locale et un lien vers l'observation, choisie dans la région du projet.
- **Limites :** couverture par observations ciblées ; le JPEG réduit ne conserve pas la résolution scientifique. Lire échelle, date et projection de chaque produit. L'image seule ne fournit pas une mesure de pente.
- **Accès testé :** fiche et JPEG HTTP 200 ; JPEG de 2,35 Mo vérifié. Le serveur renvoie `Access-Control-Allow-Origin: https://pds-imaging.jpl.nasa.gov`, pas l'origine locale : ne pas compter sur un `fetch` ou une lecture canvas depuis notre application. Télécharger au préalable et servir localement. JP2 non téléchargé.

### 6. Nomenclature IAU / USGS — recherche et lieux cliquables

[Catalogue et conventions](https://planetarynames.wr.usgs.gov/GIS_Downloads) · [Shapefile ZIP Mars](https://asc-planetarynames-data.s3.us-west-2.amazonaws.com/MARS_nomenclature_center_pts.zip) · [KMZ Mars](https://asc-planetarynames-data.s3.us-west-2.amazonaws.com/MARS_nomenclature_center_pts.kmz).

- **Format/usage :** points centraux des formations nommées ; archives générées chaque nuit. Convertir une sélection en petit JSON local pour recherche, marqueurs et fiches ; conserver identifiant, nom officiel et coordonnées.
- **Accès testé :** téléchargement complet HTTP 200 ; ZIP de 5,42 Mo contenant `.shp/.shx/.dbf/.prj`, KMZ de 2,62 Mo contenant KML et métadonnées. Aucun en-tête CORS reçu pour l'origine locale : préparation hors navigateur conseillée.
- **Limites :** positions centrales, pas contours ni lieux d'atterrissage sûrs. La page précise longitude est et latitude planétocentrique ; vérifier les fichiers de projection et harmoniser 0–360° / −180–180° avec les autres couches.

## Stratégie minimale 48 h — proposition de réalisation

1. **H0–H4 :** fixer un petit secteur, vérifier la superposition d'un lieu connu et du fond Trek. Préparer un fond local de secours et trois cibles scientifiques sourcées. Si le calage des tuiles prend trop de temps, utiliser une image équirectangulaire locale avec marqueurs.
2. **H4–H16 :** carte 2D, sélection des étapes, fiches avec source, échelle, date et limites. Un clic doit expliquer ce que les données permettent réellement d'affirmer.
3. **H16–H28 :** parcours préparé ou dessiné, distances et budget de temps incluant les observations et le retour. Afficher les hypothèses réglables de vitesse et de durée ; utiliser une projection et des distances adaptées à Mars. Intégrer CTX ou un DEM numérique seulement si un extrait a effectivement été récupéré et vérifié.
4. **H28–H40 :** relier les étapes à une question scientifique et ajouter quelques images au sol ou orbitales contextualisées. Démontrer comment ajouter une étape modifie la marge de retour. Un éventuel calcul de chemin selon la pente reste conditionné à un DEM local exploitable. Éviter un score opaque de « survie » ou une garantie de trajet sûr.
5. **H40–H48 :** tester les fichiers locaux, les coordonnées, les états « inconnu » et les liens ; préparer une démo courte. Ne pas consacrer le sprint à une mosaïque mondiale CTX, au décodage JP2 côté client ou à une 3D globale.

**Portée des vérifications :** requêtes HTTP et inspection des formats/en-têtes, sans session de navigateur. Les en-têtes CORS observés constituent une indication concrète pour les URL testées, pas une validation de l'application ni des autres couches. Les erreurs rapportées sont celles de cet environnement ; elles ne démontrent pas une indisponibilité universelle.
