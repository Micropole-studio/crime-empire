# Crime Empire — Zone Modulaire 02

## Ce que change cette version

La Zone Modulaire 01 reste une page **statique indépendante** du jeu. La V02 ajoute :

- Sélection et déplacement de la Villa et du dépôt PvE sur la carte (souris et tactile).
- Aimantation des bâtiments sur les cases, désactivable ; les coordonnées peuvent alors être fractionnaires.
- Déplacement de précision (flèches de l'éditeur et clavier).
- Taille, inclinaison **visuelle 2D** et ordre de dessin (profondeur) réglables.
- Peinture des tuiles asphalte, béton, route, eau, parcelle et terrain.
- Zoom, déplacement de caméra, grille optionnelle, pinch-to-zoom.
- Sauvegarde automatique **dans le navigateur** via localStorage, export et import JSON.

**Important :** rien n'est envoyé à Supabase. Il s'agit de coordonnées de laboratoire, pas des villes réelles des joueurs. Le bouton d'accès se trouve dans l'interface administrateur existante, mais l'URL statique du laboratoire n'est pas une page protégée côté serveur : quiconque connaît l'URL peut consulter le laboratoire de démonstration. Il ne donne aucun accès aux données du jeu.

## Installation via GitHub et Vercel (sans environnement local)

1. Créer une branche de test GitHub si possible.
2. Ouvrir le dépôt dans l'éditeur web GitHub en appuyant sur `.`.
3. Remplacer **uniquement** le contenu du dossier `public/modular-zone-01/` par les fichiers de l'archive :
   - `index.html`
   - `lab.js`
   - `styles.css`
   - `assets/` (six textures déjà utilisées dans la V01).
4. Ne **pas** remplacer `src/App.tsx`, `src/components/world/WorldMap.tsx` ou `src/components/world/ModularZoneLab.tsx`.
5. Effectuer le commit et vérifier le build Vercel.
6. Tester sur `https://<ton-domaine>/modular-zone-01/index.html` ou cliquer sur le bouton du laboratoire depuis le compte admin.

Après un nouveau déploiement Vercel, forcer une fois le rechargement du navigateur (`Ctrl+F5`) si l'ancienne interface est toujours en cache.

## Test de validation

1. Ouvrir la page V02 et vérifier l'indicateur `Zone Modulaire 02 active`.
2. Sélectionner l'outil `Déplacer bâtiments`.
3. Cliquer sur la Villa, la faire glisser vers une parcelle voisine, puis relâcher : le bâtiment doit rester sur la case.
4. Régler la largeur à 450 px, changer l'inclinaison, puis utiliser les flèches de déplacement.
5. Choisir `Route`, peindre plusieurs cases et masquer/afficher la grille.
6. Actualiser la page : la Villa et le sol modifié doivent conserver leurs positions dans **ce navigateur**.
7. Utiliser `Exporter JSON` pour conserver un exemplaire partageable, puis `Importer JSON` pour restaurer une configuration.
8. Tester également sur téléphone : déplacement au doigt, pincement pour zoomer, manipulation depuis le panneau d'éditeur.

## Revenir à la V01

Restaurer les fichiers du dossier `public/modular-zone-01/` à partir du commit précédent. Les autres composants de Crime Empire ne sont pas concernés.

## Limites volontaires

- L'inclinaison fait pivoter une image 2D. Pour obtenir une rotation isométrique réaliste, il faudra plusieurs vues du bâtiment ou un vrai modèle 3D.
- Les dalles et chemins restent des textures provisoires, non le rendu artistique final.
- Les bâtiments se déplacent uniquement dans le laboratoire ; la world map réelle et les coordonnées Supabase ne changent pas.
- L'export JSON est un plan de test ; il n'est pas automatiquement importé dans le gameplay.

## Vérifications faites lors de la préparation

- `node --check` sur `lab.js`.
- Simulation JS des gestes de sélection, glisser-déposer, changement de taille, peinture et sauvegarde locale.
- Présence des images WebP et contrôle d'intégrité de l'archive.
- Le navigateur de test de l'environnement de préparation bloque l'ouverture des pages locales ; rendu réel et déploiement Vercel à confirmer chez toi.
