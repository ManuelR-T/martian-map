# Mission de démonstration (#17)

Une sortie de 6 h autour de trois sites de Perseverance. Le plan tient, puis une activité ajoutée fait dépasser le budget, et une adaptation rétablit la marge. Les durées totales viennent de sorties réelles (Apollo et essais NASA BASALT). La répartition d'un arrêt en tâches est une hypothèse de l'équipe.

## Paramètres

| Paramètre | Valeur | Pourquoi |
| --- | --- | --- |
| Temps de terrain | 360 min (6 h) | Apollo 17 prévoyait 7 h par sortie, du sas ouvert au sas refermé. On retire 1 h pour sortir et rentrer. C'est optimiste : Artemis III compte environ 1,5 à 2 h de temps annexe par sortie (préparation de la combinaison, sortie, installation, dépoussiérage, rentrée), dont jusqu'à 30 min de dépoussiérage avant de rentrer. |
| Réserve | 60 min | Artemis III exige une réserve à chaque sortie, sans en donner la durée. 60 min est un choix de l'équipe. |
| Vitesse de marche | 2 km/h | Hypothèse de l'équipe : aucune source ouverte ne donne une vitesse de marche en combinaison sur Mars. |
| Camp | 77,4095° E, 18,4513° N | Position fictive dans le secteur de mission. Chaque arrêt est à moins de 490 m du camp ; Artemis III limite à 2 km de l'atterrisseur. |
| Durée d'un arrêt | 75 min | Apollo 17 prévoyait des arrêts de 30 à 66 min. BASALT faisait 2 à 3 arrêts par sortie de 4 h. 75 min reste dans cette fourchette. |

## Parcours

Segments droits sur la sphère martienne de rayon 3 396 190 m. Ce tracé est hypothétique : ce n'est pas un chemin vérifié sur le terrain.

| Trajet | Distance | Marche à 2 km/h |
| --- | --- | --- |
| Camp → Skinner Ridge | 489,5 m | 14,7 min |
| Skinner Ridge → Wildcat Ridge | 23,7 m | 0,7 min |
| Wildcat Ridge → Amalik | 531,4 m | 15,9 min |
| Amalik → camp (retour) | 454,5 m | 13,6 min |
| **Total** | **1 499,1 m** | **45,0 min** |

Le retour est affiché à part mais compté une seule fois dans la marche.

## Déroulé

Marge = temps de terrain − marche − arrêts − réserve.

| Étape | Ce que fait l'équipage | Arrêts | Marge |
| --- | --- | --- | --- |
| 1. Vue globale, puis Jezero | Situer le secteur et voir où les données détaillées existent. | | |
| 2. Camp et trois arrêts | Placer le camp, ajouter Skinner Ridge, Wildcat Ridge et Amalik dans cet ordre. | 75 + 75 + 75 = 225 min | 360 − 45 − 225 − 60 = **+30 min** |
| 3. Activité supplémentaire | Ajouter un 2e prélèvement à Amalik, la roche argileuse jugée la plus apte à garder des molécules organiques : +50 min, la durée de la phase de prélèvement de BASALT. | 75 + 75 + 125 = 275 min | 360 − 45 − 275 − 60 = **−20 min**, alerte de dépassement |
| 4. Adaptation | Réduire Skinner Ridge à 30 min : décrire et photographier, sans prélever. Le rover y a déjà fait 2 carottes, et le site est à 24 m de Wildcat Ridge. | 30 + 75 + 125 = 230 min | 360 − 45 − 230 − 60 = **+25 min** |

Valeurs exactes du script de contrôle : marche 44,97 min, marges +30,03, −19,97 et +25,03 min.

## Pourquoi ce scénario est réaliste

- **Les tâches durent plus longtemps que prévu.** Sur Apollo 14, elles ont pris 23 % de plus que le plan et la première sortie a dépassé d'environ 30 min. L'équipage a rattrapé en réduisant ses déplacements. Il jugeait souhaitable une marge de 25 à 30 % sur chaque tâche.
- **Sur le terrain, c'est plus lent qu'à l'entraînement.** Les tâches ont pris environ 40 % de plus sur Apollo 15 et 70 % de plus sur Apollo 16. Un seul carottage double a pris 6,7 à 7,2 min sur Apollo 15.
- **Adapter, c'est choisir quoi sauter.** Pour Artemis III, les objectifs ont une priorité fixée à l'avance. Ici, on sacrifie le prélèvement que le rover a déjà fait, pas l'objectif nouveau.

## Hypothèses de l'équipe

- La répartition d'un arrêt de 75 min en tâches. Seules les durées totales d'arrêt sont sourcées.
- Le temps de terrain de 360 min, avec 1 h pour sortir et rentrer (optimiste face aux 1,5 à 2 h d'Artemis III), la réserve de 60 min, la vitesse de 2 km/h et la position du camp.
- Les 50 min du 2e prélèvement : c'est une phase entière de BASALT, pas une mesure faite sur ce site.
- Les sources lunaires et les essais sur Terre sont transposés à Mars par analogie.

**Dans l'application :** chaque fiche de site compte 75 min de tâches (décrire 10, photo de contexte 10, photos rapprochées 10, prélèvement 45), et le temps alloué à un arrêt va de 5 min à 3 h. Les arrêts de 75, 125 et 30 min de la démo se saisissent donc directement.

## Sources

| Source | Ce qu'on en tire | Emplacement |
| --- | --- | --- |
| [Procédures de surface d'Apollo 17, volume 1](https://pds-geosciences.wustl.edu/Lunar/urn-nasa-pds-apollodoc/document_a17/mission/a17_final_lunar_surface_procedures_vol1_nominal.pdf) | 7 h par sortie ; arrêts prévus de 30 à 66 min | PDF p. 19 ; arrêts p. 107, 168, 176, 229, 241 et 249 |
| [Article BASALT, Astrobiology 2019](https://pmc.ncbi.nlm.nih.gov/articles/PMC6442258/) | Sortie de 4 h ; 2 à 3 arrêts ; phases : repérage 10 min, recherche 1 h, examen 1 h, prélèvement 50 min | Section 1.2 |
| [Marquez, Apollo 14](https://ntrs.nasa.gov/api/citations/20100036754/downloads/20100036754.pdf) | +23 % sur les tâches ; dépassement de 30 min ; marge de 25 à 30 % souhaitée | PDF p. 5, 7 et 9 |
| [Apollo 15 Time and Motion Study](https://ntrs.nasa.gov/api/citations/19730008096/downloads/19730008096.pdf) | +40 % par rapport à l'entraînement ; carottage double en 6,7 à 7,2 min | PDF p. 7 ; tableau 5, PDF p. 35 |
| [Apollo 16 Time and Motion Study](https://ntrs.nasa.gov/api/citations/19730008098/downloads/19730008098.pdf) | +70 % par rapport à l'entraînement | PDF p. 7 |
| [Tenets of Lunar EVAs for Artemis III](https://ntrs.nasa.gov/citations/20230008183) | Réserve exigée à chaque sortie ; 2 km au plus de l'atterrisseur ; objectifs classés par priorité ; 1,5 à 2 h de temps annexe par sortie, dont 30 min au plus de dépoussiérage | Points 1, 4, 5, 6 et 7 |
| [Points de prélèvement NASA](https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_SAMPLE_v3.json) | Coordonnées des trois arrêts | `outcrop_name` |
| [Catalogue NASA des échantillons](https://science.nasa.gov/mission/mars-2020-perseverance/mars-rock-samples/) | 2 carottes déjà prises par le rover à Skinner Ridge (Swift Run et Skyland) | Échantillons de 2022 |
