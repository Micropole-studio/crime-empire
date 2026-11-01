# Crime Empire — Correctifs console V08 (1 novembre 2026)

## Problèmes constatés

1. PixiJS `TypeError: this._cancelResize is not a function` lors du nettoyage d'une application.
2. `Unable to preventDefault inside passive event listener invocation` dans la carte du monde.
3. World Lab V07 : `SecurityError: ... localStorage ... sandboxed ... allow-same-origin`.
4. `SYNC ECONOMY` : simple journal de diagnostic, pas une erreur en soi.
5. `content.js: No Listener` : vraisemblablement extension de navigateur ; sans lien direct établi avec les fichiers du jeu.

## Modifications proposées

- `src/components/map/PixiCityScene.tsx` : nettoyage idempotent (`disposePixi()`), y compris en cas de retour asynchrone des textures après démontage React. Ne touche pas à la progression.
- `src/components/world/WorldMap.tsx` : remplace l'événement synthétique React `onWheel` par `addEventListener('wheel', ..., {passive:false})` et retire le handler existant.
- `src/components/world/ModularZoneLab.tsx` : maintient l'iframe `sandbox="allow-scripts"`, et relaie uniquement un brouillon JSON de carte via `postMessage`; contrôle strict de `event.source`, volume limité, clé locale fixée. Aucun accès direct du laboratoire à Supabase.
- `public/modular-zone-01/lab.js` : fonctionne en iframe avec sauvegarde via le parent, ou en page autonome avec `localStorage` direct.
- `public/modular-zone-01/index.html` : ajuste la version du JS/CSS à `v=8` pour éviter le cache.

## Très important : éviter d'écraser les versions actuelles

Nous **n'avons pas d'accès en écriture au dépôt GitHub actuel**. Les fichiers TypeScript fournis proviennent du dernier projet complet connu et, pour `WorldMap.tsx`, du patch V2.2 qui avait déjà été réinstallé.

**Méthode recommandée :** sur une nouvelle branche GitHub, comparer et appliquer les fichiers `FIXES_DIFFS/*.patch` (5 différences séparées) aux fichiers présents dans ton dépôt. Utiliser les fichiers complets uniquement si leurs versions correspondent à celles du projet actuel. Cela évite de supprimer des évolutions intermédiaires de la world map.

L'atelier V07, lui, doit rester entièrement dans `public/modular-zone-01/`. Il est indépendant des joueurs. Le composant React `ModularZoneLab.tsx` assure l'accès et la sauvegarde. **Ne pas** remplacer `App.tsx` et ne pas modifier Supabase.

### Installation GitHub/Vercel

1. Dans Github, crée une branche `fix/console-worldmap-v08` à partir de la branche déployée.
2. Ouvre les `FIXES_DIFFS` et reporte les changements sur les cinq fichiers actuels (ou copie les versions complètes si le fichier initial est identique à celui du patch).
3. Commit + Push, puis vérifie le build Vercel et l'aperçu de la branche.
4. Sur PC, ouvre successivement la ville, la world map et la zone modulaire, puis effectue des aller-retour entre les vues.
5. Vérifie le zoom molette et tactile, puis déplace une ville fictive dans le labo. Recharge le laboratoire et vérifie que la position du brouillon est restaurée.
6. Teste le rendu PixiJS de la ville et le retour arrière React plusieurs fois.
7. Si tout est bon, fusionne la branche dans la branche de production.

### Test de la sauvegarde

La sauvegarde V07 concerne uniquement les **objets fictifs du laboratoire**, via le stockage du navigateur sur le même appareil. Elle ne publie pas de positions Supabase. L'export JSON reste recommandé pour conserver une copie des essais.

### Réversibilité

Revenir au commit précédent de la branche GitHub suffit. Aucun SQL ni migration n'est inclus.

## Vérifications effectuées ici

- JavaScript syntaxique : `node --check` réussi.
- TypeScript/TSX : transpilation syntaxique sans erreur avec TypeScript.
- Contrôle des remplacements et des différences ligne par ligne.
- Archivage ZIP vérifié.

**Non vérifié** : build npm/Vercel sur le dépôt réel, cycle de vie PixiJS dans le navigateur de l'utilisateur. Le navigateur automatisé de cet environnement refuse la navigation vers le serveur local, donc le test end-to-end doit avoir lieu sur l'aperçu Vercel de la branche.
