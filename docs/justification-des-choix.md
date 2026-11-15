# Pourquoi l'interface est faite ainsi

Chaque choix répond à un usage concret d'un astronaute en sortie sur Mars et s'appuie sur une source NASA ou USGS. Ce qui est une hypothèse de l'équipe est dit comme tel. Chaque responsable de ticket ajoute ses choix ici.

## Principes communs

- **La tablette sert dans l'habitat, pas en combinaison.** La NASA juge l'écran tactile peu pratique avec un gant de sortie : un écran tactile fixé à l'avant-bras, testé sur la navette spatiale, a été limité par les reflets, sa petite taille et la fatigue ([NASA/TM-2012-217199](https://ntrs.nasa.gov/api/citations/20120011128/downloads/20120011128.pdf)). En sortie, « neither the mouse nor the touch screen are practical » ([NASA/TM-2013-216546](https://ntrs.nasa.gov/api/citations/20130014736/downloads/20130014736.pdf)). Un gant de sortie réduit la dextérité de 50 %, puis de 30 % de plus une fois pressurisé ([NASA NTRS, 1993](https://ntrs.nasa.gov/api/citations/19930016872/downloads/19930016872.pdf)). La tablette sert donc à préparer la sortie, puis au coéquipier resté dans l'habitat, qui coche les tâches que l'astronaute annonce à la radio. Dehors, la voix (#40) ou une vue casque (#30) prennent le relais.
- **L'équipage décide seul sur place.** Un message met de 4 à 22 min entre Mars et la Terre. Les essais NASA BASALT donnent donc à l'équipage un outil de planning consultable sans le centre de contrôle ([NASA NTRS](https://ntrs.nasa.gov/api/citations/20170002363/downloads/20170002363.pdf), [Astrobiology, 2019](https://pmc.ncbi.nlm.nih.gov/articles/PMC6442304)). L'application fonctionne avec des données embarquées.
- **Pas de GPS : on se repère avec des images et un cap.** « There is no GPS at the Red Planet » : Perseverance se situe en comparant ses panoramas aux images HiRISE prises depuis l'orbite ([JPL, 2026](https://www.jpl.nasa.gov/news/nasas-perseverance-now-autonomously-pinpoints-its-location-on-mars/)). Sur la Lune, le rover d'Apollo affichait la distance et la direction pour revenir au module lunaire, grâce à un gyroscope et des compteurs de roues ([manuel du rover lunaire, Apollo 17](https://apollojournals.org/alsj/LRVSysHndbkA17.pdf)). L'application montre donc des repères visuels et des parcours prévus, jamais une position en direct.

## Fiche de site (#9)

| Élément | Usage pour l'astronaute | Source |
| --- | --- | --- |
| Photo « À repérer sur place » | Reconnaître la cible en arrivant, sans GPS : trous de forage et zone abrasée du rover. Seules les photos dont la légende NASA nomme le site sont utilisées. | [Catalogue NASA des échantillons](https://science.nasa.gov/mission/mars-2020-perseverance/mars-rock-samples/) |
| À rapporter | Savoir quel échantillon l'arrêt doit ramener, et donc quand il est réussi. Chaque arrêt d'une simulation NASA de sortie martienne avait un seul objectif scientifique. | [BASALT, Beaton 2019](https://pmc.ncbi.nlm.nih.gov/articles/PMC6442237), [Desert RATS, NTRS](https://ntrs.nasa.gov/citations/20110008013) |
| Pourquoi | La question que l'arrêt aide à trancher. Sans la Terre pour décider, l'équipage s'en sert pour adapter son plan sur place. Apollo 17 partait déjà d'une question par arrêt (le cratère Shorty : impact ou volcan ?). | [USGS PP 1080](https://pubs.usgs.gov/pp/1080/report.pdf), articles JPL ([2022](https://www.jpl.nasa.gov/news/nasas-perseverance-rover-investigates-geologically-rich-mars-terrain/), [2023](https://www.jpl.nasa.gov/videos/meet-the-mars-samples-shuyak-and-mageik-samples-14-and-15/)) |
| Déjà fait par le rover | Ne pas refaire le travail du rover et viser ce qui le complète. | Catalogue NASA des échantillons |
| Tâches cochables | Suivre l'arrêt pas à pas, comme la check-list au poignet des astronautes d'Apollo. Le coéquipier dans l'habitat coche ce que l'astronaute annonce. | [Procédures de surface d'Apollo 16](https://pds-geosciences.wustl.edu/Lunar/urn-nasa-pds-apollodoc/document_a16/mission/a16_final_lunar_surface_procedures.pdf) |
| Contenu des tâches | Décrire, photographier, puis prélever avec photo avant et photo de repérage : la documentation géologique d'Apollo. | [USGS, échantillons d'Apollo 17](https://www.usgs.gov/publications/documentation-and-environment-apollo-17-samples) |
| Temps alloué et alerte « il manque X min » | Quand le temps manque, choisir quoi sauter. Apollo omettait alors certaines photos. | USGS, échantillons d'Apollo 17 |

**Choix de l'équipe, sans source NASA :**
- La durée de chaque tâche (10 min pour décrire et pour chaque série de photos, 45 min pour le prélèvement, 75 min au total) : seul le total d'un arrêt s'appuie sur Apollo 17 et BASALT, la répartition est un choix de l'équipe.
- La fiche tient sans défilement sur une tablette en paysage, avec des lignes de 44 px de haut : le coéquipier suit la sortie en direct, il ne doit pas chercher l'information. La photo s'agrandit d'un toucher.
- Tant que le budget n'est pas calculé, son panneau tient sur une ligne au lieu d'être replié : replié, il cacherait le temps restant une fois le budget disponible, alors que suivre le temps est la tâche centrale du coéquipier dans l'habitat.

**Écarté volontairement :** le détail scientifique et les sources sur la fiche. Ils n'aident pas sur place ; les sources sont regroupées dans le panneau de provenance (#16). Les molécules organiques ne sont jamais présentées comme une preuve de vie : JPL précise qu'elles peuvent se former sans vie.

## Démo (#17)

La démo suit une sortie complète, de la préparation dans l'habitat à la décision d'adapter le plan. Détails et calculs : [mission de démonstration](demo/mission-demo.md).

| Choix | Usage pour l'astronaute | Source |
| --- | --- | --- |
| Sortie de 6 h de terrain, arrêts de 75 min | Préparer une vraie journée de terrain, pas une démo raccourcie. Une fiche de site compte donc 75 min de tâches, et un arrêt peut recevoir jusqu'à 3 h. | [Apollo 17](https://pds-geosciences.wustl.edu/Lunar/urn-nasa-pds-apollodoc/document_a17/mission/a17_final_lunar_surface_procedures_vol1_nominal.pdf) : 7 h par sortie, arrêts de 30 à 66 min ; [BASALT](https://pmc.ncbi.nlm.nih.gov/articles/PMC6442258/) : 2 à 3 arrêts par sortie de 4 h |
| Réserve fixe, retirée avant la marge | Garder du temps pour rentrer en cas d'imprévu. | [Artemis III](https://ntrs.nasa.gov/citations/20230008183) : une réserve est exigée à chaque sortie |
| Dépassement causé par une activité ajoutée | Voir l'effet d'une décision avant de sortir. Sur le terrain, les tâches durent plus longtemps que prévu. | [Apollo 14](https://ntrs.nasa.gov/api/citations/20100036754/downloads/20100036754.pdf) : +23 % sur les tâches, sortie dépassée de 30 min |
| Adaptation : sauter ce que le rover a déjà fait | Garder l'objectif nouveau et sacrifier le moins utile. | Fiche « Déjà fait par le rover » ; [catalogue NASA des échantillons](https://science.nasa.gov/mission/mars-2020-perseverance/mars-rock-samples/) |
| Camp à moins de 490 m de chaque arrêt | Pouvoir rentrer vite en cas de problème de combinaison. | Artemis III : 2 km au plus de l'atterrisseur (règle lunaire) |

**Choix de l'équipe, sans source NASA :** la réserve de 60 min, la vitesse de 2 km/h, la position du camp, 1 h pour sortir et rentrer, 50 min pour le 2e prélèvement, et la répartition d'un arrêt en tâches.

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

## Profil et pentes du parcours (#15)

| Élément | Usage pour l'astronaute | Source |
| --- | --- | --- |
| Profil d'altitude du parcours | Voir avant de partir où le parcours monte et descend, pour répartir l'effort et le temps. Le relief HiRISE à 4 m par case est utilisé ; le CTX à 20 m le remplace si le manifeste déclare HiRISE incomplet ou indisponible (#10). | Relief HiRISE et CTX de l'USGS, voir `docs/relief-jezero.md` |
| Passages raides surlignés | Prévoir plus de temps, ralentir ou changer de chemin. Sur Apollo, une pente d'environ 15° dans un sol meuble était « comme monter une dune », et les plans prévoyaient 1 min de repos toutes les 5 min de montée. | [LPSC 2025, Apollo](https://www.hou.usra.edu/meetings/lpsc2025/pdf/2023.pdf) |
| Trous dans le profil | Une zone sans mesure reste visible comme telle : l'équipage ne se fie pas à une altitude inventée. Gris clair pour un trou dans les mesures, gris foncé pour une portion hors de la zone couverte. | Choix de l'équipe |
| Passages raides sur la carte | Le profil dit *qu'il y a* une montée raide ; la carte montre *où*, et ce qu'il y a autour pour la contourner. Mêmes passages, même seuil que sur le profil. | Choix de l'équipe |
| Point du profil montré sur la carte | En sortie, l'astronaute annonce sa position à la radio ; le coéquipier dans l'habitat touche ce point du profil, le voit sur la carte et le prévient du prochain passage raide. | Choix de l'équipe |
| Relief ombré (désactivé par défaut) | Fait ressortir crêtes et creux mal visibles sur la photo. Calculé à partir du même relief que le profil, pour que carte et profil ne se contredisent jamais. Désactivé par défaut et à 50 % d'opacité : une fois les passages raides sur la carte, c'est du contexte. Éclairage fictif venant du nord-ouest, aide visuelle et non mesure. | Relief HiRISE et CTX de l'USGS (#10) |

**Choix de l'équipe, sans source NASA :**
- **Seuil de 10° par défaut, réglable de 5 à 25° :** au-delà, la montée est pénible et il faut prévoir du temps et des pauses. La future combinaison NASA doit permettre de marcher sur des pentes jusqu'à 20° ([xEVA ConOps](https://www.nasa.gov/wp-content/uploads/2017/02/eva-exp-0042_xeva_system_con_ops_rev_b_final_dtd_10192020_ref_doc.pdf)). Sur Apollo 14, une montée d’environ 10° a fait monter le rythme cardiaque à 150 battements par minute ([NASA SP-350](https://www.nasa.gov/wp-content/uploads/static/history/SP-350/ch-12-5.html)). 10° signale l'effort bien avant cette limite. Aucune limite propre à Mars n'existe.
- **Un point par case du relief** (4 m en HiRISE, 20 m en CTX) : des points plus serrés inventeraient des détails que la donnée n'a pas. Entre deux cases mesurées, l'altitude est interpolée ; à côté d'une case vide, le profil laisse un trou.
- **Méthode de calcul.** Pente en degrés = arctangente(dénivelé ÷ distance au sol) entre deux points consécutifs. La distance au sol se calcule sur la sphère de Mars (rayon 3 396 190 m), ce qui tient compte du rétrécissement des cases vers l'est à la latitude de Jezero. L'interpolation entre les 4 cases voisines lisse légèrement le relief ; aucun autre lissage n'est appliqué.
- **La pente dépend de la finesse du relief et de la méthode.** À Skinner Ridge, la pente maximale du terrain, toutes directions confondues (méthode de Horn sur 3 × 3 cases, #10), vaut environ 20° en HiRISE 4 m et 8° en CTX 20 m. Le profil ne mesure que la pente dans le sens de la marche, entre deux points distants de 4 m : elle est plus faible. Le long du parcours de démonstration, la plus forte pente vaut 14° : le seuil de 10° signale 10 passages, 15° n'en signalerait aucun.
- **Pente dans le sens de la marche seulement.** La pente en travers, quand on longe un versant, relève du ticket #44.

**Limites :** même à 4 m par case, le relief ne montre ni les rochers ni les petites marches, et il ne garantit pas qu'un passage est praticable. Le parcours de démonstration relie les sites en ligne droite en attendant le tracé (#12) ; ce n'est pas un chemin calculé.

## Alerte radiation simulée (#26)

L'alerte sert pendant la sortie, dans le mode « En mission ». Le coéquipier resté dans l'habitat lit l'ordre sur la tablette et le transmet à la radio.

| Élément | Usage pour l'équipage | Source |
| --- | --- | --- |
| Ordre « Rentrer au camp maintenant » | Répéter la décision réelle : pendant un événement solaire, une sortie peut être interrompue et l'équipage mis à l'abri. Le groupe d'analyse des radiations de la NASA (SRAG) donne un avis sur chaque sortie et alerte les contrôleurs. | [SRAG, NASA JSC, 2000](https://lws.gsfc.nasa.gov/documents/community_ws_5_10_2000/golightly.pdf), [NASA OCHMO](https://www.nasa.gov/sites/default/files/atoms/files/radiation_protection_technical_brief_ochmo.pdf) |
| Retour direct depuis l'étape en cours | La NASA juge une sortie bien protégée si elle peut s'arrêter en moins de 2 heures avec un abri accessible. L'alerte donne la distance et la durée du retour en ligne droite jusqu'au camp, à la vitesse prévue de la mission. | NASA OCHMO |
| Activités abandonnées, résumées par site | Savoir ce que la sortie ne rapportera pas, pour replanifier sans attendre la Terre. | Choix de l'équipe |
| Mention « Simulation » et contexte replié | Aucune mesure des radiations n'existe à Jezero : RAD, sur Curiosity, mesure au cratère Gale, et MEDA RDS, sur Perseverance, mesure la lumière du Soleil et la poussière. L'alerte est donc un exercice. | [NASA, 2013](https://www.nasa.gov/news-release/nasa-rover-results-include-first-age-measurement-on-mars-and-help-for-human-exploration/), [NASA, mesures RAD](https://science.nasa.gov/resource/radiation-measurements-on-mars/), [NASA, MEDA RDS](https://science.nasa.gov/resource/medas-radiation-and-dust-sensor/) |

**Choix de l'équipe, sans source NASA :**
- L'application ne connaît pas la position de l'équipage. L'étape en cours est la première étape qui a encore une activité non cochée, ou la dernière quand tout est coché.
- Tout ce qui n'est pas coché, à partir de l'étape en cours, est abandonné.
- Les chiffres sont figés au déclenchement, comme un ordre transmis à la radio. Passer par « À la base » garde l'alerte ; un rechargement de la page l'annule.
- La marge restante n'est pas affichée tant que le budget de temps (#14) n'est pas calculé.

**Écarté volontairement :** toute dose personnelle, probabilité de survie ou alerte locale déduite d'une alerte terrestre. Le seul chiffre cité, environ 210 micrograys par jour mesurés par RAD à Gale en 2012-2013, décrit le lieu de la mesure.
