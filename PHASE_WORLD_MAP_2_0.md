# Crime Empire — World Map 2.0

Cette phase transforme la World Map en une carte beaucoup plus proche d'un jeu mobile de stratégie.

## Navigation / caméra

- drag possible depuis le terrain **et directement depuis un territoire/bâtiment** ;
- distinction tap / drag afin qu'un territoire ne bloque plus le déplacement ;
- pinch-to-zoom à deux doigts ;
- zoom souris progressif centré sous le curseur ;
- inertie au relâchement ;
- léger effet élastique aux limites de la carte ;
- retour doux dans les limites ;
- caméra appliquée directement au calque DOM via `requestAnimationFrame`, sans rerender React à chaque pixel ;
- resize de fenêtre/téléphone : la carte est recontrainte sans être brutalement recentrée ;
- zoom initial mobile volontairement plus proche pour laisser de l'espace d'exploration horizontal **et vertical**.

## Territoires intégrés au terrain

Les vignettes cinématiques restent utilisées dans les panneaux d'information et de préparation d'opération.

Sur la World Map, les zones utilisent maintenant des assets détourés cohérents avec la carte de ville :

- Votre ville → `villa3.png`
- Port Sombre → `villa.png`
- Marché noir → `hideout.png`
- Chantier clandestin → `factory.png`
- Dépôt d'armes → `wall.png`
- Réseau des quartiers → `syndicate.png`

Les bâtiments occupent réellement les parcelles de la carte avec :

- ombre au sol ;
- halo de sélection ;
- label intégré ;
- niveau et puissance des cibles PvE ;
- légère élévation au survol desktop.

## Ambiance

- couches de brume animées ;
- lumières d'ambiance ;
- profondeur supplémentaire sans Three.js ;
- prise en charge de `prefers-reduced-motion`.

## Opérations visibles sur la carte

Lorsqu'une opération est active :

- une route tactique pointillée relie la ville à la cible ;
- le sens de circulation est animé ;
- la cible pulse ;
- l'hélicoptère se déplace progressivement sur la route ;
- le retour est également représenté ;
- un rappel en cours de trajet repart approximativement depuis la progression atteinte.

## Fichiers principaux modifiés

- `src/components/world/WorldMap.tsx`
- `src/data/worldMapNodes.ts`
- `src/types/worldMap.ts`
- `src/index.css`

## Validation

- TypeScript (`tsc -b`) : OK
- ESLint sur les fichiers TypeScript modifiés : OK
- Le build Vite complet ne peut pas être exécuté dans l'environnement Linux de préparation avec le `node_modules` Windows d'origine : le binding natif Linux de Rolldown n'est pas présent. Ce problème est indépendant du code World Map.

## Test conseillé sur téléphone

1. Ouvrir World Map.
2. Poser le doigt sur le Marché noir et glisser : la carte doit bouger au lieu d'ouvrir immédiatement la zone.
3. Faire un simple tap sur le Marché noir : le panneau doit s'ouvrir.
4. Pincer à deux doigts pour zoomer/dézoomer.
5. Faire un geste rapide et relâcher : l'inertie doit continuer légèrement le mouvement.
6. Tirer la carte au bord : elle doit résister légèrement puis revenir proprement.
7. Lancer une opération : route + hélicoptère doivent apparaître et progresser vers la cible.
