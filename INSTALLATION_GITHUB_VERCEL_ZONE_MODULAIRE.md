# CRIME EMPIRE — World Map V3 · Laboratoire modulaire 01 (GitHub/Vercel)

## Objectif et périmètre

Ce patch ajoute un **accès au prototype depuis le jeu**, uniquement quand le profil chargé est administrateur (`data.player.is_admin`).

- Un bouton **« 🧱 Tester la zone modulaire »** apparaît dans la world map pour l'administrateur.
- Il ouvre le laboratoire de tuiles en plein écran, dans l'application React.
- Le bouton **« ← Retour à la world map »** ramène à la carte existante.
- Le prototype est isolé dans une iframe `sandbox="allow-scripts"`, sans session Supabase ni accès au DOM du jeu.
- **Aucune modification** de `WorldMap.tsx`, Supabase, des coordonnées joueurs, des missions ou des migrations SQL.
- La scène de démonstration utilise **Canvas 2D**, pas encore le moteur PixiJS de la world map finale.
- La démonstration **n'enregistre rien**. Tous les changements de tuiles sont temporaires.

### Sécurité

Le bouton et la scène sont conditionnés par `is_admin` dans l'application. Ce n'est **pas** une autorisation serveur pour des données sensibles : aucun accès de base de données n'est offert dans le laboratoire. Les images et chunks JS d'un site public restent techniquement téléchargeables, comme les autres assets Vite.

## Installation depuis GitHub (sans travail local)

1. Dans GitHub, ouvre ton dépôt, puis appuie sur la touche **.** pour ouvrir **github.dev** (éditeur Web de GitHub).
2. Fais une branche de travail, par exemple `feature/world-modular-lab-01`, si tu ne veux pas toucher directement à la production.
3. Dans l'explorateur de fichiers, remplace `src/App.tsx` **uniquement si ton App actuel correspond encore au format de notre base récente**. Si tu l'as modifié depuis, intègre plutôt les petits ajouts (import, mode, bouton et rendu) au fichier existant, sans le remplacer.
4. Ajoute `src/components/world/ModularZoneLab.tsx`.
5. Ajoute le dossier `src/modular-zone-01/` complet avec son `index.html` et les **six** fichiers `assets/*.webp`.
6. Commit/push les modifications depuis github.dev. Vercel doit effectuer automatiquement un nouveau build si le dépôt est relié.
7. Ouvre Crime Empire, connecte-toi sur ton **compte administrateur**, puis **Carte du monde → 🧱 Tester la zone modulaire**.
8. Essaye la grille, l'outil de peinture, la caméra, puis **← Retour à la world map**.

Aucun chemin `/modular-zone-01/` n'est nécessaire avec ce patch : le labo est directement intégré à React. Si tu as déposé l'ancien prototype dans `public/modular-zone-01/`, tu peux le laisser (il ne gêne pas) ou le retirer ultérieurement.

### Si Vercel affiche un build échoué

Ne modifie pas Supabase. Copie la **première** erreur TS ou Vite des Build Logs.
Le patch a été construit et contrôlé à partir de notre dernière archive de référence, qui peut être différente de l'état exact de ton dépôt GitHub.

### Étape suivante

Tester cette maquette isolée. Ensuite, préparer un véritable renderer PixiJS modulaire en parallèle de la carte actuelle. Ne pas remplacer `WorldMap.tsx` avant d'avoir vérifié les interactions PvE et le chargement sur mobile.
