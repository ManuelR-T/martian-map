# Vérification de l’issue 11

Revue locale du 15 novembre 2026, branche `feat/11-mission-camps-activities`.
Référence : https://github.com/ManuelR-T/martian-map/issues/11

Les six critères d’acceptation sont couverts après les corrections de cette revue.
Aucun défaut bloquant connu dans le périmètre vérifié. Le ticket GitHub n’a pas
été modifié ni fermé ; les changements restent locaux.

## Critères et preuves

| Critère | Implémentation | Vérification |
| --- | --- | --- |
| Types versionnés : région, camp fictif, étapes, géométrie, activités, paramètres, hypothèses | `packages/mission-core/src/mission.ts` : types publics, enveloppe `schemaVersion: 1`, validation des sauvegardes ; géométrie dérivée des étapes pour éviter une géométrie périmée | `mission.test.ts`, `missionDatabase.test.ts` : versions inconnues refusées, aller-retour JSON, migrations et ordre de visite |
| Camp, étapes libres/catalogue, suppression et réorganisation | Gestion indépendante des camps ; sélection dans la mission ; éditeur des étapes et reducer pur | `mission.test.ts`, `planner.test.ts`, `baseWorkflow.test.tsx` : ajout, suppression, ordre, catalogue, préparation et sauvegarde |
| Activités photo/observation/prélèvement et durée en minutes | `MissionActivity`, `ActivityEditor`, suivi séparé des visites | Tests des activités indépendantes, durées fractionnaires, coches et refus des durées invalides |
| Durée, vitesse, réserve, unités et validation | Secondes dans le modèle pour le budget, minutes dans les formulaires, vitesse en m/s ; `validParameters` vérifié à la sauvegarde et dans le reducer | Tests de valeurs négatives, NaN, infinis, vitesse nulle et réserve excessive ; paramètres du formulaire conservés au retour arrière |
| useReducer + Context, transitions testables sans React | `PlannerProvider.tsx`, `planner.ts`, `missionReducer` indépendant du DOM | Tests unitaires des transitions et tests DOM du parcours utilisateur |
| Mesures distinctes de la simulation ; édition détaillée limitée à Jezero | Sites scientifiques référencés par identifiant/coordonnées ; camps et hypothèses explicitement fictifs ; `missionMatchesCatalog` protège ajout, ouverture et démarrage | Tests du refus des sites inconnus et des préparations restaurées hors secteur ; moteur pur testé avec une autre région |

## Défauts corrigés pendant la revue

- Les paramètres saisis à la dernière étape étaient perdus au retour arrière.
  Leur brouillon est maintenant conservé et testé.
- Changer entre À la base et En mission démontait le formulaire et perdait son
  étape. La préparation reste montée et masquée pendant le suivi.
- La première sauvegarde pouvait garder l’identifiant générique `draft`, et
  continuer après une sauvegarde ne proposait pas clairement une nouvelle
  mission. Une identité unique et les actions Préparer une autre mission /
  Créer un autre modèle sont maintenant disponibles.
- Les limites du secteur et la cohérence des sites étaient contrôlées à l’ajout
  mais contournables par le chargement d’une sauvegarde. Ouverture et démarrage
  vérifient maintenant aussi ces contraintes.
- Restaurer le suivi réécrivait sa date d’historique sans changement utilisateur.
  La restauration ne déclenche plus une sauvegarde automatique superflue.
- Une restauration en échec était traitée comme un suivi vide prêt à remplacer.
  Le démarrage reste maintenant bloqué et une action de nouvelle tentative est
  proposée. Les réponses de chargements remplacés sont ignorées.
- Les transitions des fiches acceptaient une tâche inconnue ou une durée
  d’allocation invalide. Le reducer des fiches les refuse désormais aussi.
- Sur les petits écrans, les liens des deux espaces disparaissaient avec la
  navigation du bandeau. Ils restent accessibles dans les réglages compacts.

## Contrôles exécutés

- `pnpm lint` : succès.
- `pnpm typecheck` : succès.
- `pnpm test` : 216 tests réussis dans 18 fichiers, dont les régressions DOM,
  le modèle pur, la base IndexedDB simulée et les migrations.
- `pnpm build` : succès.
- `git diff --check` : succès.

Le build signale un bundle JavaScript supérieur au seuil indicatif de 500 kB ;
cela ne bloque pas la compilation. Les contrôles DOM utilisent jsdom et
fake-indexeddb : cette revue ne constitue pas une validation visuelle dans un
navigateur réel ni un essai sur tablette ou matériel d’astronaute.

Le calcul complet du budget relève de l’issue 14. Le stockage reste local à
l’appareil, sans synchronisation multi-équipage. Les camps d’exemple sont
fictifs et le tracé en segments directs ne valide pas la praticabilité du terrain.
