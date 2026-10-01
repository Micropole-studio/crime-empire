# City Map — correctif clic PC

## Problème corrigé

Après l'ajout de la caméra fluide, `setPointerCapture()` sur la carte pouvait récupérer le clic de la souris. Sur PC, les boutons des bâtiments et l'hélicoptère ne recevaient donc plus toujours leur `onClick`, alors que le drag/zoom continuait de fonctionner.

## Nouveau comportement

- clic court sur un bâtiment : ouvre son panneau/action ;
- clic court sur l'hélicoptère : ouvre la Carte du monde ;
- clic + déplacement : déplace la carte et n'ouvre rien ;
- pinch / molette : conserve le zoom ;
- double-clic sur un bâtiment ou l'hélicoptère : ne déclenche plus le zoom de fond ;
- clavier : les boutons gardent leur `onClick` natif pour l'accessibilité.

Le système reprend le principe déjà utilisé avec succès sur la World Map : l'objet pressé est mémorisé au `pointerdown`, puis activé au `pointerup` uniquement si le geste n'est pas devenu un drag.

## Test rapide PC

1. Cliquer une fois sur `Syndicat` : le panneau doit s'ouvrir.
2. Cliquer une fois sur `Sécurité` / bâtiment de recrutement : le panneau doit s'ouvrir.
3. Cliquer une fois sur l'hélicoptère : la Carte du monde doit s'ouvrir.
4. Revenir en ville, cliquer sur un bâtiment puis déplacer la souris avant de relâcher : la carte doit bouger et aucun panneau ne doit s'ouvrir.
5. Double-cliquer sur un bâtiment : la carte ne doit pas zoomer à sa place.
