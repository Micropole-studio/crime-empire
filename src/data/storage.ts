import type {
  Building,
  BuildingType,
} from "../types/building"

import type {
  CityResearch,
} from "../types/research"

export type StorageCapacities = {
  money: number
  materials: number
  influence: number
  equipment: number
}

export type PhysicalStorage = {
  money: number
  materials: number
  equipment: number
}

export type ResourceProtectionBreakdown = {
  currentAmount: number
  protectedCapacity: number
  protectedAmount: number
  exposedAmount: number
}

/*
 * Capacité de stockage physique
 * apportée par la Planque.
 */
const HIDEOUT_STORAGE_BY_LEVEL: Record<
  number,
  PhysicalStorage
> = {
  0: {
    money: 50_000,
    materials: 10_000,
    equipment: 500,
  },

  1: {
    money: 100_000,
    materials: 20_000,
    equipment: 1_000,
  },

  2: {
    money: 200_000,
    materials: 40_000,
    equipment: 2_000,
  },

  3: {
    money: 350_000,
    materials: 70_000,
    equipment: 3_500,
  },

  4: {
    money: 550_000,
    materials: 110_000,
    equipment: 5_500,
  },

  5: {
    money: 800_000,
    materials: 170_000,
    equipment: 8_000,
  },

  6: {
    money: 1_200_000,
    materials: 260_000,
    equipment: 12_000,
  },

  7: {
    money: 1_800_000,
    materials: 400_000,
    equipment: 18_000,
  },

  8: {
    money: 2_600_000,
    materials: 600_000,
    equipment: 26_000,
  },

  9: {
    money: 3_800_000,
    materials: 900_000,
    equipment: 38_000,
  },

  10: {
    money: 5_500_000,
    materials: 1_300_000,
    equipment: 55_000,
  },
}

/*
 * Capacité du réseau d'Influence
 * apportée par le Syndicat.
 */
const SYNDICATE_INFLUENCE_BY_LEVEL: Record<
  number,
  number
> = {
  0: 1_000,
  1: 5_000,
  2: 10_000,
  3: 20_000,
  4: 35_000,
  5: 60_000,
  6: 100_000,
  7: 170_000,
  8: 280_000,
  9: 450_000,
  10: 750_000,
}

function getHighestBuildingLevel(
  buildings: Building[],
  buildingType: BuildingType
) {
  return buildings
    .filter(
      (building) =>
        building.type === buildingType
    )
    .reduce(
      (highestLevel, building) =>
        Math.max(
          highestLevel,
          Number(building.level) || 0
        ),
      0
    )
}

function getSafeLevel(level: number) {
  return Math.min(
    10,
    Math.max(
      0,
      Math.floor(Number(level) || 0)
    )
  )
}

function applyPercent(
  value: number,
  bonusPercent: number
) {
  return Math.floor(
    Math.max(
      0,
      Number(value) || 0
    ) *
      (
        1 +
        Math.max(
          0,
          Number(bonusPercent) || 0
        ) /
          100
      )
  )
}

export function getHideoutStorageCapacitiesByLevel(
  level: number,
  bonusPercent = 0
): PhysicalStorage {
  const safeLevel =
    getSafeLevel(level)

  const base =
    HIDEOUT_STORAGE_BY_LEVEL[
      safeLevel
    ] ?? HIDEOUT_STORAGE_BY_LEVEL[0]

  return {
    money: applyPercent(
      base.money,
      bonusPercent
    ),

    materials: applyPercent(
      base.materials,
      bonusPercent
    ),

    equipment: applyPercent(
      base.equipment,
      bonusPercent
    ),
  }
}

export function getSyndicateInfluenceCapacityByLevel(
  level: number,
  bonusPercent = 0
) {
  const safeLevel =
    getSafeLevel(level)

  const base =
    SYNDICATE_INFLUENCE_BY_LEVEL[
      safeLevel
    ] ??
    SYNDICATE_INFLUENCE_BY_LEVEL[0]

  return applyPercent(
    base,
    bonusPercent
  )
}

