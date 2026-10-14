# Crime Empire — Zone Modulaire V04 Premium

## Ce que contient cette livraison

- **Villa / QG : 2×2 = 4 cases** (nouveau sprite noir et or)
- **Dépôt PvE : 3×3 = 9 cases** (nouveau sprite industriel noir et or)
- **Jardin tropical : 1×1**, **Îlot paysager : 1×1**, **Portail : 1×2**
- Objets déplaçables avec **snap automatique sur la grille**
- Emprises visibles à la sélection, surbrillance verte ou rouge en cas de collision
- Socles dessinés sur l'empreinte exacte et point bas des sprites ancré sur la dalle
- Boutons pour ajouter ou retirer des décorations, ajuster l'échelle, les déplacements précis
- Sauvegarde dans le navigateur, import/export JSON

Les sprites sont des **WebP RGBA avec transparence**, redimensionnés pour un chargement Web raisonnable. Le laboratoire reste autonome et ne modifie **aucune base Supabase**.

## Installation via GitHub et Vercel (aucun terminal nécessaire)

1. Sur une branche de test, ouvre l'éditeur GitHub avec la touche `.` ou utilise **Add file → Upload files**.
2. Remplace/ajoute seulement les fichiers contenus dans le ZIP, sous `public/modular-zone-01/`. Respecte l'arborescence, y compris `assets/`.
3. Fais **Commit & Push** sur ta branche de test, puis laisse Vercel construire le déploiement de prévisualisation.
4. Teste le chemin `/modular-zone-01/index.html` sur ton URL Vercel Preview, ou passe par « Tester la zone modulaire » depuis le compte admin.
5. Si la version en cache s'affiche, utilise `Ctrl+Shift+R` ou une fenêtre privée.

**Ne remplace pas `src/App.tsx` ni `src/components/world/WorldMap.tsx`.** Aucun SQL nécessaire.

## Tests à effectuer

- Sélectionne la Villa : **2 × 2 · 4 cases** doit apparaître.
- Déplace-la sur du terrain disponible : l'image doit se caler sur quatre cases.
- Déplace-la sur une route ou sur le dépôt : prévisualisation rouge, placement refusé au lâcher.
- Utilise « Ajouter un décor » puis « Supprimer décor ».
- Recharge la page : les positions locales doivent être retrouvées.
- Vérifie le zoom et les manipulations sur mobile.

## Notes importantes

- **L'import des anciennes positions V03** conserve autant que possible les coordonnées/terrains déjà édités. Les nouvelles décorations se placent dans les emplacements disponibles ; une décoration dont la position serait occupée peut ne pas être ajoutée.
- Ce laboratoire n'est **pas encore** branché à la world map Supabase : il sert à valider la qualité des assets, des socles et des footprints avant de migrer l'affichage du monde.
- Les routes et les textures du sol restent un chantier graphique ultérieur. Les nouveaux bâtiments ne résolvent pas encore tous les raccords du terrain.
- Aucune dépendance npm n'est nécessaire : HTML, CSS, JavaScript, images WebP.
