# Vérification des sites et du parcours de Perseverance

Vérification du 14 novembre 2026, par téléchargements publics sans compte ni clé et décodage JSON. **Oui : coordonnées, trace du rover et trois sites scientifiques proches sont récupérables.** Cela suffit pour une démonstration de Marswalk Planner ; ces données ne valident aucun itinéraire humain. Imagerie et DEM restent hors de cette vérification.

## Accès réellement inspectés

La [page NASA demandée](https://science.nasa.gov/mission/mars-2020-perseverance/location-map/) répond HTTP 200, `text/html`. Son iframe pointe vers <https://mars.nasa.gov/map/>, qui redirige vers <https://mars.nasa.gov/maps/location/?mission=M20&site=NOW> (200, HTML).

Le [JavaScript de l'application](https://mars.nasa.gov/build/static/js/main.8434bd16.chunk.js) répond 200, `application/javascript`. Il révèle l'endpoint [configuration M20](https://mars.nasa.gov/maps/location/api/configure/get?mission=M20) : 200, `application/json; charset=utf-8`, 7 640 octets. Les URL ci-dessous sont celles de ses couches, pas des chemins devinés.

| Couche et URL exacte | Réponse GET et contenu décodé |
| --- | --- |
| [Rover Waypoints](https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_waypoints.json) | 200, `application/json`, 603 126 octets ; GeoJSON `FeatureCollection`, 708 `Point`, sols 13 à 2022 |
| [Rover Drive Path](https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_traverse.json) | 200, `application/json`, 1 723 218 octets ; 559 `LineString` |
| [Sampling Locations](https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_SAMPLE_v3.json) | 200, `application/json`, 11 389 octets ; 22 `Point`, dont les trois sites ci-dessous |
| [Sample Depot Zone](https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_TF_Sample_Depot.json) | 200, `application/json`, 1 453 octets ; un `Polygon`, pas un arrêt ponctuel nommé |

Les positions portent notamment `sol`, `RMC`, `site`, `drive`, `lon`, `lat`, `elev_geoid`, `dist_total_m` et parfois `images`. Les segments portent `sol`, `fromRMC`, `toRMC`, `length` et leurs sommets. Les prélèvements associent directement `outcrop_name`, `sample_name`, `sample_location`, `rock_type` et coordonnées : aucune géolocalisation à partir d'une photographie n'est nécessaire.

Un GET supplémentaire des prélèvements avec `Origin: http://localhost:3000` retourne 200 et `Access-Control-Allow-Origin: *` (sans Origin, cet en-tête était absent). CORS vérifié uniquement sur cette ressource ; aucun navigateur applicatif testé. Pour le hackathon, servir une copie locale figée réduit la dépendance au service distant.

## Trois arrêts scientifiques sourcés

Coordonnées recopiées de `M20_SAMPLE_v3.json`, dans l'ordre **longitude, latitude**, en degrés sur Mars. Ce sont les points de prélèvement publiés par la carte, pas des centres calculés d'affleurements ni des positions humaines.

| Site | Longitude | Latitude | Description scientifique et source |
| --- | --- | --- | --- |
| Skinner Ridge | 77.40617493 | 18.45893136 | Roches sédimentaires stratifiées du delta, étudiées après abrasion ; prélèvements Swift Run et Skyland. [JPL, 15/09/2022](https://www.jpl.nasa.gov/news/nasas-perseverance-rover-investigates-geologically-rich-mars-terrain/) et [catalogue NASA](https://science.nasa.gov/mission/mars-2020-perseverance/mars-rock-samples/). |
| Wildcat Ridge | 77.40588851 | 18.45863707 | Roche interprétée comme un dépôt de boue et sable fin en milieu lacustre. JPL rapporte des signaux organiques associés spatialement aux sulfates ; cela ne démontre pas une origine biologique. Prélèvements Hazeltop et Bearwallow. [JPL, 15/09/2022](https://www.jpl.nasa.gov/news/nasas-perseverance-rover-investigates-geologically-rich-mars-terrain/). |
| Amalik | 77.40144029 | 18.45072631 | Roche sédimentaire fine contenant des argiles, intéressante pour son potentiel de conservation de biosignatures ; prélèvements Shuyak et Mageik. [JPL, transcription du 02/08/2023](https://www.jpl.nasa.gov/videos/meet-the-mars-samples-shuyak-and-mageik-samples-14-and-15/). |

Les trois points tiennent dans un diamètre d'environ **555 m**, calculé ici par haversine à partir de leurs coordonnées avec le rayon de 3 396 190 m fourni par la configuration NASA. C'est une proximité géométrique, pas une longueur de chemin praticable.

## Petit échantillon conservé

Dans `data/research/`, trois extraits totalisant 5 572 octets :

- [perseverance-sites-extrait.json](../data/research/perseverance-sites-extrait.json) : les trois objets dont `outcrop_name` vaut Skinner Ridge, Wildcat Ridge ou Amalik, extraits de `M20_SAMPLE_v3.json`.
- [perseverance-waypoints-extrait.json](../data/research/perseverance-waypoints-extrait.json) : trois positions `RMC` 26_1004, 26_1154 et 26_1222, extraites de `M20_waypoints.json`.
- [perseverance-traverse-extrait.json](../data/research/perseverance-traverse-extrait.json) : segment du sol 501, de 26_1004 à 26_1154, avec ses 20 sommets, extrait de `M20_traverse.json`.

Les objets `Feature` sont copiés textuellement des réponses téléchargées, sans réécriture de leurs champs ou nombres. Seule la liste `features` est réduite ; les autres métadonnées de collection sont conservées. Décodage JSON et égalité avec les objets sources vérifiés. Le segment fourni n'est pas un parcours reliant les trois sites ; les positions rover sont distinctes des points de prélèvement.

Reproduction minimale d'un accès, sans authentification :

```sh
curl --fail --location -H 'Origin: http://localhost:3000' \
  'https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_SAMPLE_v3.json'
```

## Limites et travail restant pour le MVP

- **Référentiel :** le parcours déclare `urn:ogc:def:crs:OGC:1.3:CRS84`, mais la configuration utilise un rayon martien. Ne pas appliquer les distances terrestres par défaut d'une bibliothèque cartographique. La troisième coordonnée des positions correspond à `elev_geoid` ; le datum vertical des prélèvements n'est pas documenté dans leur fichier. Aligner avec le DEM avant de calculer relief et pentes.
- **Curation :** les trois associations nom/coordonnées sont explicites. Restent la rédaction des fiches, les durées d'observation choisies par l'équipe et le rattachement des arrêts au graphe de parcours. Ne pas fusionner automatiquement un prélèvement avec le waypoint le plus proche. Les liens `images` des waypoints sont conservés bruts, sans test d'accès ni association avec ces trois sites.
- **Métadonnées :** certaines valeurs appellent un contrôle avant extension à tout le catalogue : Turquoise Bay et Hans Amundsen Memorial Workspace ont les mêmes `lon/lat` malgré des `easting/northing` différents ; Gallants a une date et un sol `TBD`. Ne pas corriger silencieusement le fichier brut. Distinguer aussi collecte et scellement : pour Mageik, le JSON donne le sol 579 alors que le catalogue NASA indique explicitement « Sol Sealed: 619 ».
- **Features possibles en 48 h :** sélection départ/arrêts, affichage de la trace historique, fiches scientifiques sourcées, estimation durée et marge de retour sous hypothèses explicites de vitesse et temps d'arrêt. Les données inspectées ne fournissent ni réseau piéton validé, ni vitesse humaine, ni durée scientifique, ni garantie de retour sûr. Le relief dépend de la vérification DEM du parent.

Sources scientifiques JPL lues via l'outil Web ; les essais directs Python/curl sur ces deux pages JPL échouent localement sur la vérification du certificat TLS (`self signed certificate in certificate chain`), sans désactivation de cette vérification. Le catalogue NASA a également été téléchargé directement (200, HTML). Les téléchargements JSON NASA ci-dessus ont réussi avec vérification TLS active. Aucune exhaustivité ni pérennité des endpoints n'est garantie par ce contrôle ponctuel. Aucun commit effectué.
