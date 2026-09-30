# Crime Empire — Map Interaction 2.1

## Carte joueur
- Navigation alignée sur la World Map 2.0.
- Drag libre souris/tactile, y compris en démarrant sur un bâtiment.
- Pinch-to-zoom à deux doigts.
- Zoom molette continu sur PC.
- Inertie au relâchement.
- Léger overscroll élastique puis recentrage.
- Transformation appliquée directement au calque de carte pour éviter un rerender React à chaque pixel.
- Un drag n'ouvre plus accidentellement un bâtiment ou l'hélicoptère.
- Un clic/tap court continue d'ouvrir normalement le bâtiment.

## World Map
- Suppression des bâtiments décoratifs posés artificiellement par-dessus le terrain.
- La grande image `/public/world/world-map.jpg` devient la scène principale.
- Les parcelles réelles de l'image sont des hotspots cliquables.
- Un clic/tap court ouvre la fiche du territoire.
- Un mouvement devient immédiatement un drag de caméra.
- Sélection fiable sur PC même avec Pointer Capture.
- Les hotspots s'illuminent légèrement au survol et davantage lorsqu'ils sont sélectionnés.
- Les illustrations `*-cover.webp` sont conservées pour les fiches et la préparation d'opération, où elles sont plus pertinentes.
- Les routes d'opération et l'hélicoptère continuent d'utiliser les coordonnées des zones.

## Vérifications
- `tsc -b` : OK avec les dépendances du projet disponibles.
- ESLint ciblé : OK sur GameMap, WorldMap, worldMapNodes et worldMap types.
- Le build Vite dans l'environnement Linux de travail reste bloqué par l'absence du binding natif Linux de Rolldown dans le `node_modules` Windows d'origine.
