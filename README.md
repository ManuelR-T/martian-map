# Marps

Application statique de préparation de sorties scientifiques sur Mars. Le MVP
cible Jezero ; ce premier socle ne fournit encore ni carte ni données scientifiques.
React, TypeScript, Vite et OpenLayers sont installés dans un workspace pnpm privé.

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
| `packages/ui` | Composants React et styles partagés | Aucune |
| `tools/data` | Futurs scripts Python de préparation, hors workspace pnpm | Aucune |

Le catalogue scientifique est vide jusqu'à l'intégration des données (#6).
Les coordonnées de Jezero sont des métadonnées d'orientation approximatives.
Les coordonnées métier sont en degrés planétocentriques, longitude positive vers
l'est ; les durées sont en secondes. Les calculs de mission complets relèvent des
tâches suivantes.

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

## Variables et déploiement

Aucune variable d'environnement n'est requise. Les futures variables `VITE_*`
seront publiques et intégrées au bundle : ne jamais y placer de secret.
Documenter chaque nouvelle variable et fournir un `.env.example` si nécessaire.
Les fichiers `.env*` locaux sont ignorés. Le déploiement doit servir le contenu de
`apps/web/dist`. La configuration à la racine est dans `vercel.json` ; voir le
[guide de déploiement](docs/deploiement-vercel.md) pour les previews, la recette
et le retour à une version précédente.

## Intégration continue

Le workflow [CI](.github/workflows/ci.yml) s'exécute sur chaque pull request et
chaque push sur `main`. Il lit Node dans `.node-version` et pnpm dans
`package.json`, installe avec `--frozen-lockfile`, puis exécute depuis la racine
`pnpm lint`, `pnpm typecheck`, `pnpm test` et `pnpm build`.
Le cache du store pnpm dépend de `pnpm-lock.yaml` ; l'installation reste obligatoire.
Une erreur arrête le job. Seule la lecture du dépôt est autorisée.

Après succès, l'artefact `web-dist` contient `apps/web/dist` et reste disponible
sept jours dans la page du run GitHub Actions. Les tests utilisent des entrées
locales, sans secret ni appel NASA. Le socle teste actuellement les unités de
durée ; les tests de retour, distances et données absentes accompagneront le
moteur de mission dans ses issues dédiées.

Pour reproduire les contrôles, partir d'un clone propre, suivre l'installation
ci-dessus puis lancer les quatre commandes dans cet ordre. Pour vérifier la
détection des régressions, ajouter temporairement une affectation TypeScript
incompatible dans `mission-core` : `pnpm typecheck` doit échouer. Remplacer
temporairement le facteur `60` de `minutesToSeconds` par `59` doit faire échouer
`pnpm test`. Annuler ces modifications avant de relancer les contrôles.

Références : [workspaces pnpm](https://pnpm.io/workspaces),
[guide Vite](https://vite.dev/guide/).
