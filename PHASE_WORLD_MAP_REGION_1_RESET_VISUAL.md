# Crime Empire — World Map Région 1 — Reset visuel

## Objectif
Abandonner complètement le rendu “image sur image” et passer à une vraie base de jeu modulaire.

## Ce qui change
- fond **neutre béton/asphalte** sur toute la Région 1 ;
- routes principales lisibles ;
- emplacements joueurs visibles sous forme de **slots** ;
- POI PvE intégrés comme pads indépendants directement sur le terrain ;
- suppression du gros bloc central illustré.

## Philosophie
Le fond sert uniquement de **terrain de jeu**. Les villes joueurs et les lieux PvE sont maintenant des objets séparés posés sur un support cohérent, comme dans les jeux de stratégie mobile, sauf que l'univers est urbain/portuaire au lieu d'être vert/herbeux.

## SQL
Pas de nouvelle migration obligatoire pour ce reset visuel.
Conserver les migrations multijoueur et le correctif de template de ville déjà fournis.
