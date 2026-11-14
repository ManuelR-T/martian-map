# Revue de la planification après rebase sur dev

## Base et règle d’intégration

La branche `feat/kanda09-mission-planner` a été rebasée sur `origin/dev` au commit `0a3121e` (imagerie Jezero et historique de Perseverance inclus). Aucun commit n’est ajouté ni poussé sur `dev`.

La carte redevient l’accueil (`#/`), avec le comportement et les composants de `dev`. Les pages complémentaires sont accessibles sous `#/missions`, `#/nouvelle`, `#/mission`, `#/historique` et `#/sources`. Les répertoires `features/map` et `sites`, ainsi que `StepsPanel`, `SiteDetailsPanel` et `MapStage`, sont identiques à cette base de `dev`.

La composition de l’application ajoute une navigation vers les missions et un panneau de liaison à côté des panneaux existants. Les modules de carte sont chargés à la demande dès l’ouverture de leur écran, sans masquer la carte derrière un accordéon.

## Audit par ticket

| Ticket | Livré et vérifié | Interprétation ou limite | Amélioration proposée |
| --- | --- | --- | --- |
| #11 — Mission, camp, étapes, activités | Modèle versionné, transitions pures, camp fictif, étapes ordonnées libres ou NASA, activités et paramètres validés, état partagé Context/reducer. Ajout d’une visite depuis la fiche interactive. | Géométrie dérivée camp → étapes → camp. Le camp se place par coordonnées ou exemple, pas par clic cartographique. Les tâches cochées dans la fiche restent un suivi de terrain distinct du plan. | Brancher la couche d’édition du parcours (#12) et les callbacks de placement/déplacement. |
| #13 — Distances | Calculs sphériques martiens avec le rayon du manifeste, exploration/retour/total, mètres/km explicites, tests analytiques et antiméridien. | Distance horizontale de segments directs, pas de recherche de chemin ni de distance 3D. | Ajouter un profil de terrain seulement avec une résolution et une couverture vérifiées. |
| #14 — Temps et réserve | Budget recalculé, retour compté une fois, réserve protégée, marge/alerte et chronologie. Le budget autonome reste visible lorsque la carte est globale ou le catalogue en cours de chargement. | Vitesse constante. La réserve est incluse dans l’enveloppe. La marche ne tient pas encore compte du relief. | Ajouter un contrôle de départ/retour avec le futur profil de terrain. |
| #18 — Sauvegarde | Bibliothèque locale multi-missions, migration de la sauvegarde antérieure, renommage, duplication, suppression, archivage, restauration. Protection des données corrompues et avertissement pour sites absents du catalogue. | Les rasters et tuiles ne sont pas sauvegardés avec les plans. Les bibliothèques ne se synchronisent pas entre appareils. | Export/import de toute la bibliothèque et stratégie explicite de migration des versions futures. |
| #19 — Événements | Retards sur activités et ralentissements sur segments choisis, cumul explicite, budget comparé à la référence, annulation exacte testée. | Événements simulés, sans prétendre observer une météo. La suppression d’une cible retire ses événements. | Visualiser directement sur la carte les portions affectées. |
| #25 — Export | JSON versionné avec géométrie, références, paramètres, événements et résultats ; fiche imprimable du plan courant. Cohérence des chiffres affichés/exportés testée. | Les exports n’attestent pas du chargement des couches de carte ; aucune couche n’y est déclarée chargée. Ils exportent le plan courant, pas toutes les révisions de la bibliothèque. | Ajouter un export de dossier complet avec révisions et un aperçu de mise en page imprimable. |
| #32 — O₂ | Moteur optionnel versionné, paramètres validés, débits marche/arrêt, bilan stock/réserve, calcul directionnel lorsque des pentes sont fournies, distinction NoData/terrain plat. | **Intégration partielle** : les grilles de relief de dev sont présentes, mais ne sont pas encore échantillonnées le long du parcours et injectées dans le moteur. Le calcul est indisponible sans ces pentes, sauf terrain plat activé explicitement. Les coefficients ne sont pas calibrés. | Brancher le profil #15, conserver NoData, puis valider les hypothèses du modèle. Aucune garantie physiologique. |

