# Mission de démonstration (#17)

Une sortie de 6 h autour de trois sites de Perseverance. Le plan tient, puis une activité ajoutée fait dépasser le budget, et une adaptation rétablit la marge. Pendant la sortie, une alerte radiation simulée ordonne le retour au camp. La mission se prépare dans la PR #50 (modes « À la base » et « En mission »). Les durées totales viennent de sorties réelles (Apollo et essais NASA BASALT). La répartition d'un arrêt en tâches est une hypothèse de l'équipe.

## Paramètres

| Paramètre | Valeur | Pourquoi |
| --- | --- | --- |
| Temps de terrain | 360 min (6 h) | Apollo 17 prévoyait 7 h par sortie, du sas ouvert au sas refermé. On retire 1 h pour sortir et rentrer. C'est optimiste : Artemis III compte environ 1,5 à 2 h de temps annexe par sortie (préparation de la combinaison, sortie, installation, dépoussiérage, rentrée), dont jusqu'à 30 min de dépoussiérage avant de rentrer. |
| Réserve | 60 min | Artemis III exige une réserve à chaque sortie, sans en donner la durée. 60 min est un choix de l'équipe. |
| Vitesse de marche | 0,5 m/s (1,8 km/h) | Valeur par défaut de l'application. Hypothèse de l'équipe : aucune source ouverte ne donne une vitesse de marche en combinaison sur Mars. |
| Camp | « Jezero Alpha — simulation », 77,400° E, 18,450° N | Camp fictif du catalogue de l'application. Chaque arrêt est à moins de 640 m du camp ; Artemis III limite à 2 km de l'atterrisseur. |
| Durée d'un arrêt | 75 min | Apollo 17 prévoyait des arrêts de 30 à 66 min. BASALT faisait 2 à 3 arrêts par sortie de 4 h. 75 min reste dans cette fourchette. |

## Parcours

Segments droits sur la sphère martienne de rayon 3 396 190 m. Ce tracé est hypothétique : ce n'est pas un chemin vérifié sur le terrain.

| Trajet | Distance | Marche à 0,5 m/s |
| --- | --- | --- |
| Camp → Skinner Ridge | 633,1 m | 21,1 min |
| Skinner Ridge → Wildcat Ridge | 23,7 m | 0,8 min |
| Wildcat Ridge → Amalik | 531,4 m | 17,7 min |
| Amalik → camp (retour) | 91,7 m | 3,1 min |
| **Total** | **1 280,0 m** | **42,7 min** |

Le retour est affiché à part mais compté une seule fois dans la marche.

## Déroulé

Marge = temps de terrain − marche − arrêts − réserve.

| Étape | Ce que fait l'équipage | Arrêts | Marge |
| --- | --- | --- | --- |
| 1. Vue globale, puis Jezero | Situer le secteur et voir où les données détaillées existent. | | |
| 2. Camp et trois arrêts | « À la base », nouvelle mission « Prélèvement d'échantillons » : camp Jezero Alpha, puis Skinner Ridge, Wildcat Ridge et Amalik dans cet ordre. | 75 + 75 + 75 = 225 min | 360 − 42,7 − 225 − 60 = **+32 min** |
| 3. Activité supplémentaire | Ajouter un 2e prélèvement à Amalik, la roche argileuse jugée la plus apte à garder des molécules organiques : +50 min, la durée de la phase de prélèvement de BASALT. | 75 + 75 + 125 = 275 min | 360 − 42,7 − 275 − 60 = **−18 min**, alerte de dépassement |
| 4. Adaptation | Réduire Skinner Ridge à 30 min : retirer le prélèvement, garder l'observation et les photos. Le rover y a déjà fait 2 carottes, et le site est à 24 m de Wildcat Ridge. | 30 + 75 + 125 = 230 min | 360 − 42,7 − 230 − 60 = **+27 min** |
| 5. Sortie | Enregistrer, puis « Démarrer cette mission ». En mode « En mission », cocher les activités de Skinner Ridge. | | |
| 6. Alerte radiation | « Simuler une alerte radiation » à Wildcat Ridge : retour de 610 m en 21 min à 0,5 m/s. Abandonnées : Wildcat Ridge (3 activités) et Amalik (4 activités). | | |

Valeurs exactes : marche 42,67 min, marges +32,33, −17,67 et +27,33 min. Les marges seront affichées par l'application quand le budget de temps (#14) sera mergé ; d'ici là, elles viennent de ce calcul.

## Pourquoi ce scénario est réaliste

- **Les tâches durent plus longtemps que prévu.** Sur Apollo 14, elles ont pris 23 % de plus que le plan et la première sortie a dépassé d'environ 30 min. L'équipage a rattrapé en réduisant ses déplacements. Il jugeait souhaitable une marge de 25 à 30 % sur chaque tâche.
- **Sur le terrain, c'est plus lent qu'à l'entraînement.** Les tâches ont pris environ 40 % de plus sur Apollo 15 et 70 % de plus sur Apollo 16. Un seul carottage double a pris 6,7 à 7,2 min sur Apollo 15.
- **Adapter, c'est choisir quoi sauter.** Pour Artemis III, les objectifs ont une priorité fixée à l'avance. Ici, on sacrifie le prélèvement que le rover a déjà fait, pas l'objectif nouveau.

## Hypothèses de l'équipe

- La répartition d'un arrêt de 75 min en tâches. Seules les durées totales d'arrêt sont sourcées.
- Le temps de terrain de 360 min, avec 1 h pour sortir et rentrer (optimiste face aux 1,5 à 2 h d'Artemis III), la réserve de 60 min, la vitesse de 2 km/h et la position du camp.
- Les 50 min du 2e prélèvement : c'est une phase entière de BASALT, pas une mesure faite sur ce site.
- Les sources lunaires et les essais sur Terre sont transposés à Mars par analogie.

**Dans l'application (PR #50) :**
- À l'étape 3 de la préparation, saisir 360 min de durée disponible et 60 min de réserve. La vitesse reste à 0,5 m/s.
- Chaque arrêt compte 75 min d'activités : observation 10 min, photo 20 min, prélèvement 45 min. Le 2e prélèvement d'Amalik dure 50 min. Skinner Ridge réduit garde l'observation et la photo (30 min).
- Préparer et enregistrer la mission avant la présentation. En direct, on ajoute seulement le 2e prélèvement, puis on adapte Skinner Ridge.

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
