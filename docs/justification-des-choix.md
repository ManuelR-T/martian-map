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

## Conditions au rover (#23)

| Élément | Usage pour l'astronaute | Source |
| --- | --- | --- |
| Courbe de température sur 24 heures martiennes | Choisir l'heure de sortie : le sol 500, l'air passe de −82 °C à 6 h à environ −39 °C vers 14 h. Le froid et ses grands écarts comptent parmi les contraintes principales de la combinaison martienne. | [NASA ICES 2026, PLSS Mars](https://ntrs.nasa.gov/api/citations/20260003024/downloads/Final_ICES2026_Mars_PLSS_Plan.pdf), [archive PDS MEDA](https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/PERSEVERANCE/meda.html) |
| Un seul capteur, ATS1 sur le mât | Ne pas lire une température faussée par la chaleur du rover : le sol 500, les capteurs divergent jusqu'à 25 °C en journée. Le niveau 1,45 m est le plus propre. | [Munguira et al., 2023](https://meetingorganizer.copernicus.org/EGU23/EGU23-5885.html), CSV MEDA du sol 500 |
| Lieu : à 2 m de Skinner Ridge | La mesure vient de l'un des trois arrêts : le rover y est resté immobile du sol 477 au sol 501. | [Positions NASA du rover](https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_waypoints.json) |
| « Mesure passée, pas une prévision » | Ne pas prendre une archive de juillet 2022 pour la météo du jour de la sortie. | [README MEDA](https://atmos.nmsu.edu/PDS/data/PDS4/Mars2020/mars2020_meda/readme.txt) |
| Heure « indisponible » | Ne jamais remplir un trou de mesure : MEDA connaît des lacunes et des valeurs invalides. | README MEDA |

**Choix de l'équipe, sans source NASA :**
- La médiane de chaque heure : elle résiste aux pics isolés ; MEDA ne mesure qu'environ 20 minutes par heure.
- L'heure proposée à l'ouverture, 12 h.
- La pression en une ligne discrète : la combinaison est pressurisée quoi qu'il arrive, elle ne change aucune décision de sortie.
- Le panneau dans la colonne de droite, sous la fiche de site : à gauche, sous les étapes, la carte place déjà son panneau « Secteur » (#20). La colonne défile pour qu'aucun panneau ne soit écrasé.
- Choisir l'heure en touchant ou en balayant la courbe : une heure n'y fait que 11 à 17 px de large, trop peu pour viser du doigt. Le menu des heures reste disponible.

**Écarté volontairement :** toute limite de température pour l'astronaute (aucune n'est validée), l'incertitude de pression (colonne vide, unité fausse dans le label).

## Vent au rover (#27)

| Élément | Usage pour l'astronaute | Source |
| --- | --- | --- |
| « Vent non publié après le sol 315 : capteur de vent endommagé. » | Savoir que le vent n'est pas connu, plutôt que de croire à un temps calme. Le sol 500 affiché n'a que des comptages bruts, sans vitesse ni direction. | [Notes de version MEDA](https://atmos.nmsu.edu/PDS/data/PDS4/Mars2020/mars2020_meda/document/meda_release_notes.txt), dossiers PDS du sol 500 |

**Écarté volontairement :** le vent d'un sol plus ancien. Le rover était alors à 1,8 km au moins du secteur, et la température et la pression viendraient d'un autre jour. Tout danger de marche tiré du vent : aucun modèle de scénario ne le définit.