## Corrections apportées pendant cette revue

- Restauration de l’accueil cartographique et des fiches interactives de `dev`, auparavant masqués par la refonte.
- Préservation des commandes de couverture, des sites cliquables, du suivi des tâches, des photos et de l’historique du rover.
- Catalogue enrichi de son manifeste **sans perdre** les champs `planet`, `coverage`, `sites` et les exports rover/terrain de `dev`.
- Nouveau passage fiche → plan : une visite distincte est créée et le temps alloué est réparti proportionnellement entre les activités proposées dans la fiche. Les changements ultérieurs de la fiche ne modifient pas silencieusement la visite.
- Activités harmonisées entre les exemples, l’ajout depuis la bibliothèque et l’ajout depuis la carte ; provenance conservée et références dédupliquées.
- Budget du plan dissocié de la vue globale de la carte, afin de rester consultable avec un catalogue indisponible.
- Correction d’un débordement mobile introduit par la combinaison du conteneur flex de `dev` et des pages complémentaires.
- Placement des informations de secteur adapté à la hauteur des panneaux de plan, y compris lorsqu’on replie les étapes.

## Choix interprétés

- L’historique conserve des **plans archivés et des révisions datées**, conformément à la réponse de l’utilisateur ; il ne représente pas des sorties exécutées.
- La mission contient un objectif scientifique facultatif. Il s’agit d’un champ du scénario, pas d’une observation NASA.
- Les valeurs initiales de 360 minutes disponibles, 60 minutes de réserve et 2 km/h sont des hypothèses de démonstration, pas des règles NASA applicables à Mars.
- Le camp d’exemple est fictif. Les positions des stations proviennent exclusivement du manifeste local.
- Les durées proposées dans les fiches sont des hypothèses de l’équipe. Lors de l’ajout au plan, les tâches sont classées comme observation, photo ou prélèvement ; le temps alloué est conservé.
- L’exploration reste limitée au secteur détaillé de Jezero. La trace de Perseverance n’est pas utilisée comme itinéraire humain validé.

## Propositions de format et de visuel

1. **Format livré : carte d’abord, préparation dédiée.** La carte et les fiches de dev restent centrales ; bibliothèque, création, parcours, prévisionnel et révisions disposent d’écrans lisibles, reliés dans les deux sens.
2. **Proposition compacte, non livrée : prévisionnel en panneau.** Présenter les portions de marche et activités d’un arrêt dans un tableau compact à côté de la carte, avec un indicateur de marge persistant. À valider avant de modifier la disposition principale de dev.
3. **Proposition mobile, non livrée : assistant par étapes.** Objectif → stations → budget → version. Un récapitulatif court reste visible, avec un seul groupe de réglages à la fois. Il s’agit d’une proposition de présentation, pas d’un nouveau moteur de calcul.

Les captures et prototypes de la revue sont dans `artifacts/mission-review`. Les captures montrent l’application réelle ; les prototypes sont explicitement marqués « proposition non intégrée ».

## Validation

- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
- 212 tests unitaires et de rendu après rebase, dont des tests supplémentaires pour l’ajout depuis les tâches des fiches et le budget indépendant de la carte.
- Parcours Chromium : accueil cartographique, Jezero, fiche et tâches cochées, historique du rover, création d’exemple, ajout d’une visite avec 45 minutes allouées, budget, événement et annulation, version, archive, restauration dans un nouveau plan, rechargement, création à vide.
- Formats 1440, 768, 390 et 320 px ; accès carte → plan sur mobile.
- Vérification Git : `origin/dev` est ancêtre de la branche ; aucun changement dans les composants de carte et de fiches de cette base.
