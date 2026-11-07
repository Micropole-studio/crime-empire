# Crime Empire — World Map V16.4 · Chantier clandestin

## À quoi sert cette mise à jour
Le **Chantier clandestin (PvE, niveau 2)** apparaît dans l’éditeur V16 avec un visuel dédié. Il peut être sélectionné, déplacé, redimensionné et publié comme les autres lieux PvE. Après publication, le monde normal utilise le **même sprite et les mêmes coordonnées**, tout en conservant les récompenses matériaux, les combats et les coordonnées des villes Supabase.

Identifiant gameplay réel : `illegal-construction-site`. La mission et ses récompenses **ne sont pas recréées**.

## Installation

1. Fais un commit de sauvegarde sur GitHub avant modification.
2. Ajoute/remplace les fichiers fournis dans `public/` et `src/` **exactement aux mêmes chemins** de ton projet.
   - `public/modular-zone-01/world.js`, `public/modular-zone-01/index.html`, le nouveau `assets/chantier-clandestin.webp`
   - `public/world/v16/chantier-clandestin.webp`
   - `public/world/locations/construction-site-cover.webp` (visuel du panneau de mission)
   - `src/services/worldVisualSceneService.ts`
   - `src/components/world/ModularZoneLab.tsx`
   - `src/components/world/WorldV16PublishedArtwork.tsx` et son CSS
   - `src/components/world/WorldV16PlacementSafety.ts`
3. Dans **Supabase > SQL Editor**, exécute `supabase/migrations/20261107_world_visual_scene_chantier_v164.sql`. Indispensable : la fonction V16.1 refuse le nouveau type tant que sa liste blanche SQL n'est pas mise à jour.
4. Commit & Push ; vérifie `Ready` dans Vercel.
5. Avec l'admin, ouvre `Monde > Tester la zone modulaire`. Le Chantier clandestin doit être visible directement. Si tu avais déjà un brouillon V16, il est conservé, et le chantier y est ajouté une fois automatiquement.
6. Sélectionne le chantier, déplace-le si nécessaire. Clique **« Publier la région »** ; vérifie le message `Région 1 publiée · révision N`. Recharge ensuite `Monde` normal.
7. Vérifie en cliquant sur le Chantier clandestin : **Niveau 2**, description, matériaux, mission PvE et panneau opération.

## Points importants
- **Ne remplace pas `WorldMap.tsx`** : la V16.3 l'utilise déjà et aucun import supplémentaire n'est nécessaire.
- Le SQL n'affecte aucune position joueur, aucun compte et aucun combat.
- Supprimer volontairement le chantier dans l'éditeur le retire du visuel publié, mais **pas** de la définition gameplay du territoire.
- La sauvegarde existante V16 du navigateur est préservée, ainsi que ses routes et positions. Le brouillon V16 initial est migré automatiquement, sans toucher à la région publique tant que tu ne cliques pas sur Publier.
- Teste sur une branche Vercel Preview avant de passer sur la branche de production.

## Retour arrière
Restaure les fichiers de ton commit précédent et republie la scène précédente. La migration SQL n'a pas besoin d'être annulée : elle ajoute seulement une autorisation de type et de sprite à la RPC de publication.
