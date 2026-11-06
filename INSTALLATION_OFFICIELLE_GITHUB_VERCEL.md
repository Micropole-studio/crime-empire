# Crime Empire — Intégration officielle du rendu World Map V16

## Ce qui est réellement livré

Ce paquet **habille la vraie World Map de Crime Empire** en réutilisant la scène V16 validée : fond paysagé (sans bâtiments peints), mini-villas et quatre POI PvE indépendants. **Ce n'est pas un nouveau laboratoire.** Les boutons de villes et de lieux PvE, leurs coordonnées, leurs panneaux et leurs actions restent ceux du vrai composant `WorldMap.tsx`.

Le jeu n'est **pas encore déployé** par cet archive : l'accès GitHub actuellement connecté ne donne pas accès au dépôt Crime Empire (seul le dépôt Bouticelle est visible). L'installation ci-dessous est donc à effectuer sur le dépôt Crime Empire.

## Fichiers à créer (ne pas écraser les autres)

1. `public/world/v16/` : **10 assets** WebP.
2. `src/components/world/WorldMapV16Official.css` : style V16, indépendant du labo.
3. **Deux petites modifications à faire dans le `WorldMap.tsx` qui est actuellement dans ton GitHub** :

   **A.** Dans les imports :

   ```tsx
   import "./WorldMapV16Official.css"
   ```

   **B.** Dans le `div` qui porte `ref={cameraLayerRef}`, modifier uniquement le `className` :

   ```tsx
   // AVANT
   className="absolute left-0 top-0 will-change-transform"

   // APRÈS
   className="world-v16-scene absolute left-0 top-0 will-change-transform"
   ```

   Le fichier `CHANGEMENTS_WORLDMAP_V16.patch` montre ces deux lignes (construit à partir du dernier `WorldMap.tsx` disponible, daté du correctif V08).

## Méthode GitHub / Vercel

1. Créer une branche `feature/world-v16-officiel` depuis la branche effectivement déployée (ne pas modifier directement `main` au départ).
2. Extraire le ZIP et ajouter les dossiers/fichiers aux chemins **exacts** ci-dessus via GitHub Web ou github.dev.
3. Éditer les **deux lignes** dans le fichier `WorldMap.tsx` actuel (ne jamais remplacer ce gros fichier par une archive ancienne).
4. Faire Commit & Push.
5. Contrôler le déploiement d'aperçu Vercel et les validations ci-dessous.
6. Si tous les tests sont bons, fusionner la branche dans `main` : Vercel déploiera alors la version officielle.

## Tests indispensables dans l'aperçu Vercel

- [ ] Vercel : statut `Ready`, pas de TS2307 ni d'image manquante dans Network.
- [ ] Connexion avec le compte actuel, navigation de la Ville Premium vers le Monde et retour.
- [ ] Les villes visibles sont celles du compte/Supabase, pas les cinq villas fictives du laboratoire.
- [ ] Cliquer sa propre ville affiche le panneau habituel ; cliquer une autre ville affiche le panneau PvP.
- [ ] Cliquer sur **Port Sombre**, **Marché noir**, **Prison régionale** et **Dépôt d'armes** : vérifier l'ouverture de leurs panneaux et missions PvE.
- [ ] Zoom, déplacement tactile et ordinateur : pas de problème de sélection, de scrolling ou de blocage.
- [ ] Mode déplacement de ville : pas de nouvelle collision, les positions sauvegardées restent celles de Supabase.
- [ ] V16 LABORATOIRE administrateur : toujours disponible, mais ses brouillons ne sont pas transférés automatiquement dans le monde réel.

## Retour arrière immédiat, sans perte de données

Dans le `WorldMap.tsx` actuel, retire simplement `world-v16-scene` du `className` du div de caméra. Le fond précédent et les sprites précédents reviennent dès le prochain déploiement ; aucune migration SQL ni suppression de ville n'a lieu.

## Limites et périmètre de cette intégration

- **C'est la V16 visuelle officiellement connectée au fonctionnement existant**, pas une migration des données du laboratoire V16.
- **Positions gameplay inchangées** : les POI conservent leurs coordonnées existantes ; ils ne sont donc pas obligatoirement à la place exacte qu'ils occupaient dans l'image de référence.
- Les maisons additionnelles peintes de la référence **ne sont pas affichées artificiellement** : seules les vraies villes (ou le fallback existant) apparaissent, afin d'éviter de créer des adversaires fictifs sur la production.
- Les routes du fond sont peintes ; leur édition/suppression et l'agrandissement de région seront des chantiers distincts.
- Le sol découvert dans la V16 contient quelques zones restaurées automatiquement, déjà visibles dans le laboratoire.
- La texture de fond est étirée sur l'emprise actuelle : une future région plus grande nécessitera des dalles/secteurs de terrain indépendants.
- Les POI sans asset V16 dédié, comme le Chantier clandestin, conservent leur interaction et un marqueur de secours.
- Le laboratoire V16 reste en Canvas 2D ; le rendu actuel du monde officiel (React/CSS) n'est pas converti en PixiJS par ce patch. Cela réduit les risques de casser PvE/PvP et le bug de destruction PixiJS précédent.
