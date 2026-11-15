# Marswalk Planner : météo et dangers

Contrôle du 14 novembre 2026. Extension proposée au périmètre, sans implémentation de l'interface.

## Recommandation pour 48 heures

Ajouter un panneau de conditions historiques MEDA, une alerte de pente calculée et un événement scénarisé qui force à revoir la mission. Distinguer explicitement « mesuré », « calculé » et « simulé ».

| Fonctionnalité | Donnée | État et limite |
| --- | --- | --- |
| Température et pression au cours d'un sol choisi | MEDA, Perseverance | Produits du sol 500 accessibles, extraits CSV et labels XML téléchargés et décodés. Mesures au rover, pas une carte météo sur chaque point du parcours. |
| Vent et direction | Archives MEDA | Publié du sol 36 au sol 315 seulement, puis capteur endommagé ([notes de version MEDA](https://atmos.nmsu.edu/PDS/data/PDS4/Mars2020/mars2020_meda/document/meda_release_notes.txt)). Le sol 500 n'a que des fichiers bruts : affiché « non publié ». Détail plus bas. |
| Pente dépassant une limite choisie | Grilles de pente HiRISE 4 m et CTX 20 m ([relief-jezero.md](relief-jezero.md)) | Pente moyenne sur 3 × 3 mailles ; seuil du scénario, pas limite validée d'une combinaison spatiale. Les petits obstacles restent non résolus. |
| Zones à examiner : dunes, blocs, escarpements | Imagerie HiRISE déjà accessible | Annotation manuelle sourcée possible. Une image ne mesure pas la portance du sol et ne suffit pas à certifier un danger. |
| Retard et réserve de retour insuffisante | Calculateur de mission | Recalcul des temps à partir des paramètres ; aucune donnée supplémentaire. |
| Poussière, visibilité réduite | MEDA RDS/SkyCam documentés, ou scénario explicite | Aucune série de visibilité ni règle de conversion en mètres n'a été validée. Pour la démo, événement simulé avec impact paramétré sur la durée. |
| Alerte radiative | Curiosity RAD pour le contexte scientifique | Mesures à Gale, pas au site de Jezero. Utiliser une fiche ou un événement simulé, pas une dose personnelle calculée ni une carte locale mesurée. |

## Vérification concrète MEDA

[Portail PDS MEDA](https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/PERSEVERANCE/meda.html) · [README du bundle](https://atmos.nmsu.edu/PDS/data/PDS4/Mars2020/mars2020_meda/readme.txt).

- [Températures, sol 500](https://atmos.nmsu.edu/PDS/data/PDS4/Mars2020/mars2020_meda/data_calibrated_env/sol_0420_0539/sol_0500/WE__0500___________CAL_ATS_________________P01.CSV) : HTTP 206, 65 536 octets lus sur 2 518 142 ; label XML HTTP 200. Champs SCLK, LMST, LTST et cinq températures locales en kelvins, à différentes positions sur le rover.
- [Pression, sol 500](https://atmos.nmsu.edu/PDS/data/PDS4/Mars2020/mars2020_meda/data_derived_env/sol_0420_0539/sol_0500/WE__0500___________DER_PS__________________P01.CSV) : HTTP 206, 65 536 octets lus sur 1 687 719 ; label XML HTTP 200. Pression en pascals, horodatages et transducteur.
- Les 100 premières lignes complètes de chacun, les deux labels et un manifeste sont conservés dans `data/research/meda/`. Ce sont des échantillons d'accès, pas une journée complète nettoyée ou une synthèse météo validée.
- Pour la future interface : télécharger les CSV complets du sol retenu, consulter les notes de qualité, gérer les valeurs absentes/invalides, choisir explicitement le capteur thermique, convertir K en °C et conserver l'heure martienne. Ne pas moyenner automatiquement les cinq capteurs.
- Une anomalie du label pression inspecté attribue l'unité `kelvin` au champ d'incertitude, alors que la pression elle-même est correctement décrite en `pascal`. Ce champ est vide dans le premier enregistrement ; ne pas l'exploiter comme une incertitude validée sans clarification.
- Le README signale des lacunes de mesure et des restrictions de qualité. Une colonne dérivée vide ne doit pas être remplacée arbitrairement par une valeur calibrée. Les archives consultées ne constituent pas une API de prévision ou une garantie de temps réel.

## Vent MEDA (#27)

Inventaire de l'archive PDS, vérifié le 2026-11-15 :

- **Produits :** `CAL_WS` (calibré, une valeur par mât) et `DER_WS` (dérivé, une seule vitesse et direction, le meilleur mât retenu, données parasites filtrées). Versions `P01`, et `P02` pour les sols retraités (310 à 315 par exemple).
- **Période :** du sol 36 (avant, le capteur était en réglage) au sol 315. Après, les [notes de version](https://atmos.nmsu.edu/PDS/data/PDS4/Mars2020/mars2020_meda/document/meda_release_notes.txt) indiquent que le capteur a été endommagé par la météo et qu'une recalibration est en cours ; c'est toujours le cas dans la livraison 16 (sols 1740 à 1859). Dossiers vérifiés un par un autour du sol 315, puis un sol sur 15 jusqu'au sol 1845.
- **Colonnes de `DER_WS` :** `HORIZONTAL_WIND_SPEED` en m/s, `VERTICAL_WIND_SPEED` en m/s (vide au sol 300), `WIND_DIRECTION` en degrés dans le sens horaire depuis le nord, incertitudes (vides au sol 300), `BOTH_BOOMS_USED_FOR_RETRIEVAL` (un ou deux mâts), `ROVER_STILL` (0 = rover en mouvement). La valeur invalide est `999999999` (9 chiffres), différente de la sentinelle `9999999999` du README.
- **Qualité :** le README écarte le vent avant le sol 36. Les notes de version signalent que toutes les données d'un mât (vitesse comprise) sont fausses quand le vent sort de sa plage de mesure ; `DER_WS` retient le meilleur mât.
- **Choix :** les conditions affichées restent celles du sol 500 (#23). Entre les sols 36 et 315, le rover n'est jamais dans le secteur Jezero de l'application (au plus près à 1,8 km, sol 200) ; il y entre au sol 409. Aucun autre sol n'est substitué : le vent s'affiche « non publié », avec le lien vers les notes de version.
- **Fichiers bruts :** le sol 500 a encore `ESD_WS1` et `ESD_WS2` dans `data_raw_env` : le capteur enregistre, mais ce sont des comptages électriques sans vitesse ni direction, non calibrés depuis l'avarie.
- **Garde-fou :** la préparation vérifie que les dossiers calibré et dérivé de chaque sol préparé ne contiennent aucun fichier de vent, et s'arrête sinon. Aucun danger de marche n'est tiré du vent.

## Affichage et règles du scénario

Afficher le sol, l'heure martienne, la position de mesure et le statut historique. L'effet sur le temps de marche, les limites de température et les réserves sont des paramètres de la simulation ; leur calibration pour un astronaute n'a pas été établie.

Exemple de démonstration : le joueur prépare trois arrêts ; un événement « visibilité réduite — simulé » applique un ralentissement choisi ; le budget devient insuffisant ; retirer un arrêt rétablit la marge. Le facteur de ralentissement est une hypothèse affichée.

MEDA RDS mesure le rayonnement optique/UV et la poussière : ce n'est pas le dosimètre de rayonnement ionisant RAD. [Description PDS](https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/PERSEVERANCE/meda.html). Pour le contexte RAD : [NASA, mesures de radiation](https://science.nasa.gov/resource/radiation-measurements-on-mars/) et [événement solaire observé en mai 2024](https://science.nasa.gov/resource/curiosity-sees-specks-caused-by-2024-solar-storm-while-recording-a-wind-gust-on-mars/).
