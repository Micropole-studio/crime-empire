# Crime Empire — World Map Région 1 — Foundation Rework

## Objectif
Refondre la Région 1 pour sortir du rendu “image posée sur une image” et obtenir une vraie carte de jeu exploitable.

## Ce qui change
- Suppression du rendu basé sur une grande illustration de fond + secteur central collé par-dessus.
- Nouveau fond de Région 1 en mode **terrain urbain / béton / zone portuaire** généré par le front.
- Ajout de **slots joueurs visibles** sur la carte : les villes ne semblent plus placées au hasard.
- Les slots occupés par des joueurs sont automatiquement mis en évidence.
- Refonte du **secteur central** : le PvE est maintenant intégré visuellement à la carte (Port Sombre, Marché noir, Chantier clandestin, Dépôt d’armes, Réseau des quartiers).
- Les villes des joueurs restent compatibles avec le système de positions multijoueur existant.

## Technique
- `src/data/worldLayout.ts`
  - ajout de `createRegionOneSpawnSlots()` pour reconstruire les emplacements de spawn de Région 1 côté front.
- `src/components/world/WorldMap.tsx`
  - ajout des couches `WorldRegionTerrain`, `WorldSpawnSlotsLayer` et `WorldCentralSectorVisual`.
- `src/index.css`
  - nouvelles classes terrain/slots/POI pour un rendu intégré et extensible.

## SQL
Aucune nouvelle migration obligatoire pour cette refonte visuelle.
Conserver la correction précédente pour le template de ville :
- `supabase/migrations/20261002_city_layout_backfill_fix.sql`
