# Crime Empire — World Map PvE Phase 3

Cette phase termine la première boucle économique des combats PvE de la World Map.

## Récompenses : garanti + bonus aléatoire

Une victoire ne dépend plus uniquement d'une fourchette aléatoire. Chaque territoire possède désormais une récompense garantie, à laquelle s'ajoute un bonus aléatoire déterministe pour l'opération.

| Territoire | Récompense garantie | Bonus aléatoire | XP | Butin rare |
| --- | --- | --- | --- | --- |
| Marché noir | 1 000 $ | 0 à 500 $ | 40 | 8 % — Sac de billets (700 à 1 200 $) |
| Chantier clandestin | 500 $ + 30 matériaux | 0 à 300 $ + 0 à 15 matériaux | 65 | 7 % — Caisse de matériaux (20 à 35) |
| Dépôt d'armes | 25 matériaux + 6 équipements | 0 à 10 matériaux + 0 à 4 équipements | 90 | 6 % — Lot d'équipements (4 à 7) |
| Réseau des quartiers | 2 000 $ + 14 Influence | 0 à 1 000 $ + 0 à 10 Influence | 140 | 5 % — Dossiers compromettants (6 à 10 Influence) |

En cas de défaite, aucune ressource n'est gagnée. Le commandant conserve une petite part de l'XP prévue.

## Butins rares

Les drops rares sont tirés au moment de la résolution du combat et restent déterministes pour l'opération. Ils ne peuvent donc pas être reroll en rechargeant la page.

Le drop est transporté avec l'escouade. Au retour, il est ajouté à l'inventaire sous forme de butin ouvrable grâce au système `create_inventory_loot` déjà présent dans le projet.

## Rapport de combat

Le rapport affiche maintenant :

- victoire / défaite ;
- survivants ;
- taux de pertes ;
- récompenses exactes ;
- distinction entre part garantie et bonus tiré ;
- butin rare obtenu ;
- coût de remplacement des unités perdues ;
- bilan net par ressource après remplacement des pertes.

Le bilan du drop rare n'est pas compté avant ouverture de l'objet d'inventaire.

## Finalisation du retour fiabilisée

Le règlement d'une opération est désormais mémorisé étape par étape :

1. retour des survivants dans la garnison ;
2. crédit des ressources ;
3. crédit de l'XP Commandant ;
4. ajout du drop rare éventuel dans l'inventaire.

Si une étape échoue, une nouvelle tentative reprend uniquement les étapes manquantes au lieu de répéter normalement celles déjà enregistrées comme terminées.

## Compatibilité

Les opérations enregistrées avec les Phases 1 ou 2 restent lisibles. Les anciens combats sans coût de remplacement enregistré reçoivent automatiquement un coût nul lors du chargement afin d'éviter de casser le rapport.

## Parcours de test conseillé

1. Lancer une attaque sur le Marché noir avec assaut automatique.
2. Vérifier le rapport après le combat : une victoire doit afficher au minimum 1 000 $ + 40 XP.
3. Attendre le retour complet : le rapport doit passer de « butin en cours de retour » à « butin récupéré » et les ressources doivent être visibles dans la ville.
4. Vérifier que les survivants seulement reviennent dans la garnison.
5. Faire une attaque avec une escouade moins surdimensionnée afin d'obtenir des pertes et vérifier le coût de remplacement / bilan net.
6. Répéter plusieurs combats au fil des cooldowns pour vérifier l'apparition éventuelle des butins rares.

## Contrôles techniques

- TypeScript (`tsc -b`) : OK.
- ESLint sur tous les fichiers modifiés de cette phase : OK.
- Le build Vite complet ne peut toujours pas être exécuté dans l'environnement Linux de travail car le `node_modules` original contient le binding Rolldown Windows et pas `@rolldown/binding-linux-x64-gnu`. Ce point est indépendant du code de la phase.
