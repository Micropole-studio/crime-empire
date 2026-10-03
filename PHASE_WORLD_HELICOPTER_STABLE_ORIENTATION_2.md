# Crime Empire — Hélicoptère World Map — orientation stable 2

## Correctif
Le sprite hélicoptère est une vue 3/4 et ne peut pas être tourné librement comme un sprite strictement top-down sans paraître couché.

Cette version :
- remplace les rotations complètes par un miroir horizontal gauche/droite ;
- limite l'inclinaison visuelle à ±10° ;
- supprime la rotation parasite de l'animation de flottement ;
- conserve un léger mouvement vertical pour donner de la vie au vol ;
- fonctionne à l'aller comme au retour.

## Validation
- TypeScript `tsc -b` : OK.
- ESLint `WorldMap.tsx` : OK.
