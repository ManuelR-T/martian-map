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
| À rapporter | Savoir quel échantillon l'arrêt doit ramener, et donc quand il est réussi. Chaque arrêt d'une simulation NASA de sortie martienne avait un seul objectif scientifique. | [BASALT, Beaton 2019](https://pmc.ncbi.nlm.nih.gov/articles/PMC6442237), [Desert RATS, NTRS](https://ntrs.nasa.gov/citations/20110008013) |
| Pourquoi | La question que l'arrêt aide à trancher. Sans la Terre pour décider, l'équipage s'en sert pour adapter son plan sur place. Apollo 17 partait déjà d'une question par arrêt (le cratère Shorty : impact ou volcan ?). | [USGS PP 1080](https://pubs.usgs.gov/pp/1080/report.pdf), articles JPL ([2022](https://www.jpl.nasa.gov/news/nasas-perseverance-rover-investigates-geologically-rich-mars-terrain/), [2023](https://www.jpl.nasa.gov/videos/meet-the-mars-samples-shuyak-and-mageik-samples-14-and-15/)) |
| Déjà fait par le rover | Ne pas refaire le travail du rover et viser ce qui le complète. | Catalogue NASA des échantillons |
| Tâches cochables | Suivre l'arrêt pas à pas, comme la check-list au poignet des astronautes d'Apollo. Le coéquipier dans l'habitat coche ce que l'astronaute annonce. | [Procédures de surface d'Apollo 16](https://www.nasa.gov/wp-content/uploads/static/history/alsj/a16/a16flsp.pdf) |
| Contenu des tâches | Décrire, photographier, puis prélever avec photo avant et photo de repérage : la documentation géologique d'Apollo. | [USGS, échantillons d'Apollo 17](https://www.usgs.gov/publications/documentation-and-environment-apollo-17-samples) |
| Temps alloué et alerte « il manque X min » | Quand le temps manque, choisir quoi sauter. Apollo omettait alors certaines photos. | USGS, échantillons d'Apollo 17 |

**Choix de l'équipe, sans source NASA :**
- La durée de chaque tâche (5 ou 15 min) : aucune source NASA ne donne de durée d'arrêt humain sur ces sites.
- La fiche tient sans défilement sur une tablette en paysage, avec des lignes de 44 px de haut : le coéquipier suit la sortie en direct, il ne doit pas chercher l'information. La photo s'agrandit d'un toucher.
- Tant que le budget n'est pas calculé, son panneau tient sur une ligne au lieu d'être replié : replié, il cacherait le temps restant une fois le budget disponible, alors que suivre le temps est la tâche centrale du coéquipier dans l'habitat.

**Écarté volontairement :** le détail scientifique et les sources sur la fiche. Ils n'aident pas sur place ; les sources sont regroupées dans le panneau de provenance (#16). Les molécules organiques ne sont jamais présentées comme une preuve de vie : JPL précise qu'elles peuvent se former sans vie.

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
