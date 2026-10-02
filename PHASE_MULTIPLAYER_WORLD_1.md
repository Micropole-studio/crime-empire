# Crime Empire — Multiplayer World 1

Cette phase transforme la World Map en première vraie carte multijoueur persistante.

## Ce qui est actif

- Région 1 : surface logique de 6000 × 4500 unités.
- Environ 120 emplacements joueurs disponibles autour du secteur central.
- La carte illustrée actuelle devient le secteur central Port Sombre / PvE.
- Chaque ville joueur reçoit une position persistante dans Supabase.
- Les nouveaux comptes reçoivent automatiquement un emplacement à la création de leur ville.
- Les comptes déjà existants sont positionnés lors de la migration.
- La caméra s'ouvre sur la ville du joueur connecté.
- Le bouton de recentrage revient sur sa ville.
- Toutes les villes de Région 1 sont visibles sur la World Map.
- Sprite de ville évolutif selon le niveau de la Villa.
- Clic sur une ville : pseudo, niveau, puissance estimée, distance, temps de trajet et protection.
- Protection de départ : 24 heures pour une nouvelle position.
- Rafraîchissement léger de la liste des empires toutes les 20 secondes.
- Préparation PvP : possibilité de composer une escouade et comparer sa puissance à celle du défenseur.
- Le lancement réel PvP est volontairement verrouillé tant que le combat/pillage serveur transactionnel n'est pas en place.

## Migration Supabase obligatoire

Exécuter après les deux migrations précédentes :

`supabase/migrations/20261002_multiplayer_world_1.sql`

Elle crée notamment :

- `world_spawn_slots`
- `world_player_positions`
- `ensure_current_world_position()`
- `get_world_player_cities()`
- le trigger d'attribution automatique d'une position lors de la création d'une nouvelle ville.

Aucun e-mail n'est exposé aux autres joueurs : le RPC World Map ne renvoie que les données publiques utiles au jeu.

## Parcours de test conseillé

1. Exécuter la migration SQL.
2. Déployer le front.
3. Se connecter avec `test@test.com`.
4. Ouvrir la Carte du monde : la caméra doit se centrer sur votre nouvelle position World Map.
5. Vérifier que votre ville affiche `VOUS`.
6. Se connecter avec un deuxième compte déjà créé ou en créer un nouveau.
7. Ouvrir sa World Map : ce compte doit avoir une autre position.
8. Revenir au compte DEV et retrouver la ville du second joueur sur la même Région 1.
9. Cliquer sur cette ville : la fiche doit afficher pseudo, puissance, distance et temps de trajet.
10. Cliquer sur `Préparer une attaque` : l'écran militaire est utilisable en mode aperçu PvP, mais le lancement est verrouillé.

## Pourquoi le PvP réel reste verrouillé dans cette phase

Le PvE peut être résolu côté client car il n'affecte que le joueur courant. Un PvP réel modifie deux comptes : défense, pertes, pillage, protection, notifications et simultanéité. La prochaine phase doit donc déplacer cette résolution côté serveur/Supabase dans une transaction afin d'éviter :

- double pillage ;
- duplication de ressources ;
- attaque d'une garnison déjà engagée ;
- deux combats résolus avec des états différents ;
- modification frauduleuse de la puissance depuis le navigateur.

## Prochaine phase recommandée

`PvP Combat Server 1`

- table des attaques PvP ;
- réservation serveur de l'escouade ;
- trajet persistant ;
- notification du défenseur ;
- phase d'assaut 120 secondes ;
- défense/garnison verrouillée au moment de la résolution ;
- moteur de combat serveur ;
- pertes des deux côtés ;
- pillage plafonné ;
- retour des survivants ;
- rapports de combat attaquant/défenseur ;
- protection anti-spam / cooldown après attaque.
