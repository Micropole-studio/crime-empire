# Crime Empire — V16.1 : publier le laboratoire dans la World Map normale

## Ce que cette version fait

**Avant :** le laboratoire sauvegardait son plan dans le navigateur du compte administrateur. La vraie World Map, sur tous les autres comptes, utilisait les coordonnées de ses anciens nœuds et une feuille CSS indépendante. Il n'existait aucun lien de publication.

**Après :** le bouton **« Publier la région »** dans le laboratoire admin demande son plan V16 courant, le valide et l'enregistre **dans Supabase**. À chaque ouverture du Monde, `WorldMap.tsx` récupère la dernière version publiée pour placer **les quatre lieux PvE** et dessiner **les routes ajoutées dans l'éditeur**. Le terrain V16 de production reste `public/world/v16/terrain-restaure.webp`, comme dans la V16 déjà installée.

La table est un singleton `region_1`; `revision` augmente à chaque publication. Les simples modifications dans le laboratoire ne deviennent jamais visibles tant qu'on ne publie pas.

### Important : ce qui ne doit pas être confondu

- Les **villas pré-dessinées dans le laboratoire** sont des objets de maquette. Le monde normal affiche **les vraies villes** de Supabase, pas cinq faux adversaires.
- Les coordonnées et la protection des vrais joueurs **ne sont pas modifiées** par cette publication.
- Les quatre POI publiés sont `prison-regionale` → `district-network`, `port-sombre` → `port-sombre`, `marche-noir` → `black-market`, `depot-armes` → `weapons-depot`.
- Le `chantier clandestin` existant reste intact, parce qu'il n'est pas modélisé dans le laboratoire V16.
- Les textures/édifices inclus dans le fond V16 restent une illustration raster. Les routes **ajoutées par l'éditeur** sont des couches vectorielles séparées. Une édition totale et un agrandissement illimité exigeront ensuite un atlas de secteurs et une vraie gestion des slots joueurs.

## Installation GitHub / Vercel

**Faire un commit/branche de sauvegarde avant toute installation.** Ne remplace pas `WorldMap.tsx` par un ancien fichier fourni dans une archive précédente.

1. Dans **Supabase → SQL Editor**, exécuter une seule fois `supabase/migrations/20261106_world_visual_scene_publish.sql`. C'est indispensable pour que la publication soit partagée entre tous les joueurs. Ce SQL ne touche ni à `world_player_positions` ni aux combats.
2. Dans GitHub, ajouter les fichiers :
   - `src/services/worldVisualSceneService.ts`
   - `src/components/world/WorldV16PublishedRoads.tsx`
   - `src/components/world/ModularZoneLab.tsx` (remplace celui de la V16 actuelle ; ne modifie pas `App.tsx`).
   - `public/modular-zone-01/world.js` (remplace seulement ce fichier du labo V16 ; les images restent les mêmes).
3. Ouvrir le **`WorldMap.tsx` actuellement déployé** et fusionner le diff `CHANGEMENTS_WORLDMAP_A_FUSIONNER.diff`. Il ajoute exactement :
   - les imports du service et de la couche de routes,
   - le chargement de la publication au montage,
   - `applyPublishedV16Pois(createWorldNodes(),publishedV16Scene)` à la place de `createWorldNodes()`,
   - `<WorldV16PublishedRoads scene={publishedV16Scene} />` juste après le fond `.world-expanse-base`.
4. Conserver ton import existant `src/world-v16-live.css` ou ton habillage V16 déjà en production. **Ne pas réinstaller la V09, V12 ou V14.** Vérifier que `/world/v16/terrain-restaure.webp` et les quatre sprites PvE chargent bien (déjà présents si tu as installé la V16 officielle).
5. Commit & Push sur **une branche de test**. Vérifier Vercel `Ready`, puis seulement fusionner après validation.

## Publication : le parcours correct

1. Se connecter au **compte administrateur** dans Crime Empire.
2. Ouvrir `Monde → Tester la zone modulaire`.
3. Déplacer des POI, dessiner des routes, et si besoin **exporter une copie JSON** du brouillon avant publication.
4. Cliquer **« ✓ Publier la région »**, confirmer, et attendre `Région 1 publiée · révision N`.
5. Revenir à `Monde` (vue normale) ou actualiser la page : routes supplémentaires et POI adoptent la version publiée.
6. Ouvrir un second compte, sur un navigateur différent : la même carte publiée doit apparaître. Les vrais joueurs restent sélectionnables/attaquables aux coordonnées habituelles.

**Ne pas tester la publication avec des combats en cours** : les coordonnées des POI peuvent affecter l'affichage des distances et déplacements futurs. Tester sur un déploiement Vercel Preview, puis sur un créneau contrôlé.

## Vérifications

- La publication refuse un compte non admin (`ADMIN_REQUIRED`).
- Sans publication, la World Map conserve ses coordonnées de POI actuelles.
- La sauvegarde simple de l'éditeur reste locale, aucun autre joueur ne la voit.
- Après publication, deux comptes affichent le même décor et les mêmes coordonnées de POI.
- La sélection des villes, la ville Premium, les panneaux PvE/PvP et le zoom restent inchangés.
- Les vraies positions dans `public.world_player_positions` sont identiques avant/après.
- Le système n'ajoute pas les villas fictives du laboratoire dans la liste PvP.

## Retour arrière

- Pour revenir au rendu précédemment déployé : annuler les quatre modifications dans `WorldMap.tsx` et retirer le nouveau composant de routes, puis redéployer. Aucun `DELETE` de positions joueurs n'est nécessaire.
- Pour vider uniquement la publication visuelle, dans Supabase SQL Editor (opération administrateur) :

```sql
DELETE FROM public.world_visual_scenes WHERE region_key='region_1';
```

À la prochaine ouverture du Monde, les POI retrouvent leurs positions d'origine. Le brouillon local V16 est conservé. Sauvegarder son JSON avant toute réinitialisation.

## Limites / statut de vérification

Ce correctif a été créé à partir du **laboratoire V16** fourni dans notre conversation et du **dernier `WorldMap.tsx` récupérable dans les archives de projet**, pas à partir du HEAD actuel du dépôt GitHub (non accessible via la connexion). **Fusionner le diff**, ne pas remplacer aveuglément le WorldMap de production. Le SQL n'a pas été exécuté sur ta base Supabase depuis cet environnement. Le build réel Vercel, les combats et la publication multi-comptes doivent être validés chez toi avant de fusionner.
