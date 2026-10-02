# Crime Empire — World Map — Éditeur global du placement des villes

## Objectif
Pouvoir régler visuellement une seule ville (la ville admin) dans sa parcelle de la Région Sud, puis appliquer exactement le même placement à toutes les villes joueurs.

## Fonctionnement
- Un nouveau bouton admin `🛠` apparaît dans les contrôles de la World Map.
- Il ouvre le panneau **Gabarit global des villes**.
- Les réglages sont prévisualisés en direct sur toutes les villes :
  - décalage horizontal ;
  - décalage vertical ;
  - taille ;
  - rotation ;
  - position X/Y de l'étiquette pseudo/niveau.
- Un cadre **PARCELLE MODÈLE** apparaît autour du slot de la ville admin pour faciliter l'alignement avec la parcelle dessinée sur la carte.
- `Enregistrer pour toutes les villes` sauvegarde le gabarit dans Supabase.
- Tous les joueurs utilisent ensuite le même gabarit, quel que soit leur slot.

## Migration SQL
Exécuter après les migrations Région Sud :

`supabase/migrations/20261002_world_city_render_template.sql`

La table/RPC est globale et seule une session admin peut modifier le gabarit.

## Validation
- TypeScript `tsc -b` : OK
- ESLint ciblé : OK
- Build Vite non exécutable dans l'environnement de validation à cause du binding natif Linux Rolldown manquant.
