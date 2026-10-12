# Crime Empire — Bloc 1 Premium

Ce patch met en place le **Bloc 1** de la refonte visuelle dans la ville.

## Contenu

- Nouveau terrain premium séparé : `public/game-assets/city-map-luxe.webp`
- Nouveaux bâtiments premium séparés :
  - `villa-luxe.webp`
  - `wall-luxe.webp`
  - `syndicate-luxe.webp`
  - `workshop-luxe.webp`
  - `hideout-luxe.webp`
  - `factory-luxe.webp`
  - `laboratory-luxe.webp`
- Remplacement des images de `public/buildings/*.png` pour que les modales, l'éditeur et les visuels secondaires suivent la nouvelle direction artistique.
- Mise à jour de `GameMap.tsx` et `PixiCityScene.tsx` pour que le mode **luxury** charge tous les nouveaux assets au lieu de ne changer que le terrain et la villa.

## Mapping choisi

- `villa` → `manoir_méditerranéen_luxueux_au_crépuscule.png`
- `syndicate` → `qg_mafieux_luxueux_illuminé.png`
- `wall` → `qg_de_sécurité_fortifié_nocturne.png`
- `workshop` → `garage_automobile_de_luxe_illuminé_de_nuit.png`
- `hideout` → `planque_industrielle_clandestine_éclairée_de_nuit.png`
- `factory` → `complexe_industriel_illuminé_de_nuit.png`
- `laboratory` → `manoir_laboratoire_secret_high_tech.png`

## Important

Ce patch reste **visuel uniquement** :
- aucun changement Supabase
- aucune modification des sauvegardes
- aucun impact sur les niveaux ou les constructions

## Intégration

1. Décompresser le patch à la racine du projet.
2. Lancer le projet.
3. Utiliser le bouton `Ville Premium · Bloc 1` dans la ville pour afficher les nouveaux assets.
