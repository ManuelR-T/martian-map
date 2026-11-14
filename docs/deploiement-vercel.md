# Déploiement statique Vercel

## État

La configuration du dépôt est prête dans `vercel.json`. La publication et la
connexion Git restent à effectuer : l'accès Vercel disponible pendant la
préparation a renvoyé `403 Not authorized`.

- URL de production : **non attribuée**, à remplacer ici par le domaine affiché
  dans Vercel après le premier déploiement réussi depuis `main`.
- Previews des PR : non vérifiées tant que l'intégration Git n'est pas connectée.
- Recette navigateur déployé et WMTS : en attente. Le socle actuel ne contient
  ni carte, ni requête WMTS, ni routeur ; ne pas déclarer ces contrôles réussis.

## Importer le dépôt

Dans [New Project](https://vercel.com/new), connecter le compte GitHub autorisé à
lire `ManuelR-T/martian-map`, puis importer ce dépôt.

| Réglage | Valeur |
| --- | --- |
| Root Directory | Racine du dépôt (`.`), pas `apps/web` |
| Framework Preset | Vite |
| Node.js Version | 24.x, compatible avec `engines` |
| Install Command | `pnpm install --frozen-lockfile` |
| Build Command | `pnpm --filter @marps/web... build` |
| Output Directory | `apps/web/dist` |
| Variables d'environnement | `ENABLE_EXPERIMENTAL_COREPACK=1` (Production et Preview) |
| Production Branch | `main` |

Les trois commandes/répertoires sont versionnés dans `vercel.json`. Le filtre
pnpm avec `...` inclut les dépendances internes de l'application : les packages
partagés sont vérifiés avant le build Vite. `packageManager` fixe pnpm 9.15.4.
Activer `ENABLE_EXPERIMENTAL_COREPACK=1` dans les environnements Production et
Preview pour que Vercel respecte cette version exacte, plutôt que sa version
pnpm 9.x par défaut. Cette variable configure le build, pas le bundle client.
Vérifier ces versions dans les logs du premier build.

Dans les paramètres Git du projet, vérifier la connexion au dépôt et la branche
de production `main`. L'intégration Vercel pour GitHub crée les déploiements de
preview pour les branches et PR ; elle publie les pushes de `main` en production.
Ouvrir une PR, vérifier le statut Vercel et visiter son URL de preview. Après
fusion, vérifier que le déploiement de production correspond au SHA de `main`,
puis reporter son domaine stable dans la section État. Les contrôles GitHub
Actions restent distincts : configurer leur obligation dans les règles de
branche si l'on veut bloquer une fusion en cas d'échec.

Aucun token Vercel n'est nécessaire dans GitHub Actions avec cette intégration.
Ne pas ajouter de secret dans `VITE_*` : ces variables sont publiques dans le
bundle. `.vercel/` et les fichiers `.env*` locaux sont ignorés par Git.

## Assets et données

Vite sert l'application à la racine du domaine (`base` par défaut `/`) ; les
références JS/CSS générées pointent vers `/assets/`. Les exports TypeScript des
packages partagés sont transformés et intégrés au bundle.

Le catalogue `@marps/data` est actuellement vide. `data/research/` contient les
sources de recherche et **n'est pas publié**. Pour intégrer un fichier statique,
le placer dans `apps/web/public/data/` (publié sous `/data/`) ou l'importer depuis
le code pour que Vite le traite. Ne pas faire référence à un chemin de fichier
local du dépôt depuis le navigateur. Vérifier chaque URL de données une fois
son intégration effectuée ; ne pas copier tout le dossier de recherche.

Il n'y a pas de routeur actuellement : seule `/` doit charger l'application.
Aucune réécriture globale n'est configurée. Si un routeur utilisant History API
est ajouté, ajouter les réécritures des routes applicatives vers `/index.html`
en préservant les erreurs 404 des assets et données manquants, puis vérifier
l'accès direct et le rechargement de chaque route.

## Démonstration locale reproductible

Avec Node 24.14.0 et pnpm 9.15.4, depuis la racine :

```sh
pnpm install --frozen-lockfile
pnpm --filter @marps/web... build
pnpm --filter @marps/web preview --host 127.0.0.1 --port 4173 --strictPort
```

Visiter `http://127.0.0.1:4173/`, puis recharger. Le texte Jezero, le calcul de
60 secondes et le panneau stylé confirment les imports des trois packages
partagés. Cette commande sert le bundle construit ; le serveur Vite preview
est uniquement destiné à la vérification locale.

## Recette sur chaque environnement déployé

1. Ouvrir directement `/` dans une nouvelle session, puis recharger. Vérifier
   l'affichage du socle et l'absence d'erreur dans la console.
2. Dans Réseau, désactiver le cache puis recharger : HTML, JS et CSS doivent
   répondre 200 avec leurs bons types MIME, sans référence à localhost.
3. Lorsque des données seront intégrées, vérifier leurs URL et leur contenu,
   les attributions et l'absence d'erreur 404 ou de réponse HTML à la place du JSON.
4. Lorsque la carte WMTS sera intégrée, vérifier depuis la preview **et** la
   production les capacités et les tuiles sur le domaine NASA utilisé : HTTPS,
   CORS autorisant la lecture depuis le site, codes HTTP et images attendues.
   Un simple téléchargement depuis le terminal ne valide pas CORS.
5. Bloquer le domaine de tuiles dans les outils du navigateur et recharger :
   vérifier qu'un message visible explique l'échec réseau et permet de réessayer.
   Ce comportement devra être implémenté avec la carte, absente du socle actuel.
6. Vérifier qu'aucun secret n'a été ajouté au code, aux fichiers publics ou aux
   variables `VITE_*` du projet.

Consigner l'URL, le SHA, la date, le navigateur et les résultats dans la section
État ; laisser les contrôles absents en attente.

## Retour à une version précédente

Dans le projet Vercel, ouvrir **Deployments**, choisir un déploiement de
production antérieur connu comme fonctionnel et utiliser **Instant Rollback**
(si disponible pour le compte). Vérifier le domaine de production, recharger
sans cache et refaire la recette ci-dessus. Le rollback réaffecte le domaine
au déploiement existant ; il ne corrige pas la branche Git.

Pour conserver la correction dans Git, ouvrir ensuite une PR qui annule le
commit fautif, faire passer la CI puis fusionner dans `main`. Si le rollback
n'est pas disponible, cette PR et son nouveau déploiement constituent la
procédure de repli. Ne pas supprimer les anciens déploiements fonctionnels.

## Références

- [Configuration vercel.json](https://vercel.com/docs/project-configuration/vercel-json)
- [Intégration GitHub et previews](https://vercel.com/docs/git/vercel-for-github)
- [Retour à un déploiement précédent](https://vercel.com/docs/deployments/rollback-production-deployment)
- [Déploiement statique Vite](https://vite.dev/guide/static-deploy.html)

## Dépannage : versions incompatibles

Si les logs affichent `ERR_PNPM_UNSUPPORTED_ENGINE`, par exemple pnpm 9.15.9
au lieu de 9.15.4 et Node 26 au lieu de 24 :

1. Régler Root Directory sur la racine du dépôt, pas `apps/web`.
2. Dans Settings → Build and Deployment, choisir Node.js 24.x.
3. Ajouter `ENABLE_EXPERIMENTAL_COREPACK=1` dans les variables du projet
   pour Production et Preview.
4. Vérifier les commandes du tableau ci-dessus puis redéployer sans réutiliser
   le cache de build. Le déploiement doit utiliser un commit contenant
   `vercel.json` à la racine.

Ne pas désactiver `engine-strict` pour contourner ces erreurs.

Référence : [Corepack sur Vercel](https://vercel.com/docs/builds/configure-a-build).
