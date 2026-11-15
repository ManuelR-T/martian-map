# Checklist de validation de la démo (#17)

À dérouler quand #11, #12, #13, #14, #15 et #16 sont fusionnés. Les valeurs attendues viennent de [la mission de démonstration](mission-demo.md). Une case cochée veut dire « vu dans l'application », pas « prévu ».

## Où tester

| Écran | Taille | Pourquoi |
| --- | --- | --- |
| Production : <https://marps.vercel.app/> | 1920 × 1080 | Écran de présentation, projeté devant le jury. |
| Production : <https://marps.vercel.app/> | 1024 × 768 | Tablette en paysage, l'usage visé dans l'habitat. |
| Développement : <https://martian-map-dev.vercel.app/> | Les deux tailles | Répétition avant la mise en production. |

## Parcours de la démo

| ✓ | Étape | Attendu |
| --- | --- | --- |
| [ ] | Ouvrir l'application | Carte globale MOLA ; l'indicateur hors ligne dit où en est l'installation. |
| [ ] | Entrer dans Jezero | Imagerie HiRISE ; limite du secteur de mission visible ; retour possible à la vue globale. |
| [ ] | Sortir du secteur | Message « imagerie uniquement » ; ni relief ni planification. |
| [ ] | Poser le camp à 77,4095° E, 18,4513° N | Camp affiché comme position fictive. |
| [ ] | Ajouter Skinner Ridge, Wildcat Ridge, Amalik | Même ordre sur la carte et dans la liste. |
| [ ] | Régler 360 min, réserve 60 min, 2 km/h, arrêts de 75 min | Distance 1 499 m (± 1 m) ; marche 45 min ; retour 14 min affiché à part. |
| [ ] | Lire la marge | +32 min. |
| [ ] | Passer Amalik à 125 min (2e prélèvement) | Marge −18 min ; alerte en texte et en couleur. |
| [ ] | Passer Skinner Ridge à 30 min | Marge +27 min ; l'alerte disparaît. |


## Contrôles

| ✓ | Contrôle | Attendu |
| --- | --- | --- |
| [ ] | Retour compté une fois | Marche totale = 45 min, pas 45 + 14. |
| [ ] | Carte, liste et profil synchronisés | Réordonner ou supprimer un arrêt met à jour les trois sans tracé périmé. |
| [ ] | Profil d'altitude | Même relief sur tout le tracé ; lacunes affichées, jamais comblées en silence. |
| [ ] | Données visibles | Source, résolution et date de chaque couche accessibles ; tracé marqué hypothétique. |
| [ ] | Limites de couverture | Hors secteur, l'application le dit au lieu d'inventer des données. |
| [ ] | Crédits | Conformes à [credits-donnees.md](credits-donnees.md). |

## Réseau absent ou lent

Dans les outils de développement du navigateur, onglet Réseau.

| ✓ | Situation | Attendu |
| --- | --- | --- |
| [ ] | Hors ligne, après une première visite | Application et secteur préparé utilisables ; message clair pour les zones non téléchargées. |
| [ ] | Hors ligne, première visite | Message d'erreur compréhensible, jamais un écran vide. |
| [ ] | Connexion lente | État de chargement visible ; aucun écran vide sans explication. |
| [ ] | Dans tous les cas | Aucun texte ne promet un cache hors ligne au-delà du secteur préparé (#24). |

## Tests automatiques

| ✓ | Élément | Attendu |
| --- | --- | --- |
| [ ] | Tests unitaires du moteur | `pnpm test` passe dans la CI de chaque pull request. |
| [ ] | Tests d'intégration du parcours critique | Ajout de la mission, dépassement à −18 min, adaptation à +27 min, retour compté une fois. Ils restent à écrire après #12 et #14. Le dépôt n'a aujourd'hui que Vitest, sans outil de test dans un vrai navigateur. |

## Vidéo de secours

| ✓ | Élément | Attendu |
| --- | --- | --- |
| [ ] | Enregistrer le parcours | Suivre la [version de 30 s](script-pitch.md#version-de-30-s-vidéo-de-secours) en 1920 × 1080, sur l'URL de production. |
| [ ] | Rendre la vidéo accessible | Lien public hors du site Space Apps, et une copie hors ligne sur l'ordinateur de présentation. |
