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
