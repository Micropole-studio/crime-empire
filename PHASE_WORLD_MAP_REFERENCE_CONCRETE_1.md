# Crime Empire — World Map Reference Concrete 1

Cette passe est basée sur la référence KingShot/Age-style retrouvée dans la conversation.

## Principe retenu
- Une grande surface continue et presque uniforme, comme le terrain vert des jeux de stratégie mobile.
- Chez Crime Empire : texture béton/asphalte gris, répétable et légère.
- Aucun secteur central, aucun district dessiné, aucune grande route imposée, aucun slot visible en permanence.
- Villes joueurs, Port Sombre et POI PvE = objets indépendants posés sur des coordonnées de monde.
- Les emplacements libres restent invisibles et ne s'affichent que pendant le mode « Déplacer ma ville ».

## Changements
- Ajout de `public/world/concrete-ground-tile.webp`, une petite texture répétable.
- Nettoyage visuel de `WorldMap` pour supprimer les routes artificielles et les quadrillages.
- Ombres au sol sous les villes/POI plutôt que halos colorés.
- Labels plus petits et plus proches du style de la référence.
- La logique de relocalisation existante est conservée.

## Validation
- TypeScript (`tsc -b`) : OK.
- ESLint sur `WorldMap.tsx` / services / layout : OK.
- Vite complet non exécutable dans l'environnement de travail à cause du binding natif Rolldown Linux absent ; ce point est indépendant du code TypeScript.
