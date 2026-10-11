# Crime Empire — Phase PixiJS 1 : affichage de la ville

## Point de reprise

Cette livraison repart de `crime-empire-world-helicopter-stable-orientation-2.zip` (3 octobre 2026).
Le code récupéré est un frontend **React 19 / TypeScript / Vite** avec services **Supabase**. Il ne contient pas de backend Node/Express autonome. Aucun SQL ni donnée joueur ne sont modifiés.

## Ce qui a changé

- `pixi.js` v8 ajouté aux dépendances.
- Nouveau moteur de rendu `src/components/map/PixiCityScene.tsx` pour **la ville** : terrain, bâtiments et hélicoptère dessinés dans un canvas WebGL.
- Conservation de la caméra actuelle (glisser, zoom molette, pincement, inertie), des zones de clic HTML et des callbacks pour ouvrir les bâtiments et la carte du monde.
- Placement des sprites depuis le même modèle partagé et les mêmes pourcentages que l'éditeur existant. Pas de deuxième base de données de positions.
- Profondeur issue des `zIndex` des placements, ombres au sol, éclairage discret animé pour construction/amélioration et hélicoptère.
- Export de neuf images au format WebP **sans perte** dans `public/game-assets/` : mêmes pixels visibles que les PNG sources, transfert plus léger. Les originaux restent conservés.
- Repli automatique vers l'ancien rendu HTML si PixiJS ou les textures ne chargent pas.
- Bouton de comparaison **Rendu PixiJS / Rendu classique** en bas à gauche de la ville. Le choix est conservé dans le navigateur.

## Installer et démarrer

1. Faire une copie de votre projet actuel et travailler sur une **branche de staging**.
2. Décompresser le ZIP complet dans un dossier séparé ; ou appliquer le ZIP `patch` en écrasant uniquement les fichiers correspondants de votre projet.
3. Depuis la racine du frontend :

   ```bash
   npm install
   npm run dev
   ```

4. Si tout se comporte correctement en local, exécuter `npm run build` et tester aussi sur téléphone.

**Important pour le ZIP complet :** le `package-lock.json` ancien n'est pas fourni, car cette session ne peut pas télécharger PixiJS depuis le registre npm et le mettre à jour correctement. `npm install` le recréera automatiquement avec la nouvelle dépendance ; committer ensuite ce nouveau lockfile. Si vous appliquez le patch à un projet existant, `npm install` mettra à jour votre lockfile actuel.

## Contrôles à réaliser avant production

- Villa et tous les bâtiments : niveau 0, verrouillage, amélioration, clic ouvrant le bon panneau.
- Hélicoptère : ouvre toujours la carte du monde, orientation inchangée, sans clic parasite après un déplacement.
- Caméra : déplacement à la souris, tactile à un doigt, pinch à deux doigts, molette, double clic, recentrage et zoom sur PC/iPhone/Android.
- Positions : vérifier que les modifications réalisées depuis l'éditeur sont toujours retrouvées à la recharge.
- Tester la bascule PixiJS / classique et le repli sur un appareil sans WebGL.
- Contrôler les performances et l'utilisation mémoire sur téléphone réel.

## Périmètre

Ceci est une **première intégration graphique fonctionnelle par construction**, pas une refonte artistique terminée ni une validation d'exécution : impossible ici de lancer `npm install`, `npm run build` et les tests navigateur complets car l'accès au registre npm est indisponible. La syntaxe TypeScript modifiée a été vérifiée statiquement.

**La World Map et l'éditeur restent sur l'affichage d'origine** pendant cette étape. Après validation des interactions et du rendu de la ville, la deuxième phase consistera à migrer la World Map vers PixiJS (terrain, POI, villes, paths, caméra) avec la même prudence, puis à retravailler les assets (découpe, alignement, éclairage, niveaux de bâtiments). PixiJS ne fabrique pas à lui seul des graphismes plus détaillés : la qualité des illustrations source reste essentielle.
