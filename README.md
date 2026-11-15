# Marps

Application statique de préparation de sorties scientifiques sur Mars. Le MVP
cible Jezero ; l'écran de planification est en place et les données du MVP sont
figées avec leur manifeste, mais la carte n'est pas encore intégrée. React,
TypeScript, Vite, OpenLayers, Tailwind CSS et shadcn/ui sont installés dans un
workspace pnpm privé.

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
pnpm test       # Vitest, tests des calculs purs et du manifeste figé
pnpm data:prepare  # Télécharge et fige les données (réseau, voir « Données »)
pnpm data:check    # Valide hors ligne les données figées et le manifeste
pnpm data:test     # pytest, tests des scripts de préparation
```

Pour servir localement le résultat statique après un build :
`pnpm --filter @marps/web preview`.
Aucun serveur métier, base de données ou traitement Python n'est requis.

## Responsabilités et dépendances

| Répertoire | Responsabilité | Dépendances internes |
| --- | --- | --- |
| `apps/web` | Composition React, intégration OpenLayers, interactions navigateur | `mission-core`, `data`, `ui` |
| `packages/mission-core` | Types métier et calculs purs, sans framework, DOM ni accès réseau | Aucune |
| `packages/data` | Contrats du manifeste (région, site, source), lecture du manifeste et règle de couverture | `mission-core` (types) |
| `packages/ui` | Système de design : jetons, composants shadcn/ui et composants de mission | Aucune |
| `tools/data` | Scripts Python de téléchargement, préparation et validation, hors workspace pnpm | Aucune |

Le catalogue scientifique est le manifeste `apps/web/public/data/manifest.json`
(voir « Données »).
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

## Données

Les données du MVP sont **figées dans le dépôt** sous `apps/web/public/data`
(environ 6,0 Mo) et servies en statique à l'adresse `/data/`. `pnpm build`,
`pnpm test` et l'application ne contactent jamais NASA ni USGS.

| Jeu de données | Livraison | Contenu |
| --- | --- | --- |
| `mola-colorized-relief` | distante (Trek) | Fond mondial d'orientation, non figé |
| `jezero-hirise-mosaic` | figée | Tuiles HiRISE WMTS, zooms 12 à 16, sur le secteur |
| `jezero-hirise-dem`, `-slope`, `-hillshade` | figée | Altitudes, pentes et relief ombré HiRISE, agrégés à 4 m |
| `jezero-ctx-dem`, `-slope`, `-hillshade` | figée | Les mêmes grilles à 20 m (CTX), en repli |
| `jezero-sampling-sites` | figée | Skinner Ridge, Wildcat Ridge et Amalik (GeoJSON NASA) |
| `jezero-themis-night-ir` | figée | Infrarouge de nuit THEMIS (Mars Odyssey), 4 tuiles du niveau 9 couvrant toute la mosaïque HiRISE ; contraste qualitatif, pas une température |

Le manifeste sépare l'**orientation globale** (région `global`) du **détail de
Jezero** (région `jezero`). Chaque capacité (`imagery-hirise`, `terrain-dem`,
`terrain-slope`, `science-sites`, `thermal-themis`…) porte son statut ; une capacité non préparée
est `unavailable` avec sa raison. Un fond ne peut jamais activer une donnée
absente : `capabilityStatus` de `@marps/data` ne retient que les jeux déclarés
pour la région demandée et prend le statut le plus faible.

Chaque jeu de données conserve identifiant, URL, instrument, date/sol, unités,
CRS, emprise (degrés planétocentriques, longitude positive vers l'est),
résolution, statut, version de la source, crédit, conditions d'usage, empreinte
SHA-256 de la source amont et de chaque fichier figé. Une valeur inconnue reste
`null` (date, sol, datum vertical) ; une absence de donnée n'est jamais convertie
en zéro : pixels transparents pour les images, `NaN` pour l'altitude et la pente.

Altitudes et pentes sont des grilles float32 (`NaN` = pas de donnée) dont le
manifeste donne l'origine, le pas, la projection et le datum vertical.
`terrainDataset`, `loadGrid` et `sampleGrid` de `@marps/data` les lisent ; HiRISE
est préféré, CTX prend le relais s'il manque. La taille de maille n'est pas une
précision de navigation. Détails et limites : [`docs/relief-jezero.md`](docs/relief-jezero.md).

### Préparer et vérifier

La préparation est une étape explicite. Elle demande [uv](https://docs.astral.sh/uv/)
et accède au réseau ; l'environnement Python est reproductible grâce à
`tools/data/pyproject.toml` (versions exactes) et `tools/data/uv.lock`.

```sh
pnpm data:prepare   # télécharge, découpe, calcule les empreintes, écrit le manifeste
pnpm data:check     # relit les fichiers figés, sans réseau
pnpm data:test      # tests des scripts
```

`data:prepare` écrit dans un dossier temporaire, valide, puis remplace
`apps/web/public/data` ; un échec réseau ou de validation laisse les données
actuelles intactes. Le DEM CTX et le bloc de lignes lu dans le DEM HiRISE (103 Mo
sur 1,8 Go, par requête `Range`) sont mis en cache dans `tools/data/.cache` (ignoré
par Git) et leur empreinte est vérifiée : si une source amont change, la préparation
s'arrête pour revue. Le secteur, les URL et les crédits sont dans
`tools/data/marps_data/spec.py`.

`data:check` contrôle : champs requis, emprises et coordonnées valides, sites dans
le secteur, tailles et empreintes des fichiers, unités, `NaN` des altitudes
(aucune valeur sentinelle), pixels transparents, transformation des grilles,
présence de chaque site sur une maille valide, pentes entre 0° et 90° sur la même
grille que leurs altitudes, et cohérence statut/capacités.
Les notes de recherche sont dans [`docs/`](docs/) et les échantillons de contrôle
dans [`data/research/`](data/research/).

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

## Global Mars map and offline use (#7)

The map is mounted in #5's `MapStage`, uses `PlannerProvider` view state, and
consumes #6's dataset descriptors. The existing planner, design system, French
interface, theme and panels are preserved. The app opens on the interactive global Mars
view; drag to pan and use the wheel or lower-right zoom controls to explore.
“Mars entière” restores the full-planet extent; the Jezero marker or “Ouvrir Jezero” returns to
the detailed sector. Detailed planning remains unavailable outside Jezero.

MOLA uses the manifest's NASA Trek URL and attribution, with a planetocentric
geographic grid registered as `MARS:104905` (NASA identifier
`urn:ogc:def:crs:EPSG::104905`). Origin: −180°, 90°; 256-pixel tiles;
2 × 1 tiles at level 0; source levels 0–7. No Earth Web Mercator or Earth distance
calculation is used. Two bundled NASA level-0 JPEGs under `public/data/mola`
provide a coarse global overview without NASA connectivity. The nominal
463 m/pixel source sampling does not describe that overview's resolution.

Jezero entry displays the prepared local HiRISE tiles using the manifest's
extent, zoom ranges, URLs, and credit. It never requests a local tile outside
the frozen ranges. Further detailed-map tools and site overlays belong to #8/#9.
The approximate global Jezero marker is not used as a scientific site coordinate.

Production builds precache all final assets, fonts, lazy-loaded design-system
code, the manifest, and prepared local datasets. After the French offline-ready
message appears, reload works with internet disconnected. First installation
requires a connection or distribution of the static build over a local server;
HTTPS or localhost is required for service workers. Development mode does not
install a worker. Browser storage clearing/eviction requires preparing again.
Successfully fetched additional global MOLA tiles are cached with a 180-tile
limit; unvisited detail falls back to the bundled overview. This is not a complete
high-resolution planetary download or a guarantee of mission suitability.

Installation failure shows an error and retry action; a stalled installation
times out after 30 seconds. Waiting updates ask users to close all app tabs and
reopen. Cache versions hash worker logic and every final file, including HTML and
public data. Regular CI tests cover failure/timeout/update states, public-data
and HTML invalidation, and cached navigation/assets without network access.

Source of the bundled overview, verified 2026-11-14: NASA / JPL-Caltech / GSFC,
MGS MOLA, distributed by NASA Trek:
https://trek.nasa.gov/tiles/Mars/EQ/Mars_MGS_MOLA_ClrShade_merge_global_463m/1.0.0/WMTSCapabilities.xml

Local validation: lint, typecheck, 148 JavaScript tests, production build, the
frozen-data integrity check, and 19 Python tests pass. Headless Chromium verified
the planner shell, global/Jezero navigation, rendered local imagery, all 108
precached resources, reload without internet, mobile width, and no page errors
or local 404s with NASA blocked. Live NASA JPEGs returned HTTP 200; retry
recovered after restoring the blocked service, and keyboard navigation emitted
only in-range global tile URLs. A deployed check of this feature branch remains
pending publication; earlier `dev` deployments do not contain this implementation.

## Tablet and wrist layouts

Below 1280 CSS pixels, or on screens at most 600 pixels high, use the Carte /
Mission navigation. Carte keeps the map within the viewport; Mission exposes the
existing panels in a separate scrollable area. On very small wrist displays,
settings and theme controls remain accessible in Mission. Map options and source
information open from “Carte et sources”; zoom stays above attribution.

Map controls and compact navigation/view selectors have targets at least 44 × 44
CSS pixels. Coarse-pointer devices also receive larger shared controls. The map
viewport owns pan/pinch gestures; mission panels and options scroll independently.
No viewport setting disables browser zoom.

Browser viewport checks covered 240×240, 320×320, 390×844, 768×1024, 1024×768,
844×390, and 1280×800. Compact map controls remain visible without horizontal
scroll or control overlap. Mission panels and map options remain accessible;
map dragging and zoom were exercised. The production worker cached the 108 built
resources, including responsive styles and the prepared datasets. These checks
use browser simulation; physical tablet/wrist hardware and glove input remain
unverified.

## Jezero mosaic exploration (#8)

The Jezero view starts at the prepared mission sector and allows exploration of
NASA's full declared HiRISE footprint (77.2229331–77.583964° E,
18.3067994–18.669315° N), at WMTS levels 0–17. The pinned capabilities supply
product bounds and matrix dimensions through optional manifest `wmts` metadata.
Existing schema-2 readers remain compatible. The 91 prepared tiles at levels
12–16 retain their original local paths and integrity hashes; other valid tiles
use the NASA template, with at most eight simultaneous map tile loads and a
15-second request timeout. Retry and return-to-prepared-sector actions remain
available after failures. The Mars/Jezero switch preserves planner state.

Yellow outlines mark product bounds, blue dashes the mission sector, and white
point outlines the prepared tile envelope at the current integer zoom. Patterned
background means no displayed image; a transparent pixel or a failed request is
not evidence of navigable terrain. Scientific capabilities remain scoped to the
original mission sector. The three manifest sites select their existing sheets;
overlapping touch hits offer a named choice.

The 100 CSS-pixel scale uses the manifest Mars radius (3,396,190 m), angular
resolution and cosine of the center latitude. Coordinates are planetocentric,
east-positive longitude/latitude. Nominal 0.25 m/pixel source sampling is distinct
from displayed sampling and does not establish positioning accuracy.

Production installation includes prepared resources. Extra streamed HiRISE tiles
are not promised after offline reload: their bounded persistence belongs to #24.
NASA connectivity is optional for the prepared-sector workflow. Validate browser
rendering, disconnected reload, and physical tablet/glove interaction before
operational use; these have not been exercised for this implementation.

### Perseverance historical context (#20)

The Jezero sector panel includes an optional Perseverance history toggle. It
shows NASA-published positions and separate drive segments, not a validated
human route or current telemetry. Select a feature on the map or use the
keyboard-accessible list to inspect its sol/RMC. Overlapping rover hits narrow
the list; science sites keep selection priority. Mission steps are unaffected.

The prepared extract includes complete segments intersecting the mission sector
and their available endpoint waypoints. Outside it, missing history means no
prepared data, not evidence that the rover never visited. Original source
coordinates are preserved; five endpoint discrepancies are listed in the
snapshot quality details. No snapping, gap filling, site substitution or vertical
alignment is performed. CRS84 in the upstream metadata is interpreted explicitly
as Mars planetocentric east-positive longitude/latitude, not Earth coordinates.

History files ship with the production PWA and are included in its versioned
precache. After a successful online/local installation and offline-ready status,
the layer needs no NASA connection. Failed history loads offer retry without
blocking imagery or the mission. Production offline/tablet interaction still
requires acceptance testing; the automatic checks do not establish it.
