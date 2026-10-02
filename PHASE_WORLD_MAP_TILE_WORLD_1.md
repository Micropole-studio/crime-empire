# Crime Empire — World Map Tile World 1

## Principe
La Région 1 ne repose plus sur une grande illustration. Elle fonctionne maintenant comme une carte de stratégie mobile :

- terrain neutre béton/asphalte continu ;
- villes et POI = objets indépendants sur coordonnées ;
- grille d'occupation invisible ;
- emplacements libres visibles uniquement en mode déplacement ;
- déplacement de la ville vers un slot libre via Supabase.

## Déplacer sa ville
1. Cliquer sur sa propre ville dans la World Map.
2. Cliquer sur `📍 Déplacer ma ville`.
3. Les slots libres apparaissent temporairement.
4. Cliquer sur un slot puis confirmer.
5. La nouvelle position est persistée dans `world_player_positions`.

Cette base permettra ensuite :
- téléportation d'alliance ;
- regroupement autour d'un chef d'alliance ;
- objets de relocalisation / cooldown ;
- ressources et événements dynamiques sur la même grille.

## SQL obligatoire
Exécuter après `20261002_multiplayer_world_1.sql` :

`supabase/migrations/20261002_world_relocation_1.sql`
