# Crime Empire — Correction « aperçu animé, ville statique »

## Pourquoi l'ancien aperçu bougeait mais pas la ville

Le fichier d'aperçu utilise directement un **canvas 2D**. Le patch précédent a tenté de refaire la même animation **dans PixiJS uniquement** : le rendu classique n'affichait pas l'eau en mouvement, et une texture manquante pouvait empêcher Pixi de démarrer.

## Nouvelle approche

La mer dispose désormais de son propre calque **Canvas 2D transparent**, placé sur le terrain Premium, exactement aux coordonnées de la marina. Ce calque fonctionne **avec et sans PixiJS** et se déplace/zoome avec la caméra React.

- 16 textures `sea-premium/00.webp` à `15.webp`
- Vagues et reflets mobiles ; animation plafonnée à 30 images/s
- Calque non interactif : aucun changement au déplacement et aux clics sur les bâtiments
- Les anciennes animations d'eau intégrées au rendu PixiJS sont retirées pour éviter les doublons
- Aucune migration SQL ; aucune modification de Supabase, d'éditeur ou de sauvegarde
- Les préférences système « réduire les animations » sont respectées

## Installation

1. **Sur la branche staging**, décompresser le patch à la racine du projet, en conservant l'arborescence `src/` et `public/`.
2. Lancer `npm run build`, puis `npm run dev`.
3. Ouvrir la ville et vérifier que le bouton indique **Ville Premium** (sinon cliquer pour changer de style).
4. La mer est maintenant animée même si le deuxième bouton indique **Rendu classique**.
5. Regarder le **badge 🌊** en bas de la carte :
   - `Mer animée (2D)` : 16 textures chargées et animation active
   - `Mer animée · textures incomplètes` : certains fichiers manquent
   - `Vagues seules · textures manquantes` : vérifier les URLs sous `/game-assets/sea-premium/`
   - `Mouvement réduit (système)` : l'option d'accessibilité système désactive l'animation
   - `Canvas 2D indisponible` : navigateur incompatible
6. Si tu utilises un déploiement, pousser **à la fois les fichiers du dossier `src` et les 16 fichiers `.webp`** ; faire un rechargement forcé du navigateur après déploiement.

## Ce qu'il ne faut pas faire

Ne pas exécuter de SQL, ne pas modifier `players`, `cities`, ou les positions enregistrées dans Supabase. Ce correctif est purement graphique.

## Vérification

Dans les outils de développement du navigateur > Réseau, l'adresse `<URL_DU_SITE>/game-assets/sea-premium/00.webp` doit retourner **HTTP 200**. Une erreur 404 indique que les textures ne sont pas déployées dans le dossier public.

## Fichiers modifiés

- `src/components/map/GameMap.tsx`
- `src/components/map/PixiCityScene.tsx`
- `src/components/map/SeaCanvasOverlay.tsx` (nouveau)
- `public/game-assets/sea-premium/00.webp` ... `15.webp`

`src/components/map/SeaAmbience.ts` de l'ancienne tentative n'est plus utilisé et peut rester en place ; tu pourras le supprimer après vérification.
