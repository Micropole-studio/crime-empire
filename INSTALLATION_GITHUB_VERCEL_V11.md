# Crime Empire — WORLD MAP V11 : ancrage sol premium

## Installation directe depuis V10

1. Dans le ZIP, remplace le dossier `public/modular-zone-01/` entier par celui de la V11.
2. Remplace `src/components/world/ModularZoneLab.tsx` par la version fournie.
3. Vérifie les 3 points suivants :
   - `LAB_KEY` = `crime-empire-world-map-v11-lab`
   - `src` de l'iframe = `/modular-zone-01/index.html?v=11`
   - lien plein écran = `/modular-zone-01/index.html?v=11`
4. Commit / Push sur GitHub puis laisse Vercel rebuild.
5. Teste : `Carte du monde` → `Tester la zone modulaire`.

## Ce que change la V11

- Fondations dédiées par type de lieu (ville, marché noir, prison, port, dépôt d'armes).
- Recalage des ancres des sprites pour limiter l'effet flottant.
- Ombres de contact plus courtes et plus proches du sol.
- Base au sol lisible : dalles, cours, quai, clôtures, marquages.
- Compatibilité d'import V10 → V11 dans le laboratoire.

## Remarque

La V11 reste un laboratoire visuel. Le but est d'améliorer le **raccord au sol** avant une future étape encore plus premium avec vrais assets de fondation intégrés sprite par sprite.
