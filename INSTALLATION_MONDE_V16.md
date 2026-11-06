# Crime Empire — Activer V16 dans le monde normal (pas seulement dans l’éditeur)

## Cause du souci
L’éditeur `/modular-zone-01/` est autonome : sa V16 ne peut pas changer la vraie World Map React. Celle-ci garde un ancien `background: url("/world/region-1-south.png") ... !important` dans `src/index.css`. Le premier patch V16 nécessitait une classe CSS spéciale sur le calque caméra ; si elle manque, l'ancien monde reste affiché.

## Installation GitHub/Vercel
1. Crée une branche de test depuis le code actuel.
2. Copie le dossier `public/world/v16/` du ZIP dans le dépôt (remplace les images si nécessaire).
3. Ajoute `src/world-v16-live.css` (fichier du ZIP).
4. Dans `src/main.tsx`, ajoute immédiatement APRÈS `import './index.css'` la ligne :

   `import './world-v16-live.css'`

   **Tu peux utiliser le `src/main.tsx` du ZIP seulement si ton propre fichier est identique à celui-ci en dehors de l'import ajouté.** Sinon fusionne la ligne, pour ne pas écraser tes changements.
5. Ne change PAS le laboratoire, `App.tsx`, `WorldMap.tsx`, les services Supabase ni les données.
6. Commit & Push, attends le déploiement Vercel `Ready`, puis force le rechargement Ctrl+F5 sur ordinateur ou recharge la PWA sur mobile.

## Contrôler que c'est bien la vraie carte
- Ouvre la **World Map normale** depuis ta ville (pas « Tester la zone modulaire »).
- Le décor doit venir de `/world/v16/terrain-restaure.webp`, et plus de `/world/region-1-south.png`.
- Dans les outils développeur, vérifie `.world-expanse-base` > `background-image` dans l'onglet Computed.
- Vérifie qu'un clic sur ta ville affiche toujours son panneau et qu'un clic sur une autre ville ouvre l'action PvP habituelle.
- Vérifie Port Sombre, Marché noir, Prison et Dépôt d’armes, puis le zoom mobile et le déplacement des villes.

## Pourquoi ça ne casse pas les positions de joueurs
Cette version change seulement le fond et les images appliquées aux éléments déjà rendus par le jeu. Les coordonnées des villes continuent de venir de Supabase et les hotspots PvE gardent leurs événements d’origine. **Ce patch n'importe pas les positions fictives du laboratoire V16** ; il affiche le rendu V16 sur la world map normale.

## Limites à connaître
- Certains sprites de lieux PvE peuvent nécessiter un ajustement visuel car les coordonnées de l'ancien monde étaient choisies pour son image précédente.
- Les routes du terrain restauré font encore partie de l'illustration; elles ne sont pas éditables depuis la carte normale.
- Le terrain reste un seul grand fond étiré : agrandir la région nécessitera plus tard des secteurs modulaires.
- Pas de build complet validé dans ton dépôt actuellement déployé. Le rendu est un changement CSS, pas une nouvelle logique PvE/PvP.

## Retour arrière (sans perte)
Retire la ligne `import './world-v16-live.css'` de `src/main.tsx` et repousse ton code. L'ancienne world map réapparaît; aucune donnée Supabase n'a été modifiée.
