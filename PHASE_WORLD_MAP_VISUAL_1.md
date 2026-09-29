# Crime Empire — World Map Visual Phase 1

Cette phase conserve toute la logique PvE de la Phase 3 et ajoute la première vraie couche d'identité visuelle à la World Map.

## Ajouts

- Vignettes illustrées pour les 4 territoires PvE :
  - Marché noir
  - Chantier clandestin
  - Dépôt d'armes
  - Réseau des quartiers
- Les marqueurs de territoires sur la World Map utilisent maintenant les illustrations au lieu d'un simple emoji.
- La fiche d'un territoire affiche une grande image cinématique.
- L'écran « Préparation de l'opération » affiche une bannière de reconnaissance avec l'image de la cible et sa puissance ennemie.
- Les emojis restent présents comme petits badges de ressource afin de garder une lecture immédiate.

## Assets

Les images sont rangées dans :

`public/world/locations/`

- `black-market-cover.webp`
- `construction-site-cover.webp`
- `weapons-depot-cover.webp`
- `district-network-cover.webp`

La direction artistique complète utilisée comme référence est conservée dans :

`public/world/concepts/world-map-direction.webp`

## Validation

- TypeScript : OK
- ESLint sur les fichiers modifiés : OK
- Build Vite dans l'environnement de travail : bloqué uniquement par le binding natif Linux de Rolldown absent du `node_modules` Windows d'origine.
