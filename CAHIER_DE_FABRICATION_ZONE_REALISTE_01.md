# CRIME EMPIRE — WORLD MAP PREMIUM
## Cahier de fabrication — Zone réaliste 01 / Laboratoire V07

**Périmètre : carte du monde PvE / PvP uniquement.** Ce document ne concerne pas l'intérieur des villes des joueurs (pas de garage, usine, laboratoire, syndicat ou planque construits à l'intérieur de leur cité).

### 1. Objectif fonctionnel

Construire un secteur modulaire crédible, navigable et extensible où des **villes de joueurs** (un seul marqueur représentant la ville), des **points d'intérêt PvE** et le terrain coexistent dans une perspective isométrique cohérente. Préparer la migration vers la région logique du vrai jeu, en **préservant les positions, la progression, les combats et Supabase**. Pas de migration de production à cette étape.

**Livrable pilote V07 :** éditeur statique GitHub/Vercel `public/modular-zone-01/`, terrain procédural plus détaillé, quatre véritables sprites PvE optimisés, grille et interactions héritées de V06, prévisualisation, export JSON. Les changements sont locaux au navigateur : ils ne publient rien en production.

### 2. Gabarit géométrique : choix figés pour le pilote

| Paramètre | Valeur | Règle |
| --- | --- | --- |
| Grille pilote | **14 × 14** cases | Pas une modification des dimensions du monde réel |
| Taille graphique d'une case | **208 px** de large × **106 px** de haut | Losange isométrique ~2:1 |
| Angle visuel | Isométrique 2,5D, lumière chaude latérale | Tous les sprites sous le même point de vue |
| Centre de case | `x = (col − row) × 104`; `y = (col + row) × 53` | Même formule pour tous les éléments |
| Emprise d'un objet | `(row, col, rows, cols)` | Empreinte liée au sol et non à l'image |
| Point de contact | Pointe avant basse du losange occupé | Sprite attaché au socle ; pas de marges transparentes inutiles |
| Grille visible | Admin seulement | Le joueur final voit un terrain continu |
| Tri graphique | Selon la profondeur de la base (`y` du point avant) | Les objets proches couvrent les objets lointains |

Pour une emprise de N×M cases, le socle est un polygone défini par les quatre coins extérieurs de cette emprise. Les cellules occupées sont utilisées pour **snap**, **collision**, **validation** et **surbrillance** ; l'image décorative ne décide jamais de ces règles.

### 3. Catalogue des entités WORLD MAP

| Type | Identifiant V07 | Empreinte | Terrain permis | Visuel |
| --- | --- | --- | --- | --- |
| Ville joueur | `city` | **2×2** (4 cases) | Parcelle, béton, asphalte, herbe | Villa / base entière, **pas** ses bâtiments internes |
| Marché noir | `blackmarket` | **2×2** | Sol sec hors route | Entrepôt clandestin fortifié |
| Prison régionale | `prison` | **3×3** | Sol sec hors route | Prison sécurisée et ses miradors |
| Port sombre | `port` | **3×3** | Doit inclure au moins une case `quay` | Hangar, ponton, bateau, eau en pied de sprite |
| Dépôt d'armes | `weapons` | **2×2** | Sol sec hors route | Entrepôt sécurisé, caisses et tour de garde |

**Contraintes** : aucun chevauchement ; pas de structure sur `water` ou `road` ; une structure non portuaire ne peut pas occuper `quay` ; une structure portuaire doit toucher un quai. Les objets peuvent être déplacés à la souris / au doigt, avec retour à leur dernier emplacement valide. Les déplacements visuels n'affectent pas les identifiants joueurs ni les sauvegardes Supabase.

### 4. Catalogue des terrains : 7 matières logiques

| Matière | Identifiant | Réalisation visuelle | Connexions et règles |
| --- | --- | --- | --- |
| Chaussée | `road` | Bitume sombre texturé, marquage central, bordures claires | Tracés droits, angles et carrefours déterminés par les voisins |
| Parcelle | `plot` | Béton plus régulier, jointures fines | Acceptation des villes et lieux PvE |
| Asphalte | `asphalt` | Grain sombre, microfissures, salissures | Carrefours et cours industrielles |
| Béton | `concrete` | Dalles, lignes de joints et marques d'usure | Transition vers trottoirs, bâtiments et quais |
| Végétation | `grass` | Terrain organique et végétation fine | Bordures douces à produire en atlas définitif |
| Eau | `water` | Eau bleu nuit, reflets discrets | Navigation visuelle ; bâtiments interdits |
| Quai | `quay` | Béton portuaire, ligne de rive et petites bornes | Transition vers l'eau, nécessaire au Port sombre |

**Première passe V07 :** quatre matières `asphalt`, `concrete`, `grass`, `water` ont des textures WebP plus riches ; `road`, `plot` et `quay` sont composés de ces matières avec des règles de bordure dessinées par Canvas. Cette passe améliore le prototype, **sans prétendre remplacer un atlas artistique de routes et de rives**.

#### Futur atlas à produire avant la carte finale

- Routes : **16 configurations de voisinage** (aucun voisin ; 4 terminaisons ; 2 lignes droites ; 4 coudes ; 4 T ; 1 croisement), avec raccords identiques sur les bords.
- Rives de quai : bords orientés, angles sortants/entrants, marches et pontons.
- Transitions terre/béton/herbe : masque de jonction par voisinage pour gommer le damier.
- Décors : lampadaire, lampadaire double, arbre haut, buisson, barrière, conteneur, bouée, bollard et petites caisses.
- Effets : eau discrètement animée, halos de lampes et ombres de contact limitées à la zone active.

