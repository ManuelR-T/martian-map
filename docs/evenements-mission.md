# Événements de mission simulés

Dans le panneau Budget, « Événements simulés » permet d’ajouter un retard à une
activité ou de réduire la vitesse des portions choisies. Les valeurs sont des
hypothèses pédagogiques : aucune visibilité ou alerte météo locale n’est observée.

Les retards s’additionnent à la durée initiale de l’activité, sans la modifier.
Les facteurs de visibilité se multiplient et s’appliquent à la vitesse initiale
sur toute la portion sélectionnée, y compris ses détours. Un facteur de 0,5
double la durée ; deux facteurs de 0,5 donnent une vitesse de 0,25 fois la vitesse
initiale. Le retour est une portion distincte, sélectionnable, comptée une fois.

Chaque événement reste actif jusqu’à son annulation. Les calculs portent sur le
plan complet, activités cochées comprises : ils ne mesurent pas le temps écoulé.
Annuler un événement retire uniquement son effet ; tout annuler restitue les
budgets initiaux. Le bilan O₂ utilise les durées retardées, son débit à l’arrêt
et les vitesses de marche modifiées (son débit varie aussi avec la vitesse).

Les événements sont conservés avec la préparation, les missions enregistrées et
le suivi dans le champ optionnel `events` du schéma v1. Ils sont indépendants
entre préparation et sortie active. Une activité supprimée perd ses retards.
Changer le camp, ajouter, retirer ou réordonner une étape retire les événements
de visibilité pour éviter d’appliquer un facteur à une autre portion ; éditer
les détours conserve leur cible logique.

## Intégration avec l’alerte radiative fictive (#26)

L’ordre radiatif reste une proposition de retour direct depuis une étape figée.
Sa durée tient compte des facteurs de visibilité sur la portion « retour au
camp », même si les événements sont modifiés après le déclenchement de l’alerte.
Les délais des activités abandonnées ne sont pas ajoutés au retour direct.
Annuler l’alerte conserve les autres événements, qui restent annulables séparément.
Cette proposition ne remplace pas le plan complet dans les budgets et ne fournit
aucune position réelle ou durée déjà écoulée.

L’alerte et son contexte scientifique existants restent explicitement simulés ;
les événements de #19 n’ajoutent aucune donnée radiative observée à Jezero.

La vue casque partage les événements avec le planificateur : ses durées d’activité,
le reste prévu, la marche suivante et le retour direct utilisent les mêmes effets.
L’alerte radiative reste partagée et se recalcule depuis son étape de départ figée.

La limite de retour (#33) applique aussi les retards et facteurs de vitesse.
Son repli suit le préfixe parcouru en sens inverse : chaque portion conserve son
propre facteur de visibilité, à la différence du retour radiatif direct proposé.
