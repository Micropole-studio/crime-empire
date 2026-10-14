# Crime Empire — Zone Modulaire Premium V05

Cette version est **du code fonctionnel de laboratoire**, pas une image de démonstration.

## Ce qui fonctionne

- **Carte de 12 × 12 cases logiques**, en perspective isométrique ; chaque case est carrée dans la logique du terrain (diamant projeté à l'écran).
- Fond continu, routes avec raccords, parcelles, asphalte, béton, végétation, bord d'eau animé légèrement.
- **Villa 2 × 2 = quatre cases**, dépôt PvE 2 × 2 et autres bâtiments ajoutables : sécurité, garage, laboratoire, syndicat, planque et usine (3 × 3).
- Décors sur 1 × 1 et portail 1 × 2 ; tous les visuels sont séparés du terrain.
- Chaque sprite est calé sur un socle aux coins correspondant exactement à sa zone logique ; ombre de contact au pied du bâtiment.
- Drag souris/doigt, zoom/pan, grille masquable, surbrillance des cases occupées, blocage sur route/eau ou collision.
- Undo/redo, sauvegarde locale, export/import du JSON de la version V05, aperçu joueur.

## Installation sur GitHub, sans utiliser l'ancien projet local

1. Avant la modification, conserve une copie du commit V04 qui fonctionne (ou utilise une branche GitHub de test).
2. Dans l'éditeur Web GitHub, **remplace le dossier `public/modular-zone-01/`** avec les trois fichiers et le dossier `assets` du ZIP. Conserve l'arborescence exacte.
3. Commit les fichiers sur ta branche de test, puis déploie-les avec Vercel.
4. Accède à l'adresse `https://TON-DOMAINE/modular-zone-01/` (ou via le bouton du laboratoire dans Crime Empire).
5. Vérifie l'indicateur **« Carte Premium 12×12 active »**, déplace la Villa et regarde l'empreinte verte 2×2.
6. Teste le bouton **Aperçu joueur** pour masquer l'éditeur et examiner la scène.

### Attention

- **Ne remplace pas** `src/App.tsx` ou `src/components/world/WorldMap.tsx` ; ce ZIP ne contient aucun de ces fichiers.
- **Aucun SQL** et **aucun impact sur Supabase**. Cette page indépendante ne modifie pas les vraies villes des joueurs.
- **Les anciens brouillons V04 ne sont pas écrasés**. La région V05 est nouvelle (12×12 au lieu de 9×11), donc démarre avec sa propre sauvegarde locale. Tu peux exporter V05 sous forme JSON avant de changer de navigateur.
- Cette carte est une base jouable à construire. Le raccord visuel des sprites 2,5D est amélioré par leurs socles, mais une correspondance parfaite d'angles et de fondations demanderait un travail supplémentaire sur les visuels sources.
- Une fois la disposition validée, l'étape suivante sera la transposition du modèle et des coordonnées vers la véritable world map, puis vers Supabase si nécessaire. **Ce ZIP n'effectue pas cette migration.**

## En cas de souci

Sur l'URL du laboratoire, ouvre F12 → Console, puis tape `window.__CE_MODULAR_LAB__.getAssets()` : doit indiquer `ready: 15` et `failed: 0` après le chargement complet. Si un fichier manque, vérifie qu'il existe bien dans `public/modular-zone-01/assets/` sur GitHub.
