import type {
  Building,
  BuildingType,
} from "../types/building"

import {
  BUILDING_NAMES,
} from "./buildingNames"

export type VillaUpgradeRequirement = {
  building: BuildingType
  level: number
}

export type VillaRequirementState =
  VillaUpgradeRequirement & {
    name: string
    currentLevel: number
    completed: boolean
  }

/*
 * Niveau de Villa nécessaire pour rendre
 * le terrain du bâtiment constructible.
 *
 * Villa niveau 1 :
 * - Planque
 * - Garage
 *
 * Villa niveau 2 :
 * - Sécurité
 *
 * Villa niveau 3 :
 * - Syndicat
 *
 * Villa niveau 4 :
 * - Laboratoire
 * - Usine
 */
export const BUILDING_UNLOCK_VILLA_LEVELS: Record<
  BuildingType,
  number
> = {
  villa: 0,
  workshop: 1,
  hideout: 1,
  wall: 2,
  syndicate: 3,
  laboratory: 4,
  factory: 4,
}

/*
 * Conditions nécessaires pour améliorer
 * la Villa vers le niveau indiqué.
 *
 * La structure évite les blocages circulaires :
 * chaque prérequis peut être atteint avec le
 * niveau actuel de la Villa.
 */
export const VILLA_UPGRADE_REQUIREMENTS: Partial<
  Record<
    number,
    VillaUpgradeRequirement[]
  >
> = {
  2: [
    {
      building: "hideout",
      level: 1,
    },
    {
      building: "workshop",
      level: 1,
    },
  ],

  3: [
    {
      building: "hideout",
      level: 2,
    },
    {
      building: "workshop",
      level: 2,
    },
    {
      building: "wall",
      level: 1,
    },
  ],

  4: [
    {
      building: "wall",
      level: 3,
    },
    {
      building: "syndicate",
      level: 2,
    },
  ],

  5: [
    {
      building: "hideout",
      level: 4,
    },
    {
      building: "laboratory",
      level: 2,
    },
    {
      building: "factory",
      level: 2,
    },
  ],

  6: [
    {
      building: "workshop",
      level: 5,
    },
    {
      building: "wall",
      level: 5,
    },
    {
      building: "syndicate",
      level: 4,
    },
  ],

  7: [
    {
      building: "hideout",
      level: 6,
    },
    {
      building: "laboratory",
      level: 5,
    },
    {
      building: "factory",
      level: 5,
    },
  ],

  8: [
    {
      building: "workshop",
      level: 7,
    },
    {
      building: "wall",
      level: 7,
    },
    {
      building: "syndicate",
      level: 6,
    },
  ],

  9: [
    {
      building: "hideout",
      level: 8,
    },
    {
      building: "laboratory",
      level: 7,
    },
    {
      building: "factory",
      level: 7,
    },
  ],

  10: [
    {
      building: "workshop",
      level: 9,
    },
    {
      building: "hideout",
      level: 9,
    },
    {
      building: "wall",
      level: 9,
    },
    {
      building: "syndicate",
      level: 8,
    },
    {
      building: "laboratory",
      level: 8,
    },
    {
      building: "factory",
      level: 8,
    },
  ],
}

export function getRequiredVillaLevel(
  buildingType: BuildingType
) {
  return (
    BUILDING_UNLOCK_VILLA_LEVELS[
      buildingType
    ] ?? 0
  )
}

export function getHighestBuildingLevel(
  buildings: Building[],
  buildingType: BuildingType
) {
  return buildings
    .filter(
      (building) =>
        building.type ===
        buildingType
    )
    .reduce(
      (
        highestLevel,
        building
      ) =>
        Math.max(
          highestLevel,
          Number(
            building.level
          ) || 0
        ),
      0
    )
}

export function getVillaUpgradeRequirements(
  targetLevel: number
) {
  return (
    VILLA_UPGRADE_REQUIREMENTS[
      targetLevel
    ] ?? []
  )
}

export function getVillaRequirementStates(
  buildings: Building[],
  targetLevel: number
): VillaRequirementState[] {
  return getVillaUpgradeRequirements(
    targetLevel
  ).map(
    (requirement) => {
      const currentLevel =
        getHighestBuildingLevel(
          buildings,
          requirement.building
        )

      return {
        ...requirement,

        name:
          BUILDING_NAMES[
            requirement.building
          ],

        currentLevel,

        completed:
          currentLevel >=
          requirement.level,
      }
    }
  )
}

export function getVillaUnlocksForTargetLevel(
  targetLevel: number
) {
  const unlockedTypes =
    (
      Object.keys(
        BUILDING_UNLOCK_VILLA_LEVELS
      ) as BuildingType[]
    ).filter(
      (buildingType) =>
        buildingType !==
          "villa" &&
        getRequiredVillaLevel(
          buildingType
        ) === targetLevel
    )

  return unlockedTypes.map(
    (buildingType) =>
      `${BUILDING_NAMES[buildingType]} constructible`
  )
}
