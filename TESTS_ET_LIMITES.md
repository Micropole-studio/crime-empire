# Crime Empire V16 — Vérifications et limites

## Contrôles effectués ici

- Présence et décodage des dix WebP du ZIP V16.
- Vérification du sélecteur `world-expanse-base` et des `data-world-node-id` utilisés dans le composant `WorldMap.tsx` V08 connu.
- Deux modifications dans le composant : import de CSS et ajout de classe au calque de caméra ; **aucun changement aux services Supabase, noeuds, combats ou opérations**.
- Rendu de la feuille de style avec une structure DOM de démonstration dans Chromium, 14 villes simulées et quatre hotspots PvE ; les images de terrain et de structures se chargent correctement.

## Pas encore testés / ne pas présumer

- Aucun build complet du dépôt actuel de Crime Empire n'a été exécuté : seul le dépôt Bouticelle est visible via la connexion GitHub.
- Les interactions réelles PvE/PvP, l'échelle exacte à l'écran et les performances mobile doivent être testées sur le déploiement Vercel d'aperçu.
- Les modifications faites dans l'éditeur/laboratoire V16 ne sont pas automatiquement partagées avec la région live.

Le projet conserve les mêmes identifiants de villes, de joueurs et de POI. Le changement est **graphique uniquement** et entièrement réversible.
