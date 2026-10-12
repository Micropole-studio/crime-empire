# Crime Empire — HUD Premium et accès éditeur admin

## Modifications livrées

- `src/components/game/GameHud.tsx` : HUD premium (nom du jeu, niveau du commandant, XP, quatre ressources réelles et raccourcis).
- `src/components/game/PremiumHud.css` : styles responsive PC/mobile.
- `src/components/game/PremiumGameDock.tsx` : barre de navigation « Ville / Monde / Troupes / Inventaire / Commandant / Recherches / Missions » ; bouton « Éditeur » seulement pour un administrateur.
- `src/App.tsx` : connexion du HUD aux actions existantes ; l'accès éditeur n'est plus caché à moins de 1 024 px.
- `src/components/map/MapEditor.tsx` : aperçu des placements sur le vrai terrain luxe et avec les nouveaux bâtiments luxe.

Aucune migration SQL ni modification de Supabase n'est incluse dans ce patch. Le rôle admin **n'est pas octroyé côté frontend**.

## Quelle était la cause du bouton disparu ?

Dans la version précédente, le bouton admin avait la classe `hidden ... lg:block` : il était invisible lorsque la fenêtre faisait moins de 1 024 px. De plus, l'accès dépend bien de `data.player.is_admin` chargé depuis `public.players`.

### Si le bouton Éditeur est encore absent

1. Connecte-toi au compte que tu crois administrateur.
2. Depuis Supabase > SQL Editor, exécute `SUPABASE_ADMIN_DIAGNOSTIC_LECTURE_SEULE.sql`.
3. Repère le profil réellement lié au compte Supabase Auth (colonnes `auth_user_id` et `linked_auth_email`).
4. Si `is_admin` vaut `false` ou si le profil est lié au mauvais compte, **n'exécute aucune migration de réinitialisation** : il faut d'abord identifier la bonne ligne. Fournis le résultat en masquant au besoin les e-mails et UUID. On pourra préparer la correction ciblée après vérification.

Ne modifie jamais les politiques RLS ou le déclencheur de protection du compte pour afficher le bouton. Un utilisateur non admin ne peut pas accéder à l'éditeur simplement en ajoutant l'URL ou en manipulant le navigateur.

## Installation recommandée

1. Crée une branche Git de test (`git switch -c feat/hud-premium-admin`).
2. Fais une copie de ton projet actuel ; décompresse le ZIP de patch à sa racine (les fichiers conservent leurs chemins).
3. Sur ton PC : `npm install`, `npm run build`, puis `npm run dev`.
4. Connecte-toi : le HUD Premium doit apparaître dans la ville.
5. Sur mobile / petite fenêtre, le bouton admin apparaît aussi dans le HUD et dans la barre du bas, **si le compte a `is_admin=true`**.
6. Ouvre l'éditeur, place les bâtiments sur le terrain de luxe, puis vérifie les positions après reconnexion.
7. Vérifie aussi la carte du monde, les combats, la construction et les modales : la logique n'a pas été modifiée, mais les tests réels restent indispensables.

## Retour arrière immédiat

Les modifications concernent uniquement des fichiers front-end. Une inversion du commit ou un retour sur la branche de production annule le HUD Premium. Aucune donnée Supabase n'est réinitialisée. Les placements éventuellement enregistrés *pendant l'utilisation de l'éditeur* restent toutefois sauvegardés en base : les annuler nécessite de republier des positions.

## À venir

La monnaie premium « diamant » n'existe pas encore dans la base ; elle n'est donc pas artificiellement ajoutée au HUD. La world map ne fait pas partie de ce patch.

## Niveau de validation

Analyse statique et vérification syntaxique TypeScript/TSX effectuées. Dépendances npm non installées dans cet environnement : ni build complet Vite, ni contrôle réel des interactions en navigateur avec Supabase. À tester en local sur la branche de test avant la production.
