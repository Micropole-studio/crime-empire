# Crime Empire — V2.1 Luxe / PixiJS (première passe intégrée)

## Base utilisée
Archive PixiJS précédemment livrée : `crime-empire-phase-pixi-ville-v1.zip`.
La version peut être plus ancienne que tes modifications Git locales : **ne remplace pas ton dépôt actuel aveuglément** si tu as travaillé depuis cette livraison. Utilise plutôt le patch de fichiers ciblés et compare les différences (`git diff`).

## Ce qui est vraiment intégré

- `public/game-assets/city-map-v2.webp` : nouvelle colorimétrie bleu nuit / pierre / champagne, mêmes dimensions **1536 × 1024** que le fond initial, mêmes coordonnées.
- `public/game-assets/villa-v2.webp` : revalorisation colorimétrique, toiture moins rouge, mêmes dimensions **1536 × 1024**, alpha et ancrage conservés.
- `src/components/map/PixiCityScene.tsx` : choix des textures V1/V2, petites lumières ambiantes animées, semelles et ombres sous les bâtiments, éclairage discret de Villa, sans logique métier.
- `src/components/map/GameMap.tsx` : bouton **Ville V2.1 · Luxe / Ville V1 · Originale**. Choix stocké uniquement en `localStorage` (`crime-empire-city-art`). Le bouton PixiJS / classique existant reste disponible.
- `preview-ville-v21.html` : aperçu autonome V1/V2, sans React ni Supabase (effets PixiJS réels non reproduits).

### Limites assumées
Cette livraison est un premier **prototype fonctionnel du traitement graphique**, **pas** encore une reconstruction illustrée de la ville à la hauteur du concept cinématographique. Le modèle du terrain et la perspective restent ceux de la V1 ; les six autres bâtiments sont inchangés. La world map ne change pas dans ce patch. Les maquettes conceptuelles vues dans la conversation ne sont pas des sprites jouables et ne sont pas intégrées au jeu.

## Installation conseillée

1. Créer une branche de travail : `git switch -c graphics/v2-1-luxe` (si elle n'existe pas).
2. Sauvegarder ou committer tes modifications locales avant l'intégration.
3. Copier depuis le patch **uniquement** :
   - `src/components/map/PixiCityScene.tsx`
   - `src/components/map/GameMap.tsx`
   - `public/game-assets/city-map-v2.webp`
   - `public/game-assets/villa-v2.webp`
4. Si les deux `.tsx` ont changé depuis la livraison V1, comparer/fusionner les différences **au lieu d'écraser**.
5. `npm install`, puis `npm run build`, puis `npm run dev`.
6. Tester la ville et le basculement V1/V2 sur PC et mobile, clic Villa, clic autres bâtiments, hélicoptère, drag/pinch, éditeur, création et reconnexion.
7. Déployer en staging avant de fusionner en production.

## Retour arrière
- Immédiatement dans le jeu : bouton `Ville V1 · Originale`.
- Retour complet du patch : `git restore src/components/map/PixiCityScene.tsx src/components/map/GameMap.tsx` (seulement si ces fichiers n'ont pas d'autres modifications à conserver), puis retirer les deux assets V2.1.
- Aucun SQL ni changement Supabase.

## Vérifications réalisées
- Existence, dimensions et ouverture des nouveaux assets.
- Analyse syntaxique TypeScript TSX des deux composants modifiés : aucune erreur syntaxique rapportée.
- Vérification d'intégrité des archives ZIP finales.
- **Non vérifié** : `npm run build` / exécution WebGL dans le navigateur, car l'installation npm a expiré dans l'environnement de préparation. Test local nécessaire.
