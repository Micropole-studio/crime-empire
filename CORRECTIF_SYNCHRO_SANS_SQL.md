# Crime Empire — correctif éditeur / synchronisation (diagnostic)

## Ce qui change

- Plus aucune publication automatique au chargement de l'éditeur : les erreurs de lecture Supabase ne sont plus confondues avec une absence de positions.
- Les placements locaux sont conservés lorsque la lecture RPC échoue. Dans ce cas, la publication est verrouillée jusqu'à résolution du problème et rechargement de la page.
- Le bouton « Publier » est la seule opération de sauvegarde distante dans l'éditeur, et n'envoie qu'**une seule** requête RPC pour les sept bâtiments. La sauvegarde locale continue lors du déplacement.
- Les messages RPC affichent désormais `code`, `message`, `details`, `hint` dans la console et dans l'éditeur.
- Hélicoptère retiré uniquement de la ville et de l'éditeur (la fonctionnalité et les données de la world map ne sont pas effacées). Le HUD conserve l'accès au Monde.
- Molette de zoom : écouteur navigateur non-passif pour éviter l'avertissement React/Chrome `Unable to preventDefault inside passive event listener invocation`.

## Installation

1. Copier les quatre fichiers du patch dans les mêmes chemins de ton projet courant, sur une branche de test.
2. Lancer `npm install` si nécessaire, `npm run build` et `npm run dev`.
3. Connecte-toi avec le compte admin, ouvre l'éditeur, vérifie qu'il charge tes placements.
4. En cas d'erreur rouge, **ne clique pas sur Réinitialiser** : copie le code d'erreur complet affiché.
5. Vérifier que les déplacements en local fonctionnent, puis seulement lorsque la lecture est revenue, cliquer sur « Publier le modèle ».

## Ce que ce correctif ne résout pas à lui seul

Si la fonction SQL `get_city_building_placements` ou `save_city_building_placements` est cassée ou indisponible côté Supabase, aucune modification du frontend ne peut la réparer. Exécuter `DIAGNOSTIC_SUPABASE_POSITIONS_LECTURE_SEULE.sql` dans le SQL Editor et communiquer les résultats. L'ancienne migration `20261002_city_layout_backfill_fix.sql` référence `jsonb_object_length`, qui doit être vérifié dans l'installation réelle.

**Aucune requête SQL d'écriture incluse.** Aucun compte, aucune donnée Supabase, aucune politique RLS modifiés. Le diagnostic réseau (`ERR_NETWORK_IO_SUSPENDED`) peut également venir de la suspension des requêtes par le navigateur ; il ne prouve pas à lui seul un problème RLS.
