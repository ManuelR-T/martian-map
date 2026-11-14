# Marswalk Planner — fonctionnalités et données vérifiées

Vérification du 14 novembre 2026. Équipe d'étudiants SWE, prototype en deux jours. **Les données nécessaires au MVP sont disponibles et des échantillons sont conservés dans le dépôt.** Cela ne signifie pas que les fonctionnalités ou leur intégration navigateur sont déjà réalisées.

## Périmètre recommandé

Un petit secteur du front du delta de Jezero ; trois arrêts : Skinner Ridge, Wildcat Ridge et Amalik. Le départ représente un camp fictif posé par l'utilisateur. Les coordonnées des prélèvements proviennent de NASA, les activités proposées aux astronautes et leur durée sont des choix du scénario.

P0 = socle de démonstration ; P1 = après le socle ; P2 = extension.

| Priorité | Fonctionnalité et résultat attendu | Données et état |
| --- | --- | --- |
| P0 | Carte 2D : zoom, déplacement, repères | HiRISE de Jezero via NASA Trek ; XML et trois tuiles PNG téléchargés et décodés. Les deux tuiles couvrant les trois arrêts sont non transparentes. |
| P0 | Choisir le camp de départ | Clic utilisateur dans le secteur ; position fictive explicitement indiquée. Pas besoin d'une base humaine réelle. |
| P0 | Afficher trois arrêts scientifiques | GeoJSON NASA des prélèvements téléchargé ; noms, coordonnées, échantillons et types de roche inspectés. Sources JPL pour leur intérêt scientifique. |
| P0 | Ajouter, supprimer et réordonner les arrêts | État de l'application ; aucune donnée externe supplémentaire. |
| P0 | Tracer un parcours incluant le retour | Polyligne dessinée ou scénario préparé. Trace historique du rover disponible comme contexte, sans qualification de chemin piéton. Ne pas présenter les segments reliant des points comme un chemin praticable calculé. |
| P0 | Calculer la distance totale | Coordonnées et rayon martien. Mesurer la polyligne entière, avec le retour ; ne pas utiliser le rayon terrestre par défaut. |
| P0 | Régler la durée de mission, la vitesse et les temps d'observation | Paramètres du scénario, pas des mesures NASA de déplacement humain. Aucune calibration physiologique validée dans ce travail. |
| P0 | Afficher temps de marche, temps d'observation, retour et marge | Calcul déterministe à partir du parcours et des paramètres ; réserve explicite, comptée une seule fois. |
| P0 | Alerter sur un dépassement et recalculer après chaque modification | État calculé ; signifie dépassement du budget choisi, pas prédiction de survie. |
| P0 | Fiche de chaque arrêt : intérêt, activité proposée, source | Faits sourcés dans NASA/JPL ; activités et durées rédigées par l'équipe. Les photos doivent être associées à leur vrai lieu/date. |
| P0 | Distinguer observations, calculs et hypothèses | Provenance de chaque donnée, échelle/résolution et date ; conserver le statut inconnu. |
| P1 | Relief et profil d'altitude du parcours | Grilles d'altitude et de pente figées : DEM HiRISE agrégé à 4 m, DEM CTX 20 m en repli ; les trois arrêts tombent sur des mailles valides. Voir [relief-jezero.md](relief-jezero.md). |
| P1 | Couche infrarouge nocturne et explication | Mosaïque THEMIS Mars Odyssey à 100 m/pixel ; une tuile couvrant le secteur téléchargée et décodée. Contrastes historiques, pas température actuelle en degrés. |
| P1 | Sauvegarder/recharger et exporter une fiche de mission | JSON local et fiche imprimable à partir de l'état de l'application. |
| P1 | Démonstration hors ligne sur le secteur choisi | Figer les fichiers nécessaires ; le DEM est conservé, mais seules quelques tuiles ont été téléchargées. Constituer le cache complet aux zooms choisis et le tester. |
| P2 | Proposer un chemin selon les pentes | Grilles de pente disponibles (4 m et 20 m), mais il faut construire une grille de coût, fixer des seuils de scénario, tester les obstacles et traiter les lacunes. Même à 4 m, le DEM ne décrit pas chaque obstacle. |

## Sources et preuves d'accès

### Imagerie HiRISE : disponible

[Catalogue NASA Trek](https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars).

Couche : `JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd`.

