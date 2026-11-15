# Pourquoi l'interface est faite ainsi

Chaque choix répond à un usage concret d'un astronaute en sortie sur Mars et s'appuie sur une source NASA ou USGS. Ce qui est une hypothèse de l'équipe est dit comme tel. Chaque responsable de ticket ajoute ses choix ici.

## Principes communs

- **La tablette sert dans l'habitat, pas en combinaison.** La NASA juge l'écran tactile peu pratique avec un gant de sortie : un écran tactile fixé à l'avant-bras, testé sur la navette spatiale, a été limité par les reflets, sa petite taille et la fatigue ([NASA/TM-2012-217199](https://ntrs.nasa.gov/api/citations/20120011128/downloads/20120011128.pdf)). En sortie, « neither the mouse nor the touch screen are practical » ([NASA/TM-2013-216546](https://ntrs.nasa.gov/api/citations/20130014736/downloads/20130014736.pdf)). Un gant de sortie réduit la dextérité de 50 %, puis de 30 % de plus une fois pressurisé ([NASA NTRS, 1993](https://ntrs.nasa.gov/api/citations/19930016872/downloads/19930016872.pdf)). La tablette sert donc à préparer la sortie, puis au coéquipier resté dans l'habitat, qui coche les tâches que l'astronaute annonce à la radio. Dehors, la voix (#40) ou une vue casque (#30) prennent le relais.
- **L'équipage décide seul sur place.** Un message met de 4 à 22 min entre Mars et la Terre. Les essais NASA BASALT donnent donc à l'équipage un outil de planning consultable sans le centre de contrôle ([NASA NTRS](https://ntrs.nasa.gov/api/citations/20170002363/downloads/20170002363.pdf), [Astrobiology, 2019](https://pmc.ncbi.nlm.nih.gov/articles/PMC6442304)). L'application fonctionne avec des données embarquées.
- **Pas de GPS : on se repère avec des images et un cap.** « There is no GPS at the Red Planet » : Perseverance se situe en comparant ses panoramas aux images HiRISE prises depuis l'orbite ([JPL, 2026](https://www.jpl.nasa.gov/news/nasas-perseverance-now-autonomously-pinpoints-its-location-on-mars/)). Sur la Lune, le rover d'Apollo affichait la distance et la direction pour revenir au module lunaire, grâce à un gyroscope et des compteurs de roues ([manuel du rover lunaire, Apollo 17](https://www.nasa.gov/wp-content/uploads/static/history/alsj/LRVSysHndbkA17.pdf)). L'application montre donc des repères visuels et des parcours prévus, jamais une position en direct.

## Fiche de site (#9)

| Élément | Usage pour l'astronaute | Source |
| --- | --- | --- |
| Photo « À repérer sur place » | Reconnaître la cible en arrivant, sans GPS : trous de forage et zone abrasée du rover. Seules les photos dont la légende NASA nomme le site sont utilisées. | [Catalogue NASA des échantillons](https://science.nasa.gov/mission/mars-2020-perseverance/mars-rock-samples/) |
| Objectif | Savoir ce que l'arrêt doit rapporter, pour décider seul sans attendre la Terre. | Articles JPL ([2022](https://www.jpl.nasa.gov/news/nasas-perseverance-rover-investigates-geologically-rich-mars-terrain/), [2023](https://www.jpl.nasa.gov/videos/meet-the-mars-samples-shuyak-and-mageik-samples-14-and-15/)) |
| Déjà fait par le rover | Ne pas refaire le travail du rover et viser ce qui le complète. | Catalogue NASA des échantillons |
| Tâches cochables | Suivre l'arrêt pas à pas, comme la check-list au poignet des astronautes d'Apollo. Le coéquipier dans l'habitat coche ce que l'astronaute annonce. | [Procédures de surface d'Apollo 16](https://www.nasa.gov/wp-content/uploads/static/history/alsj/a16/a16flsp.pdf) |
| Contenu des tâches | Décrire, photographier, puis prélever avec photo avant et photo de repérage : la documentation géologique d'Apollo. | [USGS, échantillons d'Apollo 17](https://www.usgs.gov/publications/documentation-and-environment-apollo-17-samples) |
| Temps alloué et alerte « il manque X min » | Quand le temps manque, choisir quoi sauter. Apollo omettait alors certaines photos. | USGS, échantillons d'Apollo 17 |

**Choix de l'équipe, sans source NASA :**
- La durée de chaque tâche (5 ou 15 min) : aucune source NASA ne donne de durée d'arrêt humain sur ces sites.
- La fiche tient sans défilement sur une tablette en paysage, avec des lignes de 44 px de haut : le coéquipier suit la sortie en direct, il ne doit pas chercher l'information. La photo s'agrandit d'un toucher.

**Écarté volontairement :** le détail scientifique et les sources sur la fiche. Ils n'aident pas sur place ; les sources sont regroupées dans le panneau de provenance (#16). Les molécules organiques ne sont jamais présentées comme une preuve de vie : JPL précise qu'elles peuvent se former sans vie.

## Infrarouge de nuit THEMIS (#22)

| Élément | Usage pour l'astronaute | Source |
| --- | --- | --- |
| Couche « Infrarouge de nuit » sur la carte de Jezero | Avant la sortie, repérer sur le parcours les grandes zones de sol meuble et les affleurements rocheux. La nuit, poussière et sable fin se refroidissent vite et paraissent sombres ; roche et sols indurés restent clairs. | [USGS, mosaïques THEMIS contrôlées](https://stac.astrogeology.usgs.gov/docs/data/mars/themis_controlled_mosaics/) |
| Légende « Sombre : sable, poussière » / « Clair : roche, sol dur » | Lire l'image d'un coup d'œil, sans chiffre. Pour les rovers MER, la NASA écartait les zones de faible inertie thermique, poussiéreuses et peu portantes. | [Mémo NASA Ames sur les sites MER](https://marsoweb.nas.nasa.gov/landingsites/mer2003/doc/original.html) |
| « Contraste, pas une température. » | Ne pas prendre un gris pour une mesure. L'USGS décrit ces mosaïques comme des produits 8 bits qualitatifs, étirés et fondus pour l'affichage. | USGS, mosaïques THEMIS contrôlées |
| « Mars Odyssey · THEMIS · 100 m/pixel » et « Mosaïque de 2018 » | Savoir que la donnée est ancienne et grossière : un pixel vaut un terrain de 100 m de côté, bien plus que les détails HiRISE. | [Capacités WMTS NASA Trek](https://trek.nasa.gov/tiles/Mars/EQ/THEMIS_NightIR_ControlledMosaics_100m_v2_oct2018/1.0.0/WMTSCapabilities.xml) |
| Tuiles figées sur toute l'emprise HiRISE | La couche marche hors ligne dans l'habitat, partout où la carte HiRISE peut être affichée. | Choix de données de l'équipe (4 tuiles, environ 220 Ko) |

**Choix de l'équipe, sans source NASA :**
- Transposer à un astronaute à pied le critère de portance des rovers : aucune source NASA trouvée ne relie l'infrarouge de nuit à la préparation d'une sortie d'équipage. La couche reste un contexte, jamais un critère « on y va / on n'y va pas ».
- Couche éteinte par défaut et opacité à 60 % : HiRISE reste l'image de référence, l'infrarouge s'ajoute à la demande et laisse voir le relief dessous.
- Interrupteur et curseur de 44 px de haut, pour un usage au doigt sur tablette.
- Interrupteur rangé dans la section « Couches » du panneau Secteur, sous la légende et à côté de l'historique de Perseverance : posé en flottant sur la carte, il passait sous la colonne Budget à partir de 1280 px et masquait le panneau Secteur ou le zoom sur tablette.
- Ordre d'affichage : HiRISE, puis l'infrarouge de nuit, puis la trace du rover, puis les contours et les sites, pour que l'infrarouge ne cache jamais un repère.

**Écarté volontairement :** toute valeur chiffrée (température, inertie thermique) et la couche sur la carte globale de Mars, qui sert seulement à s'orienter.
