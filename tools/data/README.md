# Préparation des données

Les scripts Python de préparation et leurs dépendances restent dans ce dossier.
Ils ne sont pas nécessaires pour installer, démarrer ou construire le frontend.

- `marps_data/spec.py` : secteur de Jezero, URL amont, crédits, conditions d'usage.
- `marps_data/prepare.py` : télécharge, découpe et fige les données, puis écrit le manifeste.
- `marps_data/check.py` : valide hors ligne les données figées.
- `marps_data/geo.py` : arithmétique de grilles partagée (tuiles WMTS, fenêtre du DEM).

Depuis la racine du dépôt, avec [uv](https://docs.astral.sh/uv/) installé :

```sh
pnpm data:prepare   # réseau ; écrit apps/web/public/data
pnpm data:check     # hors ligne
pnpm data:test      # pytest
```

Pour changer le secteur, les zooms ou une source, modifier `spec.py`, relancer
`pnpm data:prepare`, puis commiter les données et le manifeste régénérés. Pour
ajouter une dépendance Python : `uv add --directory tools/data <paquet>==<version>`,
et commiter `uv.lock`. Voir le README racine, section « Données ».
