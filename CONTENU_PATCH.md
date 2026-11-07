# Patch V16.1 : laboratoire → monde normal

- `src/components/world/ModularZoneLab.tsx` : bouton Publier + passerelle sécurisée.
- `public/modular-zone-01/world.js` : snapshot immédiat de l'éditeur.
- `src/services/worldVisualSceneService.ts` : validation et lecture/écriture Supabase.
- `src/components/world/WorldV16PublishedRoads.tsx` : routes de l'éditeur dans la vraie carte.
- `supabase/migrations/20261106_world_visual_scene_publish.sql` : table et RPC admin.
- `CHANGEMENTS_WORLDMAP_A_FUSIONNER.diff` : 4 changements à fusionner, **sans remplacer WorldMap.tsx**.
- `INSTALLATION_ET_PUBLICATION.md` : procédure et tests.

La maquette V16 reste indépendante tant qu'on ne publie pas. Les villes réelles ne sont pas déplacées automatiquement.
