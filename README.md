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
`apps/web/dist` ; la CI et la configuration Vercel relèvent de #3 et #4.

Références : [workspaces pnpm](https://pnpm.io/workspaces),
[guide Vite](https://vite.dev/guide/).
