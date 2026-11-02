# Crime Empire — WORLD MAP V10 : territoire continu

## Installation directe depuis V07 + correctif V08 (V09 NON nécessaire)

Cette version remplace **le laboratoire** V07/V08 sans modifier la world map PvE/PvP en production.

1. Sur GitHub, crée une branche de test (ou ouvre ton dépôt dans github.dev avec la touche `.`).
2. Dans le ZIP, copie le dossier `public/modular-zone-01/` entier dans le dépôt en remplacement du dossier du laboratoire existant. **Conserve tous les sous-dossiers et fichiers de `assets/`.**
3. Dans `src/components/world/ModularZoneLab.tsx`, remplace le fichier correspondant **après comparaison** ou applique uniquement ces trois changements par rapport au correctif V08 :
   - `LAB_KEY` : `crime-empire-world-map-v10-lab` (sépare les brouillons).
   - `src` de l'iframe : `/modular-zone-01/index.html?v=10`.
   - `href` de « Plein écran » : `/modular-zone-01/index.html?v=10`.
4. Fais Commit et Push. Vérifie l'aperçu Vercel `Ready` avant toute publication en production.
5. Connecte-toi à Crime Empire avec ton compte administrateur : **Carte du monde → Tester la zone modulaire**.
6. Tu peux aussi accéder à `https://TON-DOMAINE/modular-zone-01/index.html?v=10` pour un test autonome, sans l'application parente.

N'installe **pas** la V09 avant. Ne touche pas à `WorldMap.tsx`, `App.tsx` ni à Supabase.

## Ce qu'offre V10

- Territoire de démonstration **continu**, sans damier apparent, avec routes, espaces naturels, littoral et marqueurs de secteurs.
- Les sprites de **Ville joueur** (2×2), **Marché noir** (2×2), **Dépôt d’armes** (2×2), **Prison régionale** (3×3), **Port sombre** (3×3) sont indépendants.
- Caméra : pan à la souris / au doigt, molette / pinch / zoom, aperçu joueur (sans panneau éditeur).
- Grille cachée, activable seulement dans l'éditeur, **snap** des objets, collisions, déplacement et vérification de la côte.
- Ajouter des villes / POI, peindre localement des types de sol, annuler / refaire, enregistrer le brouillon V10 et exporter/importer un JSON.
- **Aucune donnée réelle de joueurs, aucun combat, aucun SQL** : le laboratoire reste expérimental et les villes affichées sont fictives.

## Architecture

La base naturelle est un **terrain raster procédural continu**. Les routes, la côte, la végétation, les frontières et les bâtiments sont dessinés en **couches distinctes** dans le canvas. La grille est une **structure logique invisible**, et non un assemblage de carreaux obligatoires à l'écran. C'est un socle de travail pour migrer progressivement les placements réels Supabase et l'interface PvE/PvP. Le rendu reste un prototype artistique, **pas une carte Kingshot finale**.

## Validation

- Vérifié : parsing JavaScript, chargement des 9 images, rendu d'un écran desktop et mobile via Chromium en HTML autonome, présence des 8 objets initiaux, validité de leurs positions, ajout de ville, affichage grille, zoom.
- À vérifier sur ton Vercel : sauvegarde de brouillon dans l'iframe via la passerelle React, comportement touch/pinch sur ton téléphone, performance quand tu zoomes très près.

## Retrait / retour en arrière

Revient au commit d'avant V10 ou restaure `public/modular-zone-01/` et `ModularZoneLab.tsx` depuis ta branche précédente. Le stockage V07/V08 est conservé sous sa propre clé et n'est pas réécrit.
