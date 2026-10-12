# Crime Empire — Ville globale et affichage contrôlé par l'administrateur

## Pourquoi les anciens comptes avaient un autre placement ?
La migration historique semait une copie de `city_map_layout_template` dans `city_map_layouts` à la création d'un compte. Les joueurs existants conservaient donc une ancienne copie. En outre, le choix du rendu (classique/Premium, PixiJS/DOM) était stocké dans le navigateur de chacun.

## Nouvelle logique
- Admin : il déplace les bâtiments dans **Éditeur de ville**, puis clique sur **Publier le modèle**. Cette action utilise l'enregistrement Supabase déjà fonctionnel et met à jour `city_map_layout_template`.
- Joueurs : à **chaque ouverture**, `get_city_building_placements(text)` renvoie la disposition globale publiée, même si leur compte existait avant. Les anciennes lignes `city_map_layouts` ne sont ni écrasées ni effacées. Niveaux, ressources et progression restent individuels.
- Rendu : `get_city_visual_settings()` renvoie la configuration globale. Le choix local ancien est ignoré.
- Admin seulement : sous la ville, il peut prévisualiser Premium/classique et PixiJS/DOM, puis cliquer **Publier pour tous**. Cela appelle `save_city_visual_settings(jsonb)` et le serveur vérifie `current_player_is_admin()`.
- Joueurs : aucun bouton de comparaison ; le rendu publié est appliqué, avec secours automatique du DOM si WebGL est indisponible.
- Mer : le canvas 2D déjà fonctionnel est conservé dans les deux rendus Premium.

## Installation — ordre obligatoire

1. Faire une sauvegarde de la base et une branche de test du projet.
2. Dans **Supabase SQL Editor**, ouvrir `supabase/migrations/20261012_global_city_presentation.sql` ; coller **le SQL, pas ce document**, et cliquer **Run**. Il ajoute une table de réglages et deux RPC sécurisées et remplace seulement le comportement de lecture de `get_city_building_placements(text)`. Il ne modifie aucune disposition sauvegardée.
3. Décompresser le patch **à la racine du projet** (le dossier qui contient `package.json`).
4. Exécuter `npm install` si nécessaire, puis `npm run build` et `npm run dev`, sur une branche de staging.
5. Ouvrir la ville **admin**, entrer dans **Éditeur de ville**, vérifier les placements, puis **Publier le modèle** pour confirmer le modèle officiel présent dans Supabase.
6. Dans la ville admin, vérifier les deux réglages Premium et PixiJS et cliquer sur **Publier pour tous** si tu changes un réglage (l'initialisation est déjà Premium + PixiJS).
7. Ouvrir un **compte joueur ancien**, puis un **compte joueur nouveau**. Les bâtiments doivent être au même emplacement, tout en ayant leurs niveaux et leurs ressources propres. Les options de rendu sont absentes pour ces comptes.
8. Vérifier après rafraîchissement, sur PC et mobile. Vérifier l'animation de l'eau.

## Contrôle SQL en lecture seule

```sql
select template_key, updated_at,
       placements ? 'villa' as has_villa,
       placements ? 'workshop' as has_garage,
       placements ? 'laboratory' as has_laboratoire
from public.city_map_layout_template
where template_key = 'default';

select setting_key, settings, updated_at
from public.city_visual_settings
where setting_key = 'default';
```

## Notes et limites
- Les comptes connectés avant une nouvelle publication doivent **recharger la ville** ou revenir sur l'onglet pour récupérer les derniers choix graphiques ; il n'y a pas encore de souscription temps réel.
- La position commune est déterminée à la lecture et non par une réécriture de toutes les anciennes lignes `city_map_layouts` : cela protège les anciens enregistrements et rend les modifications réversibles.
- Le SQL peut être rejoué ; le paramétrage existant n'est pas écrasé grâce à `ON CONFLICT ... DO NOTHING`.
- **Ne pas relancer** l'ancien script `20261002_city_layout_backfill_fix.sql` après ce correctif : il redéfinirait à nouveau l'ancienne RPC et annulerait le modèle global.
- Le SQL est conçu pour la base actuelle utilisant `get_city_building_placements(text)`, après résolution de PGRST203. Il ne supprime ni ne recrée de signature UUID.
