# Crime Empire — World Map Région 1 — Step 1

## Objectifs de cette étape
- Remplacer la sensation de vide/noir de la grande région par un vrai fond illustré.
- Intégrer visuellement les villes joueurs dans le décor avec un socle/parcelle urbaine.
- Durcir la copie du template de ville pour les nouveaux comptes.

## Ce qui change
- `public/world/world-region-1-background.png` devient le fond complet de la Région 1.
- Les villes joueurs ne flottent plus : elles reposent sur une parcelle urbaine stylisée.
- Les nouvelles villes reçoivent mieux le template officiel grâce à une migration de backfill.

## SQL supplémentaire
Exécuter après les migrations précédentes :
- `supabase/migrations/20261002_city_layout_backfill_fix.sql`
