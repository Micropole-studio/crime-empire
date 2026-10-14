# Crime Empire — Zone Modulaire 03 : placement propre

## But de cette version

Transformer la Zone Modulaire 02 (sprites déplacés avec une largeur en pixels arbitraire) en **laboratoire à emprises isométriques**.

La version 03 est **une page de test indépendante**, et non la vraie world map. Elle se déploie simplement dans `public/modular-zone-01/` via GitHub → Vercel.

## Spécifications de base

| Objet | Empreinte | Cases | Image | Position enregistrée |
|---|---:|---:|---|---|
| Villa / QG | **4 × 4** | **16** | `assets/ville-v03.webp` | `(r,c)` = coin haut-gauche de l'empreinte |
| Dépôt PvE | **3 × 3** | **9** | `assets/depot-v03.webp` | `(r,c)` = coin haut-gauche de l'empreinte |

Taille d'une tuile projetée : **236 × 120 unités** (losange isométrique). Grille pilote : 9 lignes et 11 colonnes. Coordonnées `(r,c)` entières et fixes pour tous les objets. Pas de rotation libre dans la V03, car elle désalignerait le dessin de l'emprise.

## Ancrage précis

Une emprise `rows × cols` commence à la case `(r,c)` et couvre les cases `r..r+rows−1`, `c..c+cols−1`.

Centre du socle :

```
centre = local(r + (rows - 1)/2, c + (cols - 1)/2)
local(r,c) = {x:(c-r)*236/2, y:(c+r)*120/2}
```

Les **quatre coins du socle** utilisent les coins extérieurs des tuiles, avec décalage de ±0,5 case. Le sprite transparent est aligné sur le centre du socle avec un décalage vertical constant lié à l'emprise. La largeur visuelle est relative à la largeur projetée de l'emprise : la taille choisie n'est plus en pixels arbitraires.

### Assets

Les deux sprites de cette livraison sont **les illustrations Premium déjà validées, découpées plus étroitement** et converties en WebP transparent. Il ne s'agit pas encore de modèles 3D construits sur la géométrie exacte de chaque tuile. Le socle et les ombres sont dessinés dans le moteur. Cela permet d'itérer sur le cadrage et l'ancrage avant de créer des sprites définitifs par niveau.

## Placement et validation

- La souris/le doigt sélectionne le sprite ou sa dalle.
- Le déplacement effectue un **snap immédiat** en lignes/colonnes entières.
- Une Villa 4×4 ne peut pas dépasser de la carte : les positions sont limitées aux lignes `0..5`, colonnes `0..7`.
- Un dépôt 3×3 ne peut pas dépasser : lignes `0..6`, colonnes `0..8`.
- Les cases en **route** ou en **eau** interdisent la pose.
- Deux empreintes de bâtiments ne peuvent pas se chevaucher.
- La sélection dessine les cases et le pourtour de l'emprise : **vert si valide**, **rouge si interdit**.
- Si la pose est interdite, au relâchement le bâtiment revient à la **dernière position valide**.
- Peindre une route ou de l'eau sous une empreinte existante est refusé.
- Les flèches de déplacement précis utilisent les mêmes validations.

## Sauvegarde

Cette version utilise `localStorage` via la clé `crime-empire-modular-zone-03-local-v1`. Elle tente de migrer les données de V02 (`crime-empire-modular-zone-02-local-v1`) **seulement si l'ensemble reste valide**. Sinon, elle conserve les parcelles de test ou les réglages de départ sans écrire dans Supabase. L'export JSON est en `version:3` et contient l'emprise descriptive de chaque type de bâtiment.

## Installation GitHub / Vercel (sans local)

1. Ouvrir le dépôt dans GitHub et créer une branche de test (ou une pull request de test).
2. Dans l'archive, copier/réécrire **uniquement** `public/modular-zone-01/` dans le même chemin sur GitHub.
3. Vérifier que `index.html`, `lab.js`, `styles.css`, `assets/ville-v03.webp`, `assets/depot-v03.webp` sont présents.
4. Faire le commit. Vérifier le build et ouvrir l'URL d'aperçu Vercel de la branche.
5. Se connecter à Crime Empire avec l'admin, puis choisir **Tester la zone modulaire** si le laboratoire est déjà relié à l'application. Sinon naviguer vers `/modular-zone-01/` sur l'URL de prévisualisation Vercel.
6. Le patch n'inclut aucun changement à `src/App.tsx` ou `src/components/world/WorldMap.tsx` et aucun SQL.

## Scénario de recette

1. Sélectionner la Villa : le panneau indique **4×4 — 16 cases** et montre une emprise verte.
2. Déplacer la Villa d'une case : position entière et socle dans les limites de la grille.
3. Essayer d'entrer dans une route ou l'eau : emprise rouge, rejet et retour à la dernière case valable.
4. Sélectionner le dépôt : **3×3 — 9 cases**.
5. Essayer de placer les deux bâtiments sur les mêmes cases : rejet du chevauchement.
6. Peindre des surfaces près des bâtiments et utiliser le zoom / la caméra.
7. Actualiser : les placements du **laboratoire** doivent rester dans ce navigateur.
8. Vérifier sur un petit écran. Le serveur Supabase et les comptes des joueurs ne doivent pas être affectés.

## Limites assumées et prochaine étape

- Terrain provisoire en tuiles géométriques, non artistique.
- Contact sol amélioré grâce à un socle 4×4 mais les deux sprites d'origine restent imparfaits en termes de perspective. Pour un raccord de niveau production, produire des assets avec **dalle correspondant exactement à la projection de l'empreinte**, un calque d'ombre séparé et des variantes visuelles par niveau.
- Les routes avancées et les transitions de terrain restent à produire.
- L'éditeur est un laboratoire autonome et n'écrit PAS les coordonnées des villes de la world map. Il ne faut pas confondre sauvegarde `localStorage` et publication du modèle officiel dans Supabase.

## Validation effectuée dans l'environnement de préparation

- `node --check` de `lab.js` réussi.
- Exécution du script dans Chromium avec HTML/JS et images intégrés : canvas rendu, erreur JavaScript **aucune**.
- Vérification de sélection 4×4, déplacement valide, rejet d'un déplacement bloqué, initialisation mobile : réussi.
- Restent à contrôler : rendu sur Vercel, interaction tactile sur appareil réel, sauvegarde locale sur le domaine final.
