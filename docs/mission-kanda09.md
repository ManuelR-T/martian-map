# Planificateur de mission — tickets Kanda09

Cette branche implémente #11, #13, #14, #18, #19, #25 et #32. Aucun ticket n'est fermé automatiquement.

## Utiliser les fonctionnalités

Dans Jezero, ouvrir « Mission et étapes ». Placer un camp fictif par latitude/longitude dans l'emprise du manifeste, ajouter un site NASA ou une étape libre, puis des activités. Les visites répétées sont indépendantes. Les flèches changent l'ordre des visites. La carte, ses clics et le profil de relief restent aux issues #7, #8, #12 et #15 : ils ne sont pas présentés comme intégrés.

Le budget distingue marche d'exploration, retour, activités et réserve. Modifier une valeur puis quitter le champ valide la modification. Une valeur refusée conserve le paramètre précédent et affiche une erreur. La formule est : disponible − marche totale − activités − réserve. Le retour n'est déduit qu'une fois. Les durées internes sont en secondes, les contrôles en minutes, les distances exposées en mètres et kilomètres, et la vitesse en km/h.

Le scénario initial est 360 minutes disponibles, dont 60 minutes protégées, et 2 km/h. Photo : 5 minutes ; observation : 15 ; prélèvement : 30. Ce sont des hypothèses de simulation. Les préparatifs des combinaisons et les opérations de sas sont exclus de l'enveloppe de terrain.

Les retards s'additionnent sur une activité précise ; les facteurs de durée de marche se multiplient sur les segments choisis. Une visibilité réduite est un événement simulé, jamais une météo mesurée. Annuler tous les événements restitue les résultats initiaux. Une suppression ou un réordonnancement qui enlève une cible retire les événements concernés ; déplacer le camp conserve les événements sur les mêmes liaisons.

## Sauvegarde et export

Une mission active est sauvegardée automatiquement sous `marps.mission.v1`. Elle peut être renommée, réinitialisée ou supprimée. Après suppression, l'enregistrement automatique est suspendu jusqu'à « Sauvegarder ». Une sauvegarde corrompue ou d'une autre version reste conservée tant que l'utilisateur ne choisit pas de la remplacer. Les erreurs de stockage sont signalées ; l'export JSON reste disponible. Les sites disparus du catalogue sont signalés et leurs positions sauvegardées conservées. Les rasters et tuiles ne sont jamais stockés dans localStorage.

L'export JSON contient le schéma de mission, la géométrie dérivée, les paramètres, les événements, les budgets, la provenance du catalogue et les avertissements de couverture. Aucune couche de carte n'est déclarée chargée. « Fiche imprimable » imprime le même état courant avec l'ordre des visites, les coordonnées, les activités, les événements, le budget et les limites.

## Oxygène optionnel

Le modèle `simulated-multiplicative-v1` est désactivé initialement. Sans profil de terrain il est indisponible, sauf activation explicite et visible de « terrain plat ». Le moteur accepte aussi des pentes signées par segment : une valeur absente ou NoData n'est jamais remplacée silencieusement par zéro. Le branchement du profil #15 reste à faire quand ce profil sera disponible.

Débit de marche (g/min) = référence × [1 + c_v (v/v_ref − 1)²] × [1 + c_montée max(pente, 0) + c_descente max(−pente, 0)] × [1 + c_charge charge]. Pente = dénivelé/distance horizontale, dans le sens du déplacement, domaine −1 à +1. Un débit constant distinct s'applique aux activités à l'arrêt, retards inclus. La consommation totale somme chaque débit × sa durée en minutes, retour compris une seule fois. Ralentir peut augmenter ou diminuer le total : temps et débit varient ensemble.

Bilan par équipier : restant = stock − consommation ; marge = restant − réserve. La réserve de temps ne consomme pas automatiquement de l'O₂ : seules les activités et marches effectivement planifiées en consomment. Les stocks, débits, coefficients et charges initiaux sont tous simulés, sans calibration physiologique. Pertes, fuites, récupération et contraintes du système de survie sont exclues.

Domaine numérique de l'éditeur : paramètres non négatifs finis jusqu'à 10⁹ dans leur unité, vitesses ≥ 10⁻⁶ km/h ; multiplicateur cumulé de ralentissement ≤ 10⁹. Réserves ≤ enveloppes correspondantes. Ces bornes techniques évitent les débordements ; elles ne définissent pas un domaine physiologique validé.

## Références et portée

- [NASA AEGIS](https://github.com/nasa/aegis) : composition sortie / stations / activités, adaptée ici à un éditeur simplifié.
- [Tenets of Lunar EVAs for Artemis III, 2023](https://ntrs.nasa.gov/citations/20230008183) : planification des tâches et réserve pour les imprévus. Référence lunaire, pas règle martienne applicable telle quelle.
- [Mars Exploration PLSS Schematic Study, 2026](https://ntrs.nasa.gov/citations/20260005204) : étude de sorties de 2, 4, 6 et 8 heures avec un système secondaire. Elle ne valide ni notre réserve temporelle simplifiée ni nos coefficients O₂.
- [NASA/JPL, paramètres planétaires](https://ssd.jpl.nasa.gov/planets/phys_par.html) : rayon équatorial Mars 3396,19 km, cohérent avec la sphère Mars 2000 du manifeste. Les distances calculées sont horizontales sur cette sphère ; aucun rayon terrestre ni calcul 3D implicite.

## Vérification

`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.

Les tests couvrent le schéma et les entrées invalides, les transitions, les distances analytiques et l'antiméridien, le retour, les unités, les événements cumulés/annulés, la restauration, le stockage indisponible, les références manquantes, la cohérence de l'export et le modèle O₂ (pente directionnelle, NoData, bilan et effet non monotone de la vitesse).
