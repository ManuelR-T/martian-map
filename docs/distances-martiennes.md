# Distances de mission

`mission-core` fournit `groundDistanceMetres`, `polylineDistances` et
`missionDistances`, sans dépendance cartographique. Les coordonnées sont
planétocentriques en degrés, longitude positive vers l’est, dans les bornes
[-180, 180] et [-90, 90].

Le rayon par défaut est **3 396 190 m**, le rayon équatorial utilisé par le
référentiel sphérique de la carte Jezero et les grilles de relief du manifeste.
Il ne s’agit pas du rayon moyen de Mars. Un rayon explicite en mètres peut être
fourni aux fonctions pour un autre référentiel sphérique.

La formule de haversine mesure le petit arc de grand cercle entre chaque paire
de sommets consécutifs, y compris à l’antiméridien. Chaque segment reste présent,
même de longueur nulle. `polylineDistances` ne ferme pas la polyligne.
`missionDistances` utilise la géométrie de mission : camp, étapes dans l’ordre,
puis camp. L’exploration comprend tous les segments jusqu’à la dernière étape ;
le retour est le dernier segment direct vers le camp. Le total inclut le retour
une seule fois. Sans camp ou sans étape, le résultat est `null`.

Chaque distance de segment et d’agrégat expose `metres` et `kilometres` (sans
arrondi), pour éviter les conversions implicites dans l’UI et alimenter le
budget de mission. Le relief et le retour d’urgence utilisent le même calcul.

Il s’agit d’une **distance horizontale estimée**, sans correction d’altitude,
d’obstacles ou de praticabilité. Aucun calcul 3D n’est ajouté : il nécessiterait
un profil complet, un datum vertical compatible et une résolution adaptée.

Les valeurs terrestres par défaut ne sont jamais utilisées. La documentation
[OpenLayers — ol/sphere](https://openlayers.org/en/latest/apidoc/module-ol_sphere.html)
précise que ses fonctions prennent par défaut le rayon terrestre ; le moteur
implémente ici son propre calcul avec le rayon martien explicite.
