# Crime Empire — Player Auth MVP 1

Cette phase transforme le prototype mono-joueur de test en première base de jeu réellement multi-comptes.

## Ce qui est actif

- écran Connexion / Inscription ;
- Supabase Auth (e-mail + mot de passe) ;
- session persistante ;
- pseudo demandé à l'inscription ;
- création automatique d'une partie lors de la première connexion ;
- chaque utilisateur possède son propre `player` et sa propre `city` ;
- une ville existante ayant le même e-mail peut être reliée à Supabase Auth sans être recréée ;
- `test@test.com` est marqué administrateur DEV par la migration fournie ;
- l'Éditeur de ville n'est visible que pour un joueur `is_admin = true` ;
- bouton Déconnexion PC et mobile pour tester plusieurs comptes ;
- les caches locaux de positions de bâtiments et d'hélicoptère sont maintenant séparés par `cityId`.

## Nouvelle partie créée automatiquement

Pour un vrai nouveau joueur, `bootstrap_current_player()` crée :

- 1 ligne `players` liée à `auth.users` ;
- 1 ville ;
- Villa niveau 1 ;
- Planque niveau 1 ;
- Garage niveau 1 ;
- Sécurité niveau 0 ;
- Syndicat niveau 0 ;
- Laboratoire niveau 0 ;
- Usine niveau 0 ;
- compétences du Commandant initialisées ;
- 5 Hommes de main I pour faciliter les premiers tests MVP.

Les ressources de départ continuent volontairement d'utiliser les valeurs par défaut déjà définies dans la table `cities`. On pourra régler la vraie économie de départ dans une phase onboarding/tutoriel.

## Étape OBLIGATOIRE dans Supabase

Avant de déployer le nouveau front :

1. Ouvrir Supabase > SQL Editor.
2. Sauvegarder la base si tu veux un point de retour.
3. Copier/exécuter entièrement :

`supabase/migrations/20261002_player_auth_mvp.sql`

Cette migration :

- ajoute `auth_user_id`, `is_admin`, `last_seen_at` à `players` ;
- crée `bootstrap_current_player()` ;
- relie automatiquement un ancien profil ayant le même e-mail ;
- active des premières règles RLS sur les principales tables joueur.

## Premier test conseillé

### A. Tester un vrai nouveau joueur

1. Déployer/pousser le front après la migration SQL.
2. Ouvrir le site en navigation privée.
3. Cliquer `Inscription`.
4. Entrer pseudo + e-mail + mot de passe (8 caractères minimum).
5. Si la confirmation e-mail Supabase est activée, cliquer le lien reçu puis se connecter.
6. Vérifier qu'une nouvelle ville apparaît et qu'elle ne contient pas les données de la ville DEV.
7. Se déconnecter puis se reconnecter : la même ville doit revenir.

### B. Récupérer la ville DEV actuelle

Le script marque actuellement `test@test.com` comme administrateur.

Pour conserver cette ville : créer/se connecter dans Supabase Auth avec **exactement le même e-mail**. À la première connexion, `bootstrap_current_player()` cherche l'ancien `players.email`, lui ajoute `auth_user_id`, puis conserve sa ville et ses données.

## Supabase Auth

Dans Supabase > Authentication > Providers, le provider Email doit être actif.

Pour une bêta fermée avec seulement quelques amis, deux possibilités :

- garder la confirmation e-mail : plus propre ;
- la désactiver temporairement pour accélérer les créations de comptes de test.

L'interface gère les deux cas.

## Sécurité / MVP

La migration ajoute un premier cloisonnement RLS aux tables directement utilisées par le client (`players`, `cities`, `buildings`, troupes, recherches, inventaire, missions...).

Avant une bêta publique, il faudra encore auditer les anciennes fonctions SQL/RPC du projet (`sync_city_economy`, accélérateurs, missions, placements, etc.) afin de vérifier qu'elles valident elles-mêmes l'appartenance du `city_id` au joueur authentifié lorsqu'elles sont `SECURITY DEFINER`.

Pour une bêta fermée à 2–3 amis, cette phase fournit la fondation nécessaire sans prétendre que l'ensemble du backend est déjà durci pour un lancement public.

## Étape suivante logique

Une fois deux comptes réels créés et stables :

1. table de positions World Map des joueurs ;
2. attribution automatique d'un emplacement ;
3. rendu des villes/châteaux des autres joueurs ;
4. fiche joueur au clic ;
5. reconnaissance / attaque PvP ;
6. notifications d'attaque et délai de préparation.
