# Crime Empire — Mer Premium / PixiJS

Ce mini-patch ajoute un premier **effet marin animé** au terrain Premium existant.

## Modifications

- `src/components/map/SeaAmbience.ts` — nouveau calque graphique PixiJS non-interactif, environ 14 ondulations et 9 scintillements doux sur les zones d'eau du terrain Premium.
- `src/components/map/PixiCityScene.tsx` — ajout du calque **entre le terrain et les bâtiments**, animation via le ticker PixiJS existant, adaptation à la taille du terrain et désactivation automatique dans le mode graphique classique.
- `preview-mer-premium.html` — aperçu indépendant du projet (ouvrir localement après avoir décompressé ce pack, avec `public/game-assets/city-map-luxe.webp` présent).

## Garanties

- Aucune modification Supabase, SQL, RLS, aux positions des bâtiments ou au HUD.
- Aucun déplacement du yacht : il est encore peint dans la texture de terrain.
- Calque exclusivement visuel, pas de capture des clics / gestes.
- Préférence système `prefers-reduced-motion` respectée.
- Si PixiJS ne démarre pas, l'image de fond et les interactions classiques restent opérationnelles, sans animation de mer.

## Limite artistique actuelle

Le yacht, les quais et la mer étant peints dans un **fond unique**, nous avons ajouté des reflets ondulants, pas une déformation physique de l'eau. Pour un effet de houle plus réaliste (et un vrai yacht animé), il faudra découper le bateau, les quais et le masque d'eau en textures séparées dans un deuxième passage.

## Installation

Appliquer le patch à la racine du projet, sans écraser d'autres fichiers. Puis exécuter :

```bash
npm run build
npm run dev
```

Sur la ville, activer l'affichage **Ville Premium** et le moteur **PixiJS**. La mer est animée automatiquement lorsque l'onglet est actif.
