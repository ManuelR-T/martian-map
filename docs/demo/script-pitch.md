# Script du pitch (#17)

Présentation de 4 min 20 s dans un créneau de 5 min, suivie de 4 min de questions du jury. Une personne raconte, une autre manipule la tablette. La démo suit [la mission de démonstration](mission-demo.md). La version de 30 s sert de base à la vidéo de secours.

Format Space Apps 2025 : une vidéo de 30 s au plus ou 7 diapositives au plus ; ce format n'est pas vérifié pour 2026.

**Fil rouge :** sur Mars, Houston répond trop tard. La seule aide en direct vient du coéquipier resté dans l'habitat, sur Mars, et sa carte, c'est Marps.

Léa, Sam et Noor sont des personnages inventés pour l'histoire.

## Présentation en direct : 4 min 20 s

### 0:00–0:30 · L'accroche

- À l'écran : écran noir, puis la carte globale de Mars.
- À dire :
  - Sol 47, cratère Jezero. Léa et Sam enfilent leur combinaison.
  - Ils vont marcher 1,5 km vers une roche qui pourrait garder des traces de vie ancienne.
  - S'ils ont un problème à 500 m du camp, Houston l'apprendra dans 12 minutes. Sa réponse mettra encore 12 minutes à arriver.
  - Sur Mars, la seule aide en direct, c'est Noor, restée dans l'habitat. Et sa carte, c'est Marps.

### 0:30–1:10 · La veille : choisir où aller

- À l'écran : le zoom sur Jezero, l'imagerie HiRISE, les trois sites, puis la fiche d'Amalik avec la photo du rover.
- À dire :
  - La veille, l'équipage prépare la sortie. Ici, Perseverance a déjà prélevé trois roches.
  - Amalik est une roche argileuse, la plus apte à conserver des molécules organiques.
  - La fiche montre la photo prise par le rover : sur place, l'équipage saura quoi chercher.
  - Elle dit aussi ce que le rover a déjà fait, pour ne pas le refaire.

### 1:10–2:00 · Une carte, quatre missions NASA

- À l'écran : activer tour à tour le relief ombré, l'infrarouge de nuit et la trace de Perseverance. Ouvrir le profil du parcours et survoler un passage rouge.
- À dire :
  - Chaque couche répond à une question de l'équipage.
  - Où je vais ? Les images de la sonde Mars Reconnaissance Orbiter.
  - Est-ce que ça monte ? Le relief et le profil du parcours. En rouge, les passages de plus de 10°.
  - Je survole une pente sur le profil : Marps me montre où elle est sur le terrain.
  - Est-ce que le sol est dur ? L'infrarouge de nuit de Mars Odyssey. La nuit, la roche garde la chaleur et le sable la perd.
  - Où le rover est-il passé ? La trace de Perseverance.
  - Avec la carte globale de Mars Global Surveyor, ça fait quatre missions sur une même carte.

### 2:00–2:50 · Le dilemme

- À l'écran : le budget à +30 min, l'ajout du 2e prélèvement à Amalik, l'alerte à −20 min, Skinner Ridge réduit à des photos, la marge à +25 min.
- À dire :
  - Six heures dehors, dont une heure de réserve. Le plan tient : 30 minutes de marge.
  - Mais Amalik est la meilleure chance de la journée. L'équipe veut un 2e échantillon.
  - 50 minutes de plus : la marge tombe à moins 20. Marps l'affiche tout de suite.
  - Que sacrifier ? À Skinner Ridge, le rover a déjà carotté deux fois. On y fera seulement des photos.
  - La marge remonte à plus 25. La décision reste à l'équipage, et Marps lui montre le prix de chaque choix.

### 2:50–3:40 · Le jour de la sortie

- À l'écran : le mode « En mission ». On coche une tâche de Wildcat Ridge, puis on déclenche l'alerte radiation simulée.
- À dire :
  - Le jour même, Léa décrit la roche à la radio. Noor coche la tâche sur la tablette.
  - Dehors, avec des gants pressurisés, un écran tactile est presque inutilisable. La tablette reste donc dans l'habitat.
  - Soudain, une alerte radiation. Marps affiche l'ordre « Rentrer au camp maintenant », le temps de retour, 27 minutes, et ce qu'on abandonne. Noor le transmet à la radio.
  - Nous n'avons aucune mesure de radiation à Jezero. Ce scénario est donc simulé, et l'écran l'indique.

