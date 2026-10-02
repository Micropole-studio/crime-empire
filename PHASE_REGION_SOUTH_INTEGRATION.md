# Crime Empire — Région Sud intégrée

Cette phase utilise directement la dernière carte validée comme World Map.

- La carte `public/world/region-1-south.png` devient le décor réel de la région.
- Les villes joueurs sont placées sur les grandes parcelles prévues dans l'illustration.
- Les lieux PvE sont déjà dessinés dans la carte : le front utilise uniquement des hotspots transparents pour les clics.
- Le mode « Déplacer ma ville » affiche les emplacements libres et conserve le système Supabase existant.
- Le compte admin existant est replacé sur le slot 17 et le deuxième joueur sur le slot 11 lors de la migration.

## SQL à exécuter

Après les migrations multijoueur et relocation existantes :

`supabase/migrations/20261002_region_south_map_slots.sql`
