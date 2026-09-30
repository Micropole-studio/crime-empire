# Crime Empire — World Map française intégrée

## Ce qui change

- `public/world/world-map-fr.png` devient le fond principal de la World Map.
- Les six zones visibles dans l'illustration sont directement cliquables via des hotspots invisibles :
  - Votre ville
  - Marché noir
  - Chantier clandestin
  - Dépôt d'armes
  - Réseau des quartiers
  - Port Sombre
- Les anciens libellés HTML permanents ont été retirés de la carte pour éviter les doublons avec les textes intégrés à l'illustration.
- Au survol (PC) ou à la sélection, la zone reçoit une surbrillance légère.
- Le clic/tap continue d'ouvrir les panneaux, opérations PvE, cooldowns et trajets existants.
- Le titre de l'écran est désormais `Carte du monde`.

## Fichiers principaux modifiés

- `public/world/world-map-fr.png`
- `src/components/world/WorldMap.tsx`
- `src/data/worldMapNodes.ts`
- `src/services/worldOperationService.ts`

## Préparation future multilingue

Cette version utilise une illustration qui contient déjà les noms français. Pour une future gestion FR / EN / ES, il faudra conserver la même illustration sans aucun texte intégré et afficher les noms avec des composants HTML traduits au-dessus des zones. Toute la logique des hotspots peut être conservée telle quelle.
