# Crime Empire — correctif V16.3 : chevauchement Ville / PvE

## Ce que montre la vidéo
La Villa d'un vrai joueur est dessinée au-dessus du Marché noir. Les coordonnées des villes Supabase ne correspondent pas aux **villas de démonstration** publiées depuis l'éditeur V16.2. Le CSS ne peut pas remettre ces deux systèmes en accord.

## Ce que corrige le patch
- Le moteur vérifie le chevauchement des villes réelles avec les **4 lieux PvE publiés** en utilisant les mêmes dimensions de sprite que le moteur V16.2.
- Une ville qui chevauche un POI est représentée par un **marqueur cliquable compact avec ⚠**, au lieu d'une grosse Villa recouvrant le POI. La ville reste accessible, aux **mêmes coordonnées Supabase**.
- En cliquant sur sa ville, le joueur peut utiliser le flux déjà existant **Déplacer ma ville**.
- Les emplacements qui chevauchent un lieu PvE publié sont exclus des destinations **proposées** ; le serveur continue à valider toute demande de déplacement.
- Aucune migration SQL et aucune modification automatique des comptes joueurs.

## Installation
1. Sauvegarde la version déployée de `WorldMap.tsx` (ou crée une branche).
2. Remplace `src/components/world/WorldMap.tsx` par celui de ce ZIP — il est dérivé du fichier exact fourni dans la conversation (7 novembre 2026).
3. Ajoute `src/components/world/WorldV16PlacementSafety.ts`.
4. **Conserve** tous les autres fichiers existants V16.2, en particulier `WorldV16PublishedArtwork.tsx`, `.css`, `worldVisualSceneService.ts` et les assets dans `public/world/v16`.
5. Commit et test Vercel Preview : `Monde`, sélection ville, bouton `Déplacer ma ville`, puis retour monde.

## Limite importante
Cette V16.3 est une **protection visuelle** qui évite les superpositions invalides et les nouveaux déplacements proposés vers des POI. Elle **ne réattribue pas** les coordonnées de joueurs existants. Pour un vrai modèle de centaines de joueurs, il faudra revoir/valider les slots de spawn dans la base et réserver durablement les emprises PvE côté serveur. Sans cela une ville existante peut rester mal localisée, malgré le marqueur de protection.

## Tests
Contrôle syntaxique TypeScript effectué. Le dépôt Crime Empire complet n'étant pas connecté via GitHub, aucun build Vercel complet ni test de données réelles Supabase n'a été réalisé.
