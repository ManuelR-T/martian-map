# Estimation d’oxygène (modèle v1)

L’estimation est toujours proposée, avec les valeurs simulées du modèle par défaut. Ce modèle simule un scénario pédagogique,
sans calibration humaine ni dimensionnement de scaphandre. Toutes les valeurs
initiales sont **simulées**. Les archives du rover fournissent le relief, jamais
une mesure de consommation humaine. Fuites et pertes du système sont exclues.

Pour la marche :

```
q = q0 × [1 + kv (v/v0 − 1)²]
       × [1 + kup max(0, tan θ) + kdown max(0, −tan θ)]
       × (1 + km m)
consommation (g) = somme(q (g/min) × durée (min))
```

`v` et `v0` sont en m/s, `m` en kg, `km` en kg⁻¹ ; les autres coefficients
sont sans dimension. θ est une pente signée en degrés, entre −90° et +90°
(exclus). Les coefficients et débits doivent être finis et non négatifs, les
vitesses strictement positives. Aucune plage physiologique n’est validée.
Le facteur de vitesse est minimal à la vitesse de référence ; comme la durée
varie aussi avec la vitesse, le besoin total n’est pas monotone en vitesse.

Chaque segment du parcours camp → étapes → camp est échantillonné à la résolution
du DEM disponible. Les pentes utilisent la différence d’altitude dans le sens de
marche : le retour est compté une fois avec son propre coût. Le profil de la
mission est calculé indépendamment du parcours de démonstration du panneau relief.
Les durées utilisent les distances horizontales martiennes, comme le budget de
temps. Le débit distinct des activités à l’arrêt est constant ; les activités
cochées restent incluses dans le budget du plan complet.

Sans DEM, hors couverture ou en présence de NoData, le résultat est indisponible.
L’option explicite « terrain plat » ignore le relief sur tout le parcours et reste
visible dans le résultat. Stock restant = stock initial − besoin total ; marge =
stock restant − réserve protégée. Une marge négative déclenche une alerte.

Les paramètres sont conservés dans l’extension optionnelle `parameters.oxygen`
des missions de schéma v1, avec `modelVersion: 1`. Les anciennes sauvegardes restent
valides et utilisent les paramètres O₂ par défaut si ceux-ci sont absents. La sauvegarde locale conserve uniquement les
champs du modèle, sans grille ni cache de relief. Le budget de temps reste autonome.