- [Configuration WMTS](https://trek.nasa.gov/tiles/Mars/EQ/JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd/1.0.0/WMTSCapabilities.xml) récupérée intégralement via HTTP 206.
- Tuiles `12/1627/5857.png` et `12/1628/5857.png` : HTTP 200, images 256 × 256 décodées, couverture des trois points vérifiée par la grille WMTS.
- En-tête `Access-Control-Allow-Origin: *` observé avec une origine locale.
- Grille équirectangulaire martienne, 2 × 1 tuiles au niveau 0 ; configurer le système de coordonnées et les distances. L'échantillonnage des tuiles dépend du zoom, même si le produit source est à 25 cm/pixel.

### Altitudes CTX : disponibles, fichier intégral conservé

[Fiche USGS](https://astrogeology.usgs.gov/search/map/mars_2020_terrain_relative_navigation_ctx_dtm_mosaic) · [GeoTIFF direct](https://planetarymaps.usgs.gov/mosaic/mars2020_trn/CTX/JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0.tif).

- HTTP 200, 9 662 387 octets ; GeoTIFF réellement décodé avec `tifffile`.
- 1 596 colonnes × 1 512 lignes ; valeurs float32 ; pas de 20 m ; toutes les cellules lues sont finies et aucune ne contient la valeur NoData déclarée.
- Projection équirectangulaire, sphère Mars 2000 de rayon 3 396 190 m, méridien central et parallèle standard à 0°.
- Emprise calculée à partir du GeoTIFF : environ 77,1605–77,6990°E et 18,2110–18,7212°N. Elle contient les trois arrêts.
- Des valeurs d'altitude ont été lues aux trois coordonnées. Ce contrôle d'emprise n'est pas une validation indépendante du recalage horizontal ou du datum vertical des sources. Pour le profil, utiliser le même DEM sur tout le tracé, sans mélanger ses valeurs et les altitudes des prélèvements.
- Un pas de grille de 20 m ne permet pas d'affirmer qu'un sentier est praticable à pied.

La précédente note ne validait pas le téléchargement de MOLA global. Ce résultat porte sur un **autre produit : un DEM local CTX de Jezero**, maintenant téléchargé et inspecté.

### Arrêts et parcours : disponibles

[Prélèvements NASA](https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_SAMPLE_v3.json) · [Positions](https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_waypoints.json) · [Trace](https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_traverse.json).

Les trois réponses HTTP 200 ont été décodées. Des extraits sont conservés dans `data/research/`. Voir [le contrôle détaillé des sites](verification-sites-jezero.md) pour les coordonnées et les sources scientifiques. Les arrêts sont dans un diamètre géométrique d'environ 555 m ; cette valeur n'est pas la longueur d'un itinéraire.

Le segment historique conservé ne relie pas les trois arrêts. Il faut préparer le parcours du scénario ; il ne doit pas apparaître automatiquement comme une route humaine validée.

### Infrarouge THEMIS : affichage disponible

Couche du [catalogue NASA Trek](https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars) : `THEMIS_NightIR_ControlledMosaics_100m_v2_oct2018`, mission Mars Odyssey, mosaïque nocturne à 100 m/pixel.

Configuration WMTS et tuile `9/203/732.png` récupérées, tuile HTTP 200, PNG 256 × 256 décodé, opaque et non uniforme, CORS `*`. Le fichier est conservé avec son URL exacte dans le manifeste. Ces niveaux de gris ne sont pas une série de températures en degrés. Le catalogue explique que les contrastes nocturnes renseignent notamment sur les différences d'inertie thermique ; utiliser la couche comme contexte scientifique.

### Géologie détaillée : produit identifié, préparation supplémentaire

[USGS SIM 3464](https://pubs.usgs.gov/publication/sim3464) · [README](https://pubs.usgs.gov/sim/3464/sim3464_readme.txt) · [Archive SIG](https://pubs.usgs.gov/sim/3464/sim3464_database.zip).

README récupéré (HTTP 200) ; répertoire central du ZIP inspecté par requête partielle (HTTP 206). L'archive de 349 336 873 octets contient une géodatabase et des rasters ; téléchargement complet et conversion non effectués. Le README indique des décalages aléatoires d'environ 100–200 m par rapport à la mosaïque opérationnelle contrôlée. À conserver en extension : ne pas supposer un calage précis avec chaque prélèvement.

## Modèle minimal de durée

Toutes les durées sont en minutes et les distances en kilomètres ; la vitesse est en km/h.

```text
marche = 60 × distance du parcours complet / vitesse choisie
observations = somme des durées choisies à chaque arrêt
marge = durée disponible − marche − observations − réserve choisie
```

Le parcours complet inclut le retour au camp. Le retour est affiché séparément dans l'interface mais n'est pas soustrait deux fois. Si un arrêt est supprimé, recalculer aussi le parcours et sa distance. Les durées d'observation permettent de démontrer un dépassement même sur ce petit secteur.

L'indicateur reste « marge selon les hypothèses ». Oxygène, dose de radiation, météo locale actuelle et probabilité de survie ne font pas partie du modèle vérifié.

## Artefacts et prochaine étape

- `data/research/jezero-ctx-dem-20m.tif` : vrai raster source, environ 9,7 Mo.
- `data/research/jezero-hirise-wmts.xml` et `jezero-hirise-*.png` : configuration et trois tuiles source.
- `data/research/jezero-themis-night-*.png` : une tuile infrarouge.
- `data/research/perseverance-*-extrait.json` : trois petits extraits NASA.
- [Manifeste des contrôles](../data/research/marswalk-data-verification.json) : URLs, tailles, empreintes SHA-256, formats et couverture des sites.

Prochain jalon de développement : superposer les trois points au fond HiRISE dans le navigateur, puis faire varier un temps d'observation et vérifier le recalcul de la marge. Aucun rendu navigateur, calculateur applicatif ou test hors ligne complet n'a été réalisé pendant cette vérification des données.