### 5. Cahier des sprites : contraintes d'export

1. **Un sprite par type d'objet**, sans ville intérieure détaillée.
2. **PNG maître transparent** ; livraison WebP RGBA optimisée, cible 600–900 px de large pour les lieux 2×2 et 3×3 (ajuster après tests mobile).
3. Recadrer l'alpha au plus près ; garder l'ombre de contact et la base, mais éviter une marge invisible de plusieurs centaines de pixels.
4. Perspective unique : façade dans le même axe que les routes ; lumière nocturne **anthracite + champagne**, chaude et cohérente.
5. **La base du sprite doit s'aligner sur le socle** ; le pied le plus bas de la parcelle définit l'ancrage en profondeur.
6. Préserver de la place pour les étiquettes de nom et les repères PvP/PvE, sans les peindre dans l'image.
7. Tous les objets restent indépendants des terrains de la carte ; l'eau du port doit être limitée au sprite ou à une transition maîtrisée.

La V07 remplace les quatre miniatures provisoires par les illustrations produites pour **marché noir, prison régionale, port sombre et dépôt d'armes**. La Ville joueur conserve l'asset World Map de V06 afin de ne pas confondre le marqueur de carte et la ville intérieure.

### 6. Architecture technique retenue

```text
public/
  modular-zone-01/
    index.html          # éditeur de laboratoire, autonome
    styles.css          # interface noire / or, responsive
    lab.js              # grille, dessin, placement, historique, export
    assets/
      world-city.webp   # représentation World Map d'une ville entière
      black-market.webp
      prison.webp
      dark-port.webp
      weapons-depot.webp
      asphalt.webp
      concrete.webp
      grass.webp
      water.webp
      ...                # décor et éléments déjà présents
```

**Couches de scène** : fond de région → tuiles / matières → marquages et bordures → décor statique → socles / ombres → sprites triés par profondeur → sélection / cases occupées → étiquettes → interface utilisateur.

**Compatibilité de sauvegarde** : la V07 continue à lire la clé locale V06 `crime-empire-world-map-v06-lab` pour conserver le plan déjà dessiné dans le navigateur. Export JSON version 7. Rien n'est écrit dans Supabase.

### 7. Passage futur au vrai monde 6 000 × 4 000 (non inclus)

**Ne jamais copier les coordonnées graphiques du pilote telles quelles** vers les villes réelles. Les cases de démonstration ne sont pas des identifiants de slot de Région 1.

Migration recommandée :

1. Lire les **slots / positions existants** de la vraie world map et construire une table de correspondance stable `(slotId -> row,col)` ; garder le slot et le joueur comme source d'autorité.
2. Introduire un **calque modulaire PixiJS indépendant** dans la scène de World Map, initialement en mode preview admin.
3. Afficher d'abord **une seule ville réelle** au-dessus d'un socle modulaire, sans modifier sa localisation logique. Vérifier ses interactions, zooms et labels.
4. Basculer les quatre **PvE** un par un : mêmes identifiants de POI, mêmes missions, mêmes minuteries, nouvel affichage.
5. Migrer les routes, l'eau et les zones de terrain, tout en gardant le calcul serveur / client des déplacements inchangé jusqu'à validation.
6. Après validation sur PC et mobile : ouvrir progressivement la carte publique et retirer les éléments illustrés de l'ancienne image.

Pour le futur placement volontaire des villes par les joueurs, ajouter plus tard : réservation transactionnelle d'un slot libre côté serveur, contrôle d'occupation atomique, cooldown/cout éventuel, propagation temps réel et vérification RLS. **Le laboratoire actuel ne donne aucun droit de déplacer une ville réelle.**

### 8. Critères de validation

- Lancement de la page Vercel à `/modular-zone-01/index.html` sans écran noir ni erreur JS.
- 12 images chargées : **0 asset manquant**.
- Vue lisible sur PC et mobile, caméra, zoom souris et pincement fonctionnels.
- Ville joueur ancrée sur **2×2** ; Marché noir et Dépôt d'armes sur **2×2** ; Prison et Port sur **3×3**.
- Aucun placement sur eau, route ou emplacement déjà occupé.
- Port sombre valide uniquement avec zone `quay` ; son sprite reste visible sans masquer les interactions des autres objets.
- Après rechargement, positions V06 préservées ; import/export JSON toujours fonctionnels.
- Aucun SQL, aucun changement à `App.tsx`, `WorldMap.tsx`, aux niveaux ou à l'économie.

### 9. Ordre de fabrication / coût de risque

| Sprint | Livraison concrète | Condition avant suite |
| --- | --- | --- |
| **V07 — actuelle** | Textures améliorées et quatre sprites PvE réels dans le labo V06 | Ouvrir sur Vercel, valider PC/mobile et raccords |
| V08 | Atlas 16 connexions routes + rives de quai, transitions de matières | Plus de cassures visibles au zoom |
| V09 | Ajustement fin de l'ancrage des 5 sprites, socles et ombres, LOD mobile | Base des objets parfaitement calée aux cellules |
| V10 | Brancher la grille à une **portion réelle** de la world map en preview admin | Aucun décalage des POI ni des villes existantes |
| V11+ | Déploiement sectoriel dans la Région 1 puis nouvelles régions | Tests PvE, PvP, RLS et performance validés |

**Point de contrôle** : on ne détruit pas la world map en production tant que V10 n'a pas validé les coordonnées réelles, le rendu et les interactions.
