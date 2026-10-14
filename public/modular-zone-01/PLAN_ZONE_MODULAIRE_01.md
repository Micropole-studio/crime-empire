# CRIME EMPIRE — ZONE MODULAIRE 01
## Cahier de démarrage et prototype de validation

**Objectif :** remplacer progressivement le fond figé de la world map par un terrain assemblé, sans changer le gameplay et les positions Supabase.

### 1. État initial constaté dans le projet

- `src/data/worldLayout.ts` : monde logique **6 000 × 4 000**, positions exprimées en pourcentage, région centrale située de 32 à 68 % horizontalement et verticalement.
- `src/data/worldMapNodes.ts` : cinq POI PvE possèdent déjà des coordonnées et des zones de clic, mais leurs visuels sont peints dans l'illustration de fond.
- `src/components/world/WorldMap.tsx` : caméras, clics, jeux PvE, gestion des villes et sauvegardes existent ; il ne faut pas les remplacer d'un coup.
- `public/world/cities/world-city-grounded.webp` : Villa joueur isolée, réutilisable. Son rendu sera encore à optimiser à proximité du sol.
- Le jeu utilise déjà **React, Vite, PixiJS et Supabase**.

### 2. Ce que contient cette livraison

Un **laboratoire interactif autonome** dans `public/modular-zone-01/index.html` :

- terrain rendu à partir de **cases isométriques** ;
- tuiles indépendantes `concrete`, `asphalt`, `grass`, `water`, `plot` et `road` ;
- une Villa joueur et un dépôt PvE comme objets distincts des cases ;
- socles et ombres de contact pour limiter l'effet de flottement ;
- navigation : zoom, recentrage, déplacement par glisser, interactions tactiles ;
- visualisation de la grille ;
- outils pour repeindre des cases et voir immédiatement l'effet ;
- aucun appel à Supabase, aucune modification du gameplay ni de la world map actuelle.

**Important :** la maquette est un outil technique pour vérifier le principe, **pas encore le décor final haut de gamme**. Elle utilise un Canvas 2D autonome pour être ouvrable sans installer de dépendances ; la scène de production sera intégrée au moteur PixiJS dans une phase ultérieure.

### 3. Structure cible du terrain

```text
WorldMap (React : contrôles, sélection et gameplay conservés)
  └── WorldRenderer (PixiJS V8)
       ├── TerrainLayer    (tuiles de béton / asphalte / sol / eau)
       ├── RoadLayer       (segments de route avec raccords automatiques)
       ├── GroundDetail    (trottoirs, fondations, décor au sol)
       ├── ObjectLayer     (villes joueurs, POI PvE, bâtiments)
       ├── ShadowFxLayer   (ombres, reflets, lampadaires)
       └── SelectionLayer  (emplacements libres, clics, sélection)
```

Chaque tuile est **une cellule logique** ; les images 2D ne dictent pas les règles de jeu. Dans la version finale, la texture des routes sera choisie selon les quatre voisins (N/E/S/O), et les transitions terre/eau/béton utiliseront leurs propres bordures.

### 4. Données à stocker

```json
{
  "sectorId": "region_1_pilot",
  "revision": 1,
  "tileSizeWorld": 256,
  "tiles": [{ "row": 4, "col": 5, "terrain": "concrete", "roadMask": 0 }],
  "objects": [{ "kind": "pve", "key": "illegal_construction_site", "xPercent": 82.5, "yPercent": 65.0 }]
}
```

Le `tileSizeWorld=256` est un exemple de pas de grille à valider. Les **coordonnées percentuelles existantes restent canoniques** ; la projection dans l'espace isométrique appartient uniquement au renderer. Une relocalisation joueur continue d'écrire dans les tables Supabase actuellement utilisées.

### 5. Ordre de développement conseillé

**Sprint 01 — Prototype (livré ici).** Petite grille isolée. Tests des tuiles, de la caméra et de la superposition de deux objets. Pas de SQL.

**Sprint 02 — Raccords terrain.** Générer ou dessiner 12 à 20 textures : béton normal, variation, bordures, routes droites, virages, croisement, quai/eau, végétation. Uniformiser **angle, échelle, lumière**.

**Sprint 03 — PixiJS intégré.** Créer un composant expérimental isolé avec les layers ci-dessus. Utiliser les coordonnées et le zoom de la world map existante, via un adaptateur géométrique et un interrupteur réservé à l'administrateur. Ne pas remplacer les clics PvE avant les tests.

**Sprint 04 — Villes et POI.** Isoler et accrocher au sol les sprites des villes et des cinq zones PvE. Ombres calculées depuis la base. Remplacer les zones PvE de l'ancien fond **une à une**.

**Sprint 05 — Extension région 1.** Tuiles regroupées en *chunks*, chargement limité aux zones visibles, emplacements existants inchangés, tests mobile et PC, puis activation officielle par l'admin.

### 6. Points techniques qui ne doivent pas être cassés

- Ne pas modifier `WORLD_MAP_WIDTH`, `WORLD_MAP_HEIGHT` ni les coordonnées Supabase sans migration explicitement préparée.
- Ne pas changer les identifiants `id`, `key`, coordonnées ni la logique des `WorldNode` PvE.
- Ne jamais écrire de positions en base depuis le moteur graphique.
- Le mode V3 pilote doit rester indépendant et accessible seulement pour tests avant la bascule.
- Prévoir le *culling* des tuiles hors écran et un atlas de textures pour limiter les appels de rendu sur les téléphones.
- Les éléments interactifs doivent utiliser les mêmes transformations que le terrain : coordonnées écran ↔ monde ↔ grille.

### 7. Critères d'acceptation pour passer en vraie production

- Routes et terrain continus, sans coutures visibles à plusieurs niveaux de zoom.
- Villa sur un socle cohérent : plus de sensation de flottement.
- Les POI restent cliquables aux bons endroits.
- Le joueur peut zoomer et déplacer la carte au doigt ou à la souris sans à-coups perceptibles.
- Tous les comptes conservent leur ville, leurs coordonnées, leurs attaques et leurs ressources.
- Un administrateur peut valider le rendu avant publication à tous.

### 8. Mise en place de ce prototype

1. Copier le dossier `modular-zone-01` dans `public/` de ton projet Vite actuel.
2. Démarrer ton application avec `npm run dev`.
3. Ouvrir **http://localhost:5173/modular-zone-01/** dans un navigateur.
4. Essayer les outils Béton / Asphalte / Terrain / Eau / Parcelle, déplacer la caméra et afficher la grille.
5. Cliquer sur la Villa et le dépôt. Pour repartir de zéro, cliquer sur **Réinitialiser**.

Tu peux aussi ouvrir `index.html` directement depuis le dossier, selon les règles de sécurité de ton navigateur.

**Les modifications dans ce prototype ne sont pas enregistrées : il sert uniquement à la validation visuelle et technique.**
