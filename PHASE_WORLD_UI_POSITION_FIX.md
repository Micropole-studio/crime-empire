# Crime Empire — World UI + City Placement Fix

## World Map
- Le gros panneau permanent d'opération n'est plus affiché par défaut.
- Une opération active est représentée par un indicateur compact en bas à droite.
- Un clic sur cet indicateur ouvre les détails complets (rappel, assaut manuel, rapport).
- Notifications temporaires ajoutées pour :
  - escouade envoyée ;
  - escouade arrivée et ordre requis ;
  - victoire / défaite ;
  - rappel ;
  - retour de l'escouade / butin sécurisé.
- Le gros bloc d'en-tête « Opérations extérieures » est remplacé par une pastille « Carte du monde ».

## Ville joueur — restauration des positions
La phase multi-comptes avait changé les clés LocalStorage afin de les isoler par cityId. Cela pouvait faire retomber la ville DEV sur les positions par défaut alors que l'ancienne disposition était encore enregistrée dans la clé historique globale.

Cette version effectue une migration locale unique :
1. recherche de l'ancienne disposition globale ;
2. copie vers la clé liée à la cityId courante ;
3. suppression de la vieille clé globale afin qu'un nouveau compte ne l'hérite pas.

La même migration est appliquée à la position de l'hélicoptère.

## Vérifications
- TypeScript : OK
- ESLint sur les fichiers modifiés : OK
