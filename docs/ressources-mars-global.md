# Mars entière : cinq ressources complémentaires pour Marps

Recherche documentaire vérifiée le **15 novembre 2026**, après lecture de
`README.md` et `docs/ressources-mars.md`. Cette sélection complète les six
ressources existantes sans les reprendre. Elle vise l'exploration scientifique
mondiale, alors que la préparation détaillée reste limitée à Jezero.

**Portée :** pages et documentation primaires consultées par l'outil web ; aucun
raster, paquet SIG ou modèle téléchargé, aucun calcul exécuté, aucun test CORS,
HTTP Range, navigateur ou OpenLayers réalisé. Une page lisible ne valide pas la
diffusion directe de ses données dans l'application. Les adaptations proposées
ci-dessous sont des recommandations produit, pas des intégrations validées.

## 1. HRSC / Mars Express : fond mondial en couleur — priorité 1

Sources : [produits et formats de l'équipe DLR](https://hrscteam.dlr.de/public/data/globalcolor.php),
[dépôt pérenne des auteurs](https://doi.org/10.17169/refubium-40624),
[présentation ESA de la construction](https://www.esa.int/ESA_Multimedia/Images/2023/05/Building_a_mosaic_of_Mars).

- **Apport produit :** proposer un fond couleur de surface à côté du relief MOLA ;
  rendre visibles les grandes différences régionales sans les confondre avec
  des différences d'altitude.
- **Formats et couverture documentés :** GeoTIFF prêts pour SIG à **2 km/pixel** ;
  vue mondiale équirectangulaire, faces orthographiques, composite RGB et canaux
  séparés nadir, rouge, vert, bleu et infrarouge. Crédit : ESA/DLR/FU Berlin.
- **Limites :** assemblage d'observations à haute altitude, pas une photographie
  simultanée ni une carte minéralogique. La couleur ne mesure ni pente ni
  composition directement. Conserver le traitement colorimétrique et les
  conditions de réutilisation du produit retenu.
- **Préparation envisagée :** partir du composite équirectangulaire, vérifier son
  géoréférencement puis produire des tuiles et une petite vue hors ligne. Aucun
  endpoint WMTS ni accès navigateur n'est validé ici.

## 2. USGS : carte géologique mondiale SIM 3292 (2014) — priorité 1

Sources : [publication et distributions USGS](https://pubs.usgs.gov/sim/3292/),
[carte officielle en PDF](https://pubs.usgs.gov/sim/3292/pdf/sim3292_map.pdf),
[notice des auteurs conservée au Smithsonian](https://repository.si.edu/server/api/core/bitstreams/0938639a-7242-4930-8b3b-5c28683e6921/content),
[carte conservée au Smithsonian](https://repository.si.edu/server/api/core/bitstreams/9f9936a8-bb2a-4a21-b00b-6977fe03ed4c/content).

- **Apport produit :** au clic, expliquer unité géologique, époque et
  interprétation ; comparer terrains volcaniques, hauts plateaux et dépôts.
- **Formats et couverture :** carte PDF mondiale au **1:20 000 000** et base SIG
  décrite dans la notice. Prévoir une conversion des unités en GeoJSON simplifié
  et une table de légende ; la structure exacte du paquet SIG reste à inspecter.
- **Limites :** généralisation cartographique importante ; les contacts ne sont
  pas des frontières précises à l'échelle d'une sortie. Les âges reposent sur
  stratigraphie et comptages de cratères, pas sur une datation de chaque point.
- **Accès vérifié :** la page de distribution USGS renvoie **403 dans l'outil** ;
  documentation des auteurs retrouvée chez le coéditeur scientifique Smithsonian.
  L'existence de la carte est vérifiée ; la récupération du paquet SIG ne l'est
  pas. Ne pas superposer le PDF Robinson comme une image équirectangulaire.

## 3. Mars Climate Database LMD : contexte climatique mondial — priorité 2

Sources : [interface actuellement annoncée v6.2](https://www-mars.lmd.jussieu.fr/mcd_python/),
[description scientifique](https://www-mars.lmd.jussieu.fr/mars/info_web/index.html),
[accès à la base complète](https://www-mars.lmd.jussieu.fr/mars/access).

- **Apport produit :** comparer pression, température et vent modélisés selon
  région, saison (`Ls`) et heure locale ; compléter les mesures MEDA historiques
  de Jezero avec une climatologie explicitement séparée.
- **Formats et couverture :** modèle atmosphérique mondial ; base complète en
  **NetCDF**, logiciel d'accès Fortran et exemples d'interfaces dont Python.
  Téléchargement complet gratuit après inscription ; interface web destinée à
  un usage modéré.
- **Limites :** champs issus de simulations GCM confrontées aux observations,
  pas météo en direct ni prévision d'une sortie. L'interpolation sur la
  topographie ne résout pas les rafales et effets locaux. L'interface affiche
  v6.2, mais la page documentaire renvoie encore aux manuels v6.1 : figer et
  documenter la version effectivement acquise.
- **Préparation envisagée :** extraire hors ligne quelques scénarios en JSON
  (unités, altitude, saison, heure, scénario poussière, version). Ne pas traiter
  le formulaire web comme une API publique stable.

## 4. NASA GISS Mars24 : heure solaire et saison partout — priorité 1

Sources : [équations et exemples de contrôle, mise à jour 2025](https://www.giss.nasa.gov/tools/mars24/help/algorithm.html),
[conventions temporelles et particularités des missions](https://www.giss.nasa.gov/tools/mars24/help/notes.html).

- **Apport produit :** afficher heure solaire moyenne/vraie locale et longitude
  solaire `Ls` pour tout point sélectionné ; donner un contexte temporel commun
  aux fiches régionales et aux scénarios MCD.
- **Format et couverture :** documentation HTML d'algorithmes numériques, valable
  pour les longitudes martiennes ; pas de raster ni de service distant requis.
  Recommandation : implémentation TypeScript pure, confrontée aux exemples NASA.
- **Limites :** distinguer UTC, échelles temporelles astronomiques, LMST et LTST ;
  maintenir les secondes intercalaires. Les heures conventionnelles des rovers
  peuvent différer du temps solaire local. Ces équations ne fournissent ni
  ombres du relief ni visibilité locale de l'horizon. Aucun résultat numérique
  n'a été validé pendant cette recherche.

## 5. MGS / TES : inertie thermique régionale — priorité 2

Sources : [produits de l'équipe TES/ASU](https://tes.mars.asu.edu/products/),
[fiche ASU et téléchargements Christensen](https://www.mars.asu.edu/data/tes_ti/),
[archive PDS Putzig–Mellon et masques](https://pds-geosciences.wustl.edu/missions/mgs/tes-timap.html).

- **Apport produit :** comparer les propriétés thermophysiques des grandes
  régions ; ajouter une couche scientifique distincte d'une image infrarouge.
- **Formats et couverture :** Christensen : **8 pixels/degré**, environ 7,5 km
  à l'équateur, valeurs entre **60°S et 60°N**, VICAR numérique et PNG colorisé.
  Le canevas mondial du PNG ne signifie pas que les pôles sont mesurés.
  ASU décrit aussi Putzig 2005 à 20 pixels/degré, entre 80°S et 80°N, en binaire
  et JPEG. L'archive PDS Putzig–Mellon fournit labels détachés et masques des
  pixels interpolés : ne pas mélanger ces versions.
- **Limites :** inertie dérivée d'observations orbitales historiques et d'un
  modèle thermique ; ni température actuelle ni granulométrie univoque.
  Pour une valeur au clic, lire les données numériques, unités et masques,
  jamais la couleur du PNG. Pas d'extrapolation aux zones absentes.

## Ordre conseillé et critères avant intégration

Commencer par **HRSC + géologie + Mars24** : orientation visuelle, explication
scientifique et contexte temporel mondial. Ajouter ensuite **TES**, puis **MCD**,
qui demande davantage de choix de scénarios et de préparation.

Pour chaque acquisition future : figer version, crédit, droits, unités,
empreinte, emprise et masque de validité ; vérifier latitude planétocentrique,
sens des longitudes, coupure à 180° et projection contre le référentiel Mars du
README. Préparer des dérivés statiques légers et conserver « sans donnée » hors
couverture. Tester séparément téléchargement, géoréférencement et éventuel accès
CORS/Range avant toute promesse d'accès distant. Aucune de ces ressources ne
suffit à activer la planification détaillée hors Jezero.
