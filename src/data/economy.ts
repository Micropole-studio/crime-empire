import type {
  BuildingType,
} from "../types/building"

export type BuildingProduction = {
  moneyPerHour: number
  materialsPerHour: number
  influencePerHour: number
  equipmentPerHour: number
}

/*
 * Crée une progression linéaire :
 *
 * Exemple avec 5 par heure :
 * niveau 1 → 5
 * niveau 2 → 10
 * niveau 3 → 15
 */
function createLinearProduction(
  production: Partial<BuildingProduction>,
  maxLevel = 10
) {
  const levels: Record<
    number,
    BuildingProduction
  > = {}

  for (
    let level = 1;
    level <= maxLevel;
    level += 1
  ) {
    levels[level] = {
      moneyPerHour:
        (production.moneyPerHour ?? 0) *
        level,

      materialsPerHour:
        (production.materialsPerHour ??
          0) * level,

      influencePerHour:
        (production.influencePerHour ??
          0) * level,

      equipmentPerHour:
        (production.equipmentPerHour ??
          0) * level,
    }
  }

  return levels
}

function createEmptyProduction(
  maxLevel = 10
) {
  return createLinearProduction(
    {},
    maxLevel
  )
}

export const BUILDING_PRODUCTION: Record<
  BuildingType,
  Record<number, BuildingProduction>
> = {
  /*
   * La Villa produit actuellement
   * 5 000 d'argent par heure et par niveau.
   */
  villa: createLinearProduction({
    moneyPerHour: 5000,
  }),

  /*
   * Le Garage produit actuellement
   * 10 matériaux par heure et par niveau.
   */
  workshop: createLinearProduction({
    materialsPerHour: 10,
  }),

  /*
   * La Planque gère le stockage
   * et la protection des ressources.
   */
  hideout: createEmptyProduction(),

  /*
   * La Sécurité gère les troupes.
   */
  wall: createEmptyProduction(),

  /*
   * Le Laboratoire gère les recherches.
   */
  laboratory: createEmptyProduction(),

  /*
   * Production exacte du Syndicat,
   * identique à progression.ts.
   */
  syndicate: {
    1: {
      moneyPerHour: 0,
      materialsPerHour: 0,
      influencePerHour: 5,
      equipmentPerHour: 0,
    },

    2: {
      moneyPerHour: 0,
      materialsPerHour: 0,
      influencePerHour: 10,
      equipmentPerHour: 0,
    },

    3: {
      moneyPerHour: 0,
      materialsPerHour: 0,
      influencePerHour: 18,
      equipmentPerHour: 0,
    },

    4: {
      moneyPerHour: 0,
      materialsPerHour: 0,
      influencePerHour: 30,
      equipmentPerHour: 0,
    },

    5: {
      moneyPerHour: 0,
      materialsPerHour: 0,
      influencePerHour: 50,
      equipmentPerHour: 0,
    },

    6: {
      moneyPerHour: 0,
      materialsPerHour: 0,
      influencePerHour: 80,
      equipmentPerHour: 0,
    },

    7: {
      moneyPerHour: 0,
      materialsPerHour: 0,
      influencePerHour: 125,
      equipmentPerHour: 0,
    },

    8: {
      moneyPerHour: 0,
      materialsPerHour: 0,
      influencePerHour: 190,
      equipmentPerHour: 0,
    },

    9: {
      moneyPerHour: 0,
      materialsPerHour: 0,
      influencePerHour: 280,
      equipmentPerHour: 0,
    },

    10: {
      moneyPerHour: 0,
      materialsPerHour: 0,
      influencePerHour: 400,
      equipmentPerHour: 0,
    },
  },

  /*
   * Production exacte de l'Usine,
   * identique à progression.ts.
   */
  factory: {
    1: {
      moneyPerHour: 0,
      materialsPerHour: 0,
      influencePerHour: 0,
      equipmentPerHour: 5,
    },

    2: {
      moneyPerHour: 0,
      materialsPerHour: 0,
      influencePerHour: 0,
      equipmentPerHour: 10,
    },

    3: {
      moneyPerHour: 0,
      materialsPerHour: 0,
      influencePerHour: 0,
      equipmentPerHour: 18,
    },

    4: {
      moneyPerHour: 0,
      materialsPerHour: 0,
      influencePerHour: 0,
      equipmentPerHour: 30,
    },

    5: {
      moneyPerHour: 0,
      materialsPerHour: 0,
      influencePerHour: 0,
      equipmentPerHour: 50,
    },

    6: {
      moneyPerHour: 0,
      materialsPerHour: 0,
      influencePerHour: 0,
      equipmentPerHour: 80,
    },

    7: {
      moneyPerHour: 0,
      materialsPerHour: 0,
      influencePerHour: 0,
      equipmentPerHour: 120,
    },

    8: {
      moneyPerHour: 0,
      materialsPerHour: 0,
      influencePerHour: 0,
      equipmentPerHour: 180,
    },

    9: {
      moneyPerHour: 0,
      materialsPerHour: 0,
      influencePerHour: 0,
      equipmentPerHour: 260,
    },

    10: {
      moneyPerHour: 0,
      materialsPerHour: 0,
      influencePerHour: 0,
      equipmentPerHour: 380,
    },
  },
}