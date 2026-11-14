# Ajouts de mission : emplacements et parcours

Référence vérifiée sur GitHub : `origin/dev` au commit `0a3121e`.
La carte, les fiches, leurs photos et checklists, l’historique de Perseverance,
le CSS responsive et les styles partagés sont identiques à cette référence.
Les pages ajoutées utilisent `Panel`, `Button`, les couleurs, les bandeaux et la
typographie existants. L’en-tête conserve ses liens de dev ; un bouton
« Mes missions » donne accès aux ajouts. Aucun commit n’est poussé sur dev.

## Où trouver les ajouts

| Ajout | Emplacement | Utilisation |
| --- | --- | --- |
| Bibliothèque de plans | Bouton « Mes missions » → « Toutes mes missions » (`#/missions`) | Reprendre, dupliquer ou créer un plan ; les plans sont enregistrés sur cet appareil. |
| Création guidée | Bibliothèque → « Nouvelle mission » (`#/nouvelle`) | Donner un nom/objectif, choisir exemple ou plan vide, régler durée/réserve/vitesse, puis créer. |
| Camp, étapes et activités | Mission → onglet « Parcours et activités » (`#/mission`) | Placer un camp d’exemple ou par coordonnées, ajouter des sites ou étapes libres, réordonner et régler les activités. |
| Ajout depuis la fiche de dev | Carte Jezero → choisir un site → « Mes missions » → « Ajouter [site] au plan » | Nécessite un plan actif non archivé. Le temps alloué dans la fiche est copié à l’ajout, sans changer la fiche ni ses tâches cochées. |
| Budget de mission | Panneau existant à droite de la carte ; onglet « Prévisionnel » du plan | Distance, marche, activités, retour, réserve et marge. Les calculs suivent les modifications du plan. |
| Imprévus simulés | « Prévisionnel » → « Tester un imprévu » | Ajouter un retard sur une activité ou un ralentissement sur une portion ; annuler pour revenir au budget initial. |
| O₂ optionnel | « Prévisionnel » → « Estimation d’oxygène » → réglages avancés | Activer le modèle. Les pentes ne sont pas encore branchées : terrain plat seulement après activation explicite. |
| Versions et archives | Mission → « Versions et historique » | Nommer et garder un instantané, archiver, remettre en préparation, supprimer ou restaurer une version dans un nouveau plan. |
| Plans archivés | Bibliothèque → lien « Historique » (`#/historique`) | Consulter et dupliquer les plans archivés. Ce ne sont pas des sorties exécutées. |
| Export et impression | En haut du plan : « JSON » / « Imprimer » | Exporter le plan courant, ses paramètres, ses événements et ses résultats. |
| Provenance et hypothèses | Pied de la bibliothèque : « Sources et hypothèses » (`#/sources`) | Distinguer données scientifiques et paramètres simulés. |

## Parcours conseillés

1. **Découvrir** : Mes missions → Toutes mes missions → Essayer un exemple → Parcours et activités → Prévisionnel.
2. **Construire son plan** : Nouvelle mission → page blanche → créer → placer le camp → ajouter des stations → ajuster les activités → Prévisionnel.
3. **Préparer depuis la carte** : créer/reprendre un plan → ouvrir la carte de Jezero → choisir un site et son temps alloué → Mes missions → ajouter ce site → ouvrir le parcours/prévisionnel.
4. **Évaluer un imprévu** : Prévisionnel → ajouter un retard ou ralentissement → lire la nouvelle marge → Annuler.
5. **Conserver et reprendre** : Versions et historique → enregistrer une version → archiver → Toutes mes missions → Historique → Consulter → restaurer dans une nouvelle mission.
6. **Partager** : ouvrir le plan → JSON ou Imprimer.

Sur mobile, le bouton « Mes missions » est aussi disponible dans les réglages de
la vue Mission de dev. La carte conserve sa navigation Carte / Mission.

## Limites explicites

Le placement du camp/parcours par clic cartographique et les pentes injectées au
modèle O₂ restent à intégrer. Les distances sont horizontales et les segments
directs ne garantissent pas un chemin praticable. Temps, vitesse, camp fictif et
coefficients O₂ sont des paramètres de simulation. L’historique conserve des
plans et des versions, selon le choix de l’utilisateur. Les exports portent sur
le plan courant, pas sur toutes les révisions de la bibliothèque.

Les captures de `artifacts/mission-review` documentent une présentation
antérieure ; elles ne sont plus une référence de l’interface actuelle.
