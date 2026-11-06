# Vérifications conseillées

- Fichiers V16 : les dix `.webp` doivent exister dans `public/world/v16/`.
- Code : l'import de la CSS est la seule modification de logique nécessaire dans le point d'entrée.
- Styles : `src/world-v16-live.css` cible directement les classes déjà présentes dans `WorldMap.tsx` (`world-expanse-base`, `world-player-city-render-layer` et `world-background-hotspot`).
- Environnement : code fondé sur la dernière version de `WorldMap.tsx` disponible dans les archives de la conversation, pas une extraction en temps réel du dépôt.
- Aucune action GitHub ni modification de Supabase effectuée.
