# Crime Empire — World Map Modulaire V06 (reboot PvE/PvP)

## Ce que contient cette version

C'est **un laboratoire de world map**, pas un éditeur de l'intérieur de la ville.

- **Villes des joueurs** : marqueurs de monde indépendants, empreinte 2 × 2 (4 cases). Les deux villes de démonstration sont fictives et ne sont pas liées à un compte réel.
- **Marché noir** : 2 × 2.
- **Prison régionale** : 3 × 3.
- **Port sombre** : 3 × 3, doit chevaucher un terrain de quai et ne peut pas être placé sur une route ou dans l'eau.
- **Dépôt d'armes** : 2 × 2.
- **Décor neutre** : bosquet 1 × 1, place 1 × 1, point de contrôle 1 × 2.
- **Terrain 14 × 14** : routes, parcelles, béton, asphalte, terrain vert, eau, quais.
- Placement aimanté à la grille, emprises visibles, refus des collisions et placements interdits, zoom/pan, aperçu sans grille, sauvegarde locale, export/import JSON, annuler/refaire.

Les quatre lieux PvE utilisent pour le moment des sprites **de démonstration spécifiques à la world map**, fabriqués pour cette phase technique. Ils seront remplacés par des sprites artistiques définitifs après validation de la grille, des socles, des échelles et de la disposition.

## Installation sur GitHub et Vercel

1. Décompresser le ZIP.
2. Dans le dépôt GitHub, remplacer **uniquement** le dossier `public/modular-zone-01/` avec le contenu du ZIP. Supprimer les anciens fichiers de ce dossier qui n'existent plus dans le ZIP si besoin.
3. Ne pas remplacer `App.tsx`, `WorldMap.tsx`, `src/index.css` ou des fichiers Supabase.
4. Commit/Push sur une branche de test et attendre le statut **Ready** de Vercel.
5. Ouvrir `https://VOTRE-DOMAINE/modular-zone-01/index.html` ou le bouton existant « Tester la zone modulaire » dans l'interface administrateur.
6. Au chargement : deux villes, marché noir, prison, dépôt d'armes et port sombre doivent apparaître. Les boutons « Ajouter » placent un élément disponible. Le mode **Déplacer** fait glisser les objets sur leur empreinte.

## IMPORTANT : aucune connexion aux vrais joueurs

Le prototype n'effectue aucun appel à Supabase. Il ne change pas les positions des villes réelles, les comptes, les missions PvE ni les combats PvP. Son accès par URL statique directe n'est **pas protégé par une authentification** ; n'y mettre aucune donnée confidentielle.

Les réglages du laboratoire sont conservés uniquement dans le navigateur (`localStorage`, clé `crime-empire-world-map-v06-lab`). La V05 garde sa sauvegarde dans une autre clé, elle ne sera pas écrasée. Pour transporter un plan d'un navigateur à l'autre, utiliser **Export JSON / Import JSON**.

## Étape de passage en world map réelle

Il faudra connecter ce prototype au moteur de la vraie world map, convertir les positions de grille en coordonnées de région, charger les villes réelles depuis Supabase et valider **côté serveur** les déplacements et collisions avant de les publier. Aucun de ces changements n'est fait dans cette V06. On gardera les missions PvE existantes et leurs points cliquables pendant une migration progressive.

## Tests à faire

- Vérifier que le Port sombre refuse un déplacement loin des quais.
- Vérifier qu'une ville refuse les routes, l'eau et une case occupée.
- Déplacer une ville de 2×2, recharger : elle doit rester en place.
- Vérifier le zoom/pan sur PC et téléphone.
- Exporter/importer le plan JSON pour confirmer que les empreintes sont conservées.
