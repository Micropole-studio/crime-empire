# Crime Empire — World Map PvE Phase 2

## Boucle jouable ajoutée

1. Ouvrir la World Map depuis la ville.
2. Sélectionner un territoire PvE disponible.
3. Composer l'escouade avec les vraies troupes de `city_troops`.
4. Choisir ou non `Donner l'ordre d'assaut automatiquement à l'arrivée`.
5. Lancer l'opération : les troupes engagées sont retirées de la garnison pendant l'expédition.
6. À l'arrivée :
   - auto activé -> assaut PvE résolu immédiatement ;
   - auto désactivé -> l'escouade attend le clic `Donner l'ordre d'assaut`.
7. Le moteur résout victoire/défaite, pertes, survivants, butin et XP commandant.
8. La cible passe en cooldown selon sa configuration.
9. Les survivants reviennent en ville après le trajet retour.
10. Au retour, les survivants réintègrent `city_troops`, les récompenses sont créditées et le rapport final peut être fermé.

## Combat PvE

Le calcul utilise la puissance de l'escouade déjà construite en Phase 1, avec une petite variance déterministe par opération. Les pertes dépendent du rapport de puissance réel au moment de la résolution.

- Victoire nette : pertes généralement faibles.
- Combat serré : pertes plus importantes.
- Défaite : pertes sévères possibles.
- Une défaite donne uniquement une petite part de l'XP commandant prévue, sans ressources de butin.

## Rappel

Une escouade peut être rappelée avant la résolution du combat. Elle ne se téléporte plus : elle effectue un trajet retour, puis tous les hommes rappelés rejoignent la garnison.

## Préparation PvP déjà prévue dans l'architecture

Les opérations stockent maintenant :

- `targetType`
- `autoAssault`
- `assaultPreparationSeconds`
- `assaultOrderedAt`
- `assaultResolvesAt`
- les différentes phases d'opération

Pour une future cible `player_city`, le code prévoit actuellement `120` secondes de préparation d'assaut. En PvP, l'assaut automatique lancera cette phase automatiquement à l'arrivée, mais ne supprimera pas le délai de réaction du défenseur.

## Persistance actuelle

L'opération active et les cooldowns World Map sont persistés dans `localStorage`, tandis que les troupes, ressources et XP sont appliqués à Supabase.

Pour une vraie mise en production multijoueur/PvP, la résolution et le règlement du combat devront ensuite être déplacés dans une fonction SQL/RPC atomique côté serveur pour empêcher toute triche client et garantir l'idempotence des récompenses.

## Contrôles effectués

- TypeScript (`tsc -b`) : OK.
- ESLint sur tous les fichiers World Map / combat / services modifiés de cette phase : OK, zéro erreur / zéro warning. `App.tsx` conserve ses anciennes alertes ESLint déjà présentes (`any` et appel de `loadGame()` dans un effect) ; le seul changement de cette phase dans ce fichier est le passage des nouvelles props à `WorldMap`.
- Build Vite complet non exécutable dans l'environnement Linux de travail car le `node_modules` fourni dans le ZIP provient de Windows et ne contient pas le binding natif Linux `@rolldown/binding-linux-x64-gnu`. Ce problème est lié aux dépendances embarquées, pas à une erreur TypeScript de la phase.

## Prochaine phase proposée

Direction artistique / images : remplacer progressivement les emojis et marqueurs génériques par des visuels Crime Empire cohérents pour les territoires, unités, rapports de combat et éventuellement la World Map elle-même.
