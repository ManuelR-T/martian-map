# Marswalk Planner : météo et dangers

Contrôle du 14 novembre 2026. Extension proposée au périmètre, sans implémentation de l'interface.

## Recommandation pour 48 heures

Ajouter un panneau de conditions historiques MEDA, une alerte de pente calculée et un événement scénarisé qui force à revoir la mission. Distinguer explicitement « mesuré », « calculé » et « simulé ».

| Fonctionnalité | Donnée | État et limite |
| --- | --- | --- |
| Température et pression au cours d'un sol choisi | MEDA, Perseverance | Produits du sol 500 accessibles, extraits CSV et labels XML téléchargés et décodés. Mesures au rover, pas une carte météo sur chaque point du parcours. |
| Vent et direction | Archives MEDA | Produits documentés et index accessible ; aucun produit WS trouvé dans les répertoires calibrés et dérivés du sol 500 inspectés. Afficher indisponible pour ce sol ; ne pas remplir avec une autre date sans le signaler. |
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

## Affichage et règles du scénario

Afficher le sol, l'heure martienne, la position de mesure et le statut historique. L'effet sur le temps de marche, les limites de température et les réserves sont des paramètres de la simulation ; leur calibration pour un astronaute n'a pas été établie.

Exemple de démonstration : le joueur prépare trois arrêts ; un événement « visibilité réduite — simulé » applique un ralentissement choisi ; le budget devient insuffisant ; retirer un arrêt rétablit la marge. Le facteur de ralentissement est une hypothèse affichée.

MEDA RDS mesure le rayonnement optique/UV et la poussière : ce n'est pas le dosimètre de rayonnement ionisant RAD. [Description PDS](https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/PERSEVERANCE/meda.html). Pour le contexte RAD : [NASA, mesures de radiation](https://science.nasa.gov/resource/radiation-measurements-on-mars/) et [événement solaire observé en mai 2024](https://science.nasa.gov/resource/curiosity-sees-specks-caused-by-2024-solar-storm-while-recording-a-wind-gust-on-mars/).
