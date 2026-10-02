# Crime Empire — Intégration directe du nouvel asset World Map

## Ce qui a été fait
- Ajout du nouvel asset de ville World Map dans :
  - `public/world/cities/world-city-villa.png`
- Mise à jour de `src/components/world/WorldMap.tsx`
  - toutes les villes visibles sur la World Map utilisent désormais directement ce nouvel asset.

## Remarque
- Cette intégration ne modifie pas les assets de la ville principale locale (`public/buildings/villa*.png`).
- Seule la représentation des villes sur la World Map est remplacée.
