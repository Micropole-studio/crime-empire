# Crime Empire V3 — Correctif écran noir du laboratoire

## Symptôme
Le bouton « Tester la zone modulaire » s’ouvre, mais le décor/canvas reste noir. Notre précédent composant utilisait `iframe srcDoc` avec un script embarqué. Ce script peut être bloqué par la politique de sécurité (CSP) de Vercel ou par l’intégration dans l’iframe. Sans script, le canvas ne dessine rien.

## Ce que change le patch
- `src/components/world/ModularZoneLab.tsx` pointe maintenant vers une vraie page statique `/modular-zone-01/index.html?v=3` ; plus de HTML injecté en `srcDoc`.
- `public/modular-zone-01/index.html` et `styles.css`, `lab.js` séparent la présentation et le JavaScript pour permettre le chargement externe.
- `public/modular-zone-01/assets/` contient les textures du terrain et les deux sprites.
- Un indicateur s’affiche : « ✅ Carte modulaire active » si le premier rendu a fonctionné ; une erreur explicite autrement.
- `sandbox="allow-scripts"` conservé : la démo ne peut pas accéder au DOM parent, aux cookies et au localStorage Supabase du jeu.

## Installation sur GitHub (pas de local nécessaire)
1. Sur GitHub, ouvre le même dépôt que Vercel et appuie sur `.` (github.dev).
2. **Remplace seulement** `src/components/world/ModularZoneLab.tsx` par celui du ZIP.
3. Copie **tout le dossier** `public/modular-zone-01/` du ZIP vers la racine `public` du dépôt, en respectant les chemins.
4. Ne touche PAS à `App.tsx` ni à `WorldMap.tsx` : leur intégration précédente doit rester intacte.
5. Fais Commit/Push sur une branche de test, puis vérifie le déploiement Vercel.
6. Ouvre directement `https://TON-DOMAINE/modular-zone-01/index.html?v=3` : la carte doit être visible et l’outil « Grille » fonctionner.
7. Connecte-toi en administrateur, clique sur « Tester la zone modulaire » ; la même carte doit s’afficher.

**IMPORTANT** : la route statique est publique, mais ne sert que des graphismes expérimentaux ; aucune session, donnée personnelle ou écriture Supabase n’y figure. Le bouton dans le jeu reste limité à l’administrateur.

## Si l’écran est toujours noir
- Si tu lis « ⏳ Initialisation du terrain… » sans changement, examine dans la console réseau les requêtes `/modular-zone-01/lab.js`, `/modular-zone-01/styles.css` et `/modular-zone-01/assets/*.webp`, et les erreurs `Content Security Policy`.
- Si tu lis « ❌ Initialisation impossible » ou « ❌ Erreur de rendu », copie ce message et l’erreur de console.
- Si la page autonome fonctionne mais pas l’iframe, copie l’erreur de sécurité du navigateur : il faudra éventuellement ajuster la politique `frame-src`/`sandbox` du site.
- En cas de 404 sous `/modular-zone-01/index.html`, vérifie que les fichiers sont réellement dans `public/` et non `src/`.

Aucun SQL, aucune modification des combats PvE, sauvegardes ou positions joueurs.
