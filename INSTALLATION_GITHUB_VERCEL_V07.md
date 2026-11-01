# Crime Empire — Installer la Zone Réaliste V07

1. Sur GitHub, crée une branche de test à partir de la branche que Vercel déploie actuellement.
2. Décompresse l'archive V07 à la racine du dépôt ; **remplace uniquement** les fichiers sous `public/modular-zone-01/`.
3. NE remplace PAS `src/App.tsx`, `src/components/world/WorldMap.tsx` ou les fichiers Supabase. Aucun SQL.
4. Commit puis Push. Ouvre le déploiement Preview Vercel et vérifie le statut **Ready**.
5. Avec ton compte administrateur, accède à **Tester la zone modulaire** ; tu peux aussi ouvrir `/modular-zone-01/index.html` sur l'URL de Preview Vercel.
6. Teste : glisser Ville joueur (2×2), Marché noir (2×2), Prison (3×3), Port sombre (3×3), Dépôt d'armes (2×2) ; essaie de poser sur la route ou l'eau pour vérifier le refus ; peins de l'asphalte et des quais ; recharge, puis Export JSON.
7. Pour comparer en toute sécurité : **Aperçu carte** masque l'éditeur. Tu peux retourner à la V06 par revert du commit ; les données de la vraie world map ne sont pas modifiées.

La V07 utilise la même clé `localStorage` que la V06, pour retrouver les positions enregistrées. Avant un grand changement, exporte ta configuration en JSON.

**État de vérification :** syntaxe JavaScript vérifiée ; page V07 exécutée dans un navigateur Chromium via une intégration embarquée : 12 images sur 12 chargées, 0 erreur JavaScript, affichage PC et mobile observé. Le build Vercel et les interactions sur ton site restent à tester après Push.
