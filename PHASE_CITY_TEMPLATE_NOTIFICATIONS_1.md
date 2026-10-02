# Crime Empire — City Template + Notifications 1.0

## 1. À exécuter dans Supabase

Après la migration `20261002_player_auth_mvp.sql`, exécuter une fois :

`supabase/migrations/20261002_city_layout_notifications.sql`

Cette migration crée :

- `city_map_layout_template` : modèle officiel de départ des nouvelles villes ;
- `city_map_layouts` : disposition propre à chaque ville ;
- les RPC `get_city_building_placements` et `save_city_building_placements` ;
- un trigger qui copie le modèle vers chaque future ville ;
- `game_notifications` : historique persistant des notifications joueur.

## 2. Ville DEV / modèle nouveaux joueurs

Le compte admin conserve sa disposition locale historique tant qu'aucune disposition distante n'existe.

Ouvrir **Éditeur de ville** sur le compte admin, placer les bâtiments + l'hélicoptère puis utiliser **Publier le modèle** (les modifications sont aussi synchronisées automatiquement après un court délai).

Chaque sauvegarde admin devient le modèle de départ des futures villes.

Les joueurs déjà créés gardent leur disposition indépendante.

## 3. World Map

Le gros statut d'opération permanent est remplacé par un petit bouton circulaire en bas à droite. Le détail complet ne s'ouvre qu'au clic.

## 4. Notifications

Une cloche 🔔 avec compteur apparaît dans le jeu.

Déjà branché :

- escouade envoyée ;
- arrivée sur zone / ordre requis ;
- victoire / défaite ;
- rappel ;
- retour et butin sécurisé ;
- lancement d'une construction.

Le service est générique pour ajouter ensuite recherches, recrutements, missions, PvP et attaques entrantes.

## Test conseillé

1. Exécuter la nouvelle migration SQL.
2. Se connecter avec `test@test.com` (admin).
3. Ouvrir l'éditeur et replacer la ville exactement comme souhaité.
4. Vérifier l'indication **Modèle officiel des nouvelles villes**.
5. Publier / revenir au jeu / recharger : les positions doivent rester identiques.
6. Créer ensuite un nouveau compte : sa ville doit utiliser le modèle admin.
7. Lancer une opération PvE : vérifier le petit bouton circulaire et les notifications dans la cloche.