/*
 * Protection prévue contre le futur pillage.
 *
 * Niveau 1-2 : 0 %
 * Niveau 3-4 : 10 %
 * Niveau 5-6 : 20 %
 * Niveau 7-8 : 30 %
 * Niveau 9   : 35 %
 * Niveau 10  : 40 %
 */
export function getHideoutProtectionPercent(
  level: number
) {
  const safeLevel =
    getSafeLevel(level)

  if (safeLevel >= 10) {
    return 40
  }

  if (safeLevel >= 9) {
    return 35
  }

  if (safeLevel >= 7) {
    return 30
  }

  if (safeLevel >= 5) {
    return 20
  }

  if (safeLevel >= 3) {
    return 10
  }

  return 0
}

export function getResourceProtectionBreakdown(
  currentAmount: number,
  storageCapacity: number,
  protectionPercent: number
): ResourceProtectionBreakdown {
  const safeCurrentAmount =
    Math.max(
      0,
      Number(currentAmount) || 0
    )

  const safeStorageCapacity =
    Math.max(
      0,
      Number(storageCapacity) || 0
    )

  const safeProtectionPercent =
    Math.min(
      100,
      Math.max(
        0,
        Number(protectionPercent) || 0
      )
    )

  const protectedCapacity =
    Math.floor(
      safeStorageCapacity *
        safeProtectionPercent /
        100
    )

  const protectedAmount =
    Math.min(
      safeCurrentAmount,
      protectedCapacity
    )

  return {
    currentAmount:
      safeCurrentAmount,

    protectedCapacity,

    protectedAmount,

    exposedAmount:
      Math.max(
        0,
        safeCurrentAmount -
          protectedAmount
      ),
  }
}

/*
 * Capacités de base envoyées au SQL.
 *
 * Le serveur ajoute lui-même le bonus
 * Entrepôts dissimulés afin de ne jamais
 * appliquer deux fois les +5 %.
 */
export function getStorageCapacities(
  buildings: Building[]
): StorageCapacities {
  const hideoutLevel =
    getHighestBuildingLevel(
      buildings,
      "hideout"
    )

  const syndicateLevel =
    getHighestBuildingLevel(
      buildings,
      "syndicate"
    )

  const physicalStorage =
    getHideoutStorageCapacitiesByLevel(
      hideoutLevel
    )

  return {
    money:
      physicalStorage.money,

    materials:
      physicalStorage.materials,

    equipment:
      physicalStorage.equipment,

    influence:
      getSyndicateInfluenceCapacityByLevel(
        syndicateLevel
      ),
  }
}

export function getStorageResearchBonusPercent(
  researches: CityResearch[]
) {
  const completed =
    researches.some(
      (research) =>
        research.research_key ===
          "hidden_warehouses_1" &&
        research.status ===
          "completed"
    )

  return completed
    ? 5
    : 0
}

/*
 * Capacités à afficher dans l'interface.
 */
export function getDisplayedStorageCapacities(
  buildings: Building[],
  researches: CityResearch[]
): StorageCapacities {
  const hideoutLevel =
    getHighestBuildingLevel(
      buildings,
      "hideout"
    )

  const syndicateLevel =
    getHighestBuildingLevel(
      buildings,
      "syndicate"
    )

  const bonusPercent =
    getStorageResearchBonusPercent(
      researches
    )

  const physicalStorage =
    getHideoutStorageCapacitiesByLevel(
      hideoutLevel,
      bonusPercent
    )

  return {
    money:
      physicalStorage.money,

    materials:
      physicalStorage.materials,

    equipment:
      physicalStorage.equipment,

    influence:
      getSyndicateInfluenceCapacityByLevel(
        syndicateLevel,
        bonusPercent
      ),
  }
}