### 3:40–4:20 · La conclusion

- À l'écran : retour à la carte de Jezero avec ses couches, puis le panneau des sources.
- À dire :
  - Toutes ces données sont publiques, de la NASA et de l'USGS. Chaque chiffre dit s'il est mesuré, calculé ou supposé.
  - Après une première visite, l'application et le secteur préparé fonctionnent sans réseau.
  - Les premiers humains sur Mars décideront seuls.
  - Marps leur donne la carte que Houston ne pourra pas leur donner à temps.

### Ce qui doit être mergé pour chaque scène

| Scène | Tickets nécessaires | Sinon |
| --- | --- | --- |
| Une carte, quatre missions NASA | #15 pour le relief et le profil, #22 pour l'infrarouge | Passer la couche absente sous silence. |
| Le dilemme | #11 à #14 pour la mission, le parcours et le budget | Captures ou vidéo de secours. |
| Le jour de la sortie | #26 pour l'alerte | Garder seulement la tâche cochée. |

## Version de 30 s (vidéo de secours)

### 0:00–0:08

- À l'écran : la carte globale, puis le zoom sur Jezero.
- À dire : sur Mars, Houston répond avec 24 minutes de retard. L'aide en direct vient de l'habitat.

### 0:08–0:16

- À l'écran : les couches activées l'une après l'autre.
- À dire : images, relief, infrarouge, trace du rover : quatre missions NASA sur une seule carte.

### 0:16–0:24

- À l'écran : le 2e prélèvement à Amalik, l'alerte à −20, l'adaptation à +25.
- À dire : un échantillon de plus ? Marps montre ce qu'il coûte, et quoi sacrifier.

### 0:24–0:30

- À l'écran : la carte de Jezero.
- À dire : Marps, la carte que Houston ne pourra pas leur donner à temps.

## Questions probables du jury

- **Pourquoi la tablette reste-t-elle dans l'habitat ?**
  La NASA juge l'écran tactile peu pratique avec un gant de sortie : un gant pressurisé réduit fortement la dextérité. L'astronaute parle à la radio, et le coéquipier dans l'habitat suit la sortie sur la tablette. Les sources sont dans `docs/justification-des-choix.md`.
- **Une sortie de 6 h et des arrêts de 75 min, c'est réaliste ?**
  Apollo 17 prévoyait 7 h par sortie et des arrêts de 30 à 66 min. Les essais NASA BASALT faisaient 2 à 3 arrêts par sortie de 4 h. La répartition d'un arrêt en tâches reste notre hypothèse.
- **Pourquoi des lignes droites entre les arrêts ?**
  Le tracé relie les arrêts en ligne droite. Personne n'a vérifié ce chemin sur le terrain, et le relief à 4 m ou à 20 m ne montre pas chaque rocher.
- **Et l'oxygène, la météo, les radiations ?**
  L'oxygène et la météo en direct ne sont pas modélisés. L'alerte radiation est un scénario simulé, car aucun instrument ne mesure les radiations à Jezero : l'instrument RAD de Curiosity est dans le cratère Gale. La marge est un budget de temps calculé sous hypothèses. Elle ne garantit pas le retour.
- **Ça marche sans réseau ?**
  Oui pour l'application et le secteur préparé, après une première visite en HTTPS. Les images NASA consultées hors du secteur ne sont pas garanties hors ligne.
- **D'où viennent les données ?**
  De la NASA et de l'USGS, figées dans le dépôt. Chaque jeu de données a sa source, son instrument, sa résolution et une empreinte de fichier dans un manifeste. Les crédits sont dans [credits-donnees.md](credits-donnees.md).
- **L'infrarouge THEMIS donne la température ?**
  Non. Les niveaux de gris nocturnes reflètent surtout la capacité du sol à garder la chaleur. Ils ne se lisent pas en degrés.
