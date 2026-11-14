# Marps

Application statique de préparation de sorties scientifiques sur Mars. Le MVP
cible Jezero ; l'écran de planification est en place, mais ni la carte ni les
données scientifiques ne sont encore intégrées. React, TypeScript, Vite,
OpenLayers, Tailwind CSS et shadcn/ui sont installés dans un workspace pnpm privé.

## Installation

Utiliser **Node 24.14.0** (fichiers `.nvmrc` et `.node-version`) et
**pnpm 9.15.4**, fixé par `packageManager`. Les versions des dépendances directes
sont exactes et le dépôt conserve un seul `pnpm-lock.yaml` à la racine.

Avec nvm et Corepack :

```sh
nvm install
nvm use
corepack enable
corepack prepare pnpm@9.15.4 --activate
pnpm install --frozen-lockfile
```

Si Corepack n'est pas installé avec votre distribution Node, installer d'abord
`corepack@0.34.6` avec `npm install --global corepack@0.34.6`.
Ne pas utiliser npm ou Yarn pour installer les dépendances du projet.
Les plages `engines` et `engine-strict` refusent les versions incompatibles.

## Commandes depuis la racine

```sh
pnpm dev        # Vite, http://localhost:5173 (ou le port libre suivant)
pnpm build      # Vérifie les packages puis produit apps/web/dist
pnpm lint       # ESLint, aucun avertissement accepté
pnpm typecheck  # TypeScript strict pour chaque package
pnpm test       # Vitest, tests des calculs purs
```

Pour servir localement le résultat statique après un build :
`pnpm --filter @marps/web preview`.
Aucun serveur métier, base de données ou traitement Python n'est requis.

## Responsabilités et dépendances

| Répertoire | Responsabilité | Dépendances internes |
| --- | --- | --- |
| `apps/web` | Composition React, intégration OpenLayers, interactions navigateur | `mission-core`, `data`, `ui` |
| `packages/mission-core` | Types métier et calculs purs, sans framework, DOM ni accès réseau | Aucune |
| `packages/data` | Contrats et catalogue des données préparées, provenance | `mission-core` (types) |
| `packages/ui` | Système de design : jetons, composants shadcn/ui et composants de mission | Aucune |
| `tools/data` | Futurs scripts Python de préparation, hors workspace pnpm | Aucune |

Le catalogue scientifique est vide jusqu'à l'intégration des données (#6).
Les coordonnées de Jezero sont des métadonnées d'orientation approximatives.
Les coordonnées métier sont en degrés planétocentriques, longitude positive vers
l'est ; les durées sont en secondes. Les calculs de mission complets relèvent des
tâches suivantes.

## Interface et système de design

Sur l'écran de planification (`apps/web`), la carte occupe toute la surface
sous le bandeau. Le sélecteur de vue (globale ou Jezero), les étapes, le budget
de temps et la fiche de site flottent par-dessus ; chaque panneau se replie par
son titre pour dégager la carte. Sous 1024 px, la carte reste en haut et les
panneaux défilent dessous. Tant que leurs données ne sont pas intégrées, ces
emplacements affichent un état explicite. La page `#/systeme-design` de l'application montre les jetons, les
composants et ces états, avec des contenus d'exemple signalés comme tels.

- **Un seul état partagé.** `apps/web/src/state/planner.ts` contient le
  réducteur et les sélecteurs, testables sans React ; `PlannerProvider` les
  expose par Context. Les panneaux lisent cet état et ne recalculent rien : le
  budget arrive déjà calculé par `mission-core` (#14), puis mis en forme.
- **Quatre états de données.** `DataState` couvre chargement, erreur, absence de
  données et couverture insuffisante. Toute zone qui dépend de données en
  affiche un plutôt qu'un vide.
- **Couleurs.** Les jetons de `packages/ui/src/styles.css` forment deux
  familles, désaturées pour rester calmes, en thème clair et sombre. Le bleu
  (`--primary`) et le marine (`--header`), dérivés du bleu NASA `#0B3D91`,
  portent l'interface et les actions. Les teintes de Mars marquent le terrain
  et les repères : rouille (`--mars`), poussière (`--mars-surface`), neutres
  chauds le jour et basalte la nuit. `tokens.test.ts` échoue si une paire
  texte/fond passe sous 4,5:1 ou une bordure de contrôle sous 3:1.
- **Accessibilité.** Un état ne repose jamais sur la seule couleur : il porte
  aussi une icône, un texte ou un motif. Le focus clavier est un contour plein
  de 3 px défini une fois dans `styles.css` ; ne pas le retirer d'un composant.
- **Typographie.** Public Sans pour le texte, Archivo élargi pour les titres
  (`heading-display`) et les libellés courts en capitales (`label-caps`),
  servis depuis le bundle, sans appel externe.
- **Formes.** Esprit console de mission : angles droits, aucune ombre, panneaux
  à bandeau de titre et filet supérieur rouille, boutons et badges en aplats. Ne pas
  réintroduire de coins arrondis ni d'ombres portées sur un composant.

Pour ajouter un composant shadcn/ui, lancer le CLI depuis `packages/ui` :

```sh
pnpm dlx shadcn@4.23.0 add dialog
```

Puis, dans le fichier généré : remplacer les imports `@/…` par des imports
relatifs (ESLint les refuse, Vite ne les résout pas depuis `apps/web`),
vérifier que le CLI n'a pas ajouté de dépendance `cn` à `package.json`,
retirer les classes `outline-none` et `focus-visible:ring-*` au profit du focus
global, et exporter le composant depuis `src/index.ts`.

## Conventions

- Tous les packages sont privés. Toute dépendance interne utilise `workspace:*`.
- Importer les API publiques par `@marps/mission-core`,
  `@marps/data` ou `@marps/ui`, sans chemin vers leurs fichiers internes.
- Les exports des packages partagés pointent vers les sources TypeScript : Vite
  et Vitest les transforment directement. Aucun build préalable ni watcher des
  packages n'est nécessaire au développement. Leurs builds vérifient les types ;
  seul `apps/web` émet le bundle déployable. Ces packages ne sont pas destinés à
  être exécutés directement par Node ou publiés.
- Garder le graphe ci-dessus sans cycle ; aucun package ne dépend de `apps/web`.
  ESLint interdit les imports de React, OpenLayers et des autres packages internes
  dans `mission-core`. Les API du navigateur n'y sont pas incluses par TypeScript.
- Placer les tests `*.test.ts` près des calculs ; `pnpm test` les découvre depuis
  la racine. Ne pas remplacer des données manquantes par des données fictives
  présentées comme scientifiques.
- Importer les styles partagés via `@marps/ui/styles.css`. Les styles
  OpenLayers sont importés par l'application, qui possède cette dépendance.
  Tailwind est compilé par le plugin Vite de `apps/web` ; les classes utilisées
  dans `packages/ui/src` sont détectées par la directive `@source` de ce fichier.

## Variables et déploiement

Aucune variable d'environnement n'est requise. Les futures variables `VITE_*`
seront publiques et intégrées au bundle : ne jamais y placer de secret.
Documenter chaque nouvelle variable et fournir un `.env.example` si nécessaire.
Les fichiers `.env*` locaux sont ignorés. Le déploiement doit servir le contenu de
`apps/web/dist` ; la CI et la configuration Vercel relèvent de #3 et #4.

Références : [workspaces pnpm](https://pnpm.io/workspaces),
[guide Vite](https://vite.dev/guide/).
