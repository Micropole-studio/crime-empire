# Crime Empire — World Map V16 : éditeur basé sur la référence visuelle

## Ce que tu obtiens

Un **laboratoire interactif** qui affiche le décor de l'image de référence fournie, reconstitué en terrain + **9 sprites séparés** (5 villes et 4 lieux PvE). Le rendu au lancement est volontairement très proche de l'image. Tu peux déplacer, ajouter ou supprimer ces structures, régler l'échelle/rotation, zoomer et tracer des routes en courbes. La sauvegarde se fait dans le navigateur (et par le composant React si le laboratoire est ouvert dans l'iframe sandboxée).

### Tester sans modifier GitHub

Télécharge l'archive `Crime_Empire_V16_APERCU_SANS_GITHUB.zip`, décompresse-la, puis double-clique sur **`OUVRIR_APERCU_V16.html`** pour l'ouvrir dans Chrome/Edge. Tout est intégré au HTML (aucun serveur local, aucune connexion Supabase).

### Installer le laboratoire sur GitHub / Vercel

1. Crée une branche de test ou garde une copie du commit actuel.
2. Décompresse `Crime_Empire_WorldMap_V16_Editeur_Visuel_GitHub_Vercel.zip`.
3. Remplace **uniquement** le dossier `public/modular-zone-01/` avec le contenu du ZIP, images incluses.
4. Dans `src/components/world/ModularZoneLab.tsx`, conserve tes modifications éventuelles mais utilise les 3 réglages V16 ci-dessous ou remplace par le composant fourni après comparaison :
   - `LAB_KEY = "crime-empire-world-v16-reference-edit"`
   - `src="/modular-zone-01/index.html?v=16"`
   - `href="/modular-zone-01/index.html?v=16"`
5. Commit et Push. Sur Vercel, vérifie `Ready` avant de tester.
6. Connecte-toi avec l'administrateur, ouvre **Carte du monde → Tester la zone modulaire**.

**Ne remplace pas** `App.tsx` ou `WorldMap.tsx`. **Aucun SQL** n'est nécessaire. Les positions PvE/PvP réelles en Supabase ne sont pas modifiées.

## Utilisation

- Outil **Sélection / déplacer** : clique une structure, maintiens et fais-la glisser. La zone d'accroche utilise les pixels transparents des sprites.
- **Ajouter au monde** : place un nouveau lieu dans un emplacement libre proche du centre de la caméra.
- **Taille / rotation** : ajuste le sprite sélectionné dans le panneau. La rotation reste une rotation 2D visuelle, pas un modèle 3D.
- **Tracer route** : sélectionne l'outil, clique plusieurs points puis **Terminer**. Les routes ajoutées sont vectorielles et indépendantes.
- **Vue joueur** : cache les outils, remplit l'écran, garde la navigation panoramique et le zoom.
- **Sauvegarde / export** : données expérimentales en localStorage sous la clé dédiée V16, export/import JSON.
- **Annuler/Refaire** et **Restaurer la scène de départ** permettent de revenir à l'état original.

## Limites techniques importantes

Ce prototype utilise l'**image de référence comme source artistique**, pas une zone entièrement peinte à la main à partir d'un atlas de terrain. Les bâtiments ont été détourés, mais **le sol caché derrière eux a dû être reconstitué automatiquement**. À leurs positions d'origine le rendu est très proche de l'image ; lorsque tu déplaces un gros bâtiment, la zone ainsi révélée peut être moins détaillée. Une prochaine étape de production serait un vrai *terrain-only* propre, sans bâtiments ni routes figés, puis des sprites peints séparément et calibrés sur une projection unique.

Les routes existantes visibles sont encore présentes dans le fond. Les nouvelles routes sont éditables, mais les anciennes ne peuvent pas être supprimées en un clic. Et cet éditeur ne constitue **pas encore une world map live pouvant accueillir 100 joueurs** : il faut ensuite un système de régions/tuiles, un rendu à niveau de détail variable et un branchement serveur (droits, collisions, mouvements, PvE/PvP).

Le prototype V16 est rendu en **Canvas 2D sans dépendance supplémentaire** pour garantir une ouverture locale facile. Les textures/sprites et leurs coordonnées sont séparés ; une intégration PixiJS est possible dans le moteur final mais n'est pas nécessaire pour ce test visuel.

## Tests effectués

- Chargement des 11 images, aucune erreur JavaScript dans Chromium.
- Affichage éditeur desktop, vue joueur, affichage mobile.
- Déplacement réel de la Villa Centrale avec sauvegarde en mémoire.
- Ajout d'une ville (de 9 à 10 lieux).
- Tracé d'une route, annulation puis rétablissement.

Le déploiement réel sur ton dépôt GitHub/Vercel n'a pas été exécuté depuis cet environnement.
