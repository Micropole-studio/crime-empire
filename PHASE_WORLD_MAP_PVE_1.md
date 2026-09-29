# Crime Empire — World Map PvE Phase 1

## Ajouté dans cette phase

- Le bouton « Préparer l'opération » des territoires PvE est maintenant actif.
- Chargement des vraies troupes de la ville depuis `city_troops`.
- Synchronisation automatique des recrutements terminés avant la préparation d'une opération.
- Chargement des recherches terminées et prise en compte des recherches de capacité de déploiement.
- Calcul des points de commandement depuis le niveau du bâtiment Sécurité.
- Sélection des quantités de chaque type de troupe avec contrôle de la quantité possédée et de la capacité disponible.
- Calcul d'une puissance d'escouade dédiée à la World Map.
- Prise en compte du bonus de puissance militaire du commandant.
- Comparaison visuelle avec la puissance ennemie.
- Lancement d'une opération et compte à rebours du trajet.
- Une seule opération extérieure active à la fois pour empêcher la réutilisation immédiate de la même escouade.
- Persistance locale de l'opération active via `localStorage` afin qu'elle survive à un rechargement de la page.
- Possibilité de rappeler l'escouade.

## Parcours de test

1. Ouvrir Crime Empire.
2. Entrer sur la World Map avec l'hélicoptère.
3. Sélectionner un territoire PvE, par exemple « Marché noir ».
4. Cliquer sur « Préparer l'opération ».
5. Composer une escouade avec les troupes réellement possédées.
6. Vérifier les points de commandement, la puissance de l'escouade et l'estimation du rapport de force.
7. Cliquer sur « Lancer l'opération ».
8. Vérifier le compte à rebours sur la World Map.
9. À l'arrivée, l'escouade passe en état « sur zone » et attend l'ordre d'assaut.

## Étape suivante

La Phase 2 doit brancher le véritable moteur de combat : réservation des troupes côté base de données, résolution de l'affrontement, pertes/blessés, récompenses, XP commandant, cooldown du territoire et retour de l'escouade.

## Vérifications réalisées

- `tsc -b` : OK.
- Les nouveaux fichiers World Map passent ESLint.
- Le build Vite complet n'a pas pu être exécuté dans l'environnement Linux car le ZIP original contient des `node_modules` Windows et le binding Linux de Rolldown n'est pas présent. Aucun nouveau package n'a été ajouté par cette phase.
