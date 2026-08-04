import {
  BUILDING_PRODUCTION,
} from "../data/economy"

import type {
  Building,
  BuildingType,
} from "../types/building"

import type {
  BuildingProduction,
} from "../data/economy"

export type EconomyResult = {
  moneyPerHour: number
  materialsPerHour: number
  influencePerHour: number
  equipmentPerHour: number
}

const EMPTY_PRODUCTION: BuildingProduction = {
  moneyPerHour: 0,
  materialsPerHour: 0,
  influencePerHour: 0,
  equipmentPerHour: 0,
}

export function getBuildingProduction(
  buildingType: BuildingType,
  buildingLevel: number
): BuildingProduction {
  const safeLevel = Math.max(
    0,
    Math.floor(
      Number(buildingLevel) || 0
    )
  )

  if (safeLevel <= 0) {
    return {
      ...EMPTY_PRODUCTION,
    }
  }

  return (
    BUILDING_PRODUCTION[
      buildingType
    ]?.[safeLevel] ?? {
      ...EMPTY_PRODUCTION,
    }
  )
}

export function calculateEconomy(
  buildings: Building[]
): EconomyResult {
  let moneyPerHour = 0
  let materialsPerHour = 0
  let influencePerHour = 0
  let equipmentPerHour = 0

  for (const building of buildings) {
    const buildingType =
      building.type as BuildingType

    /*
     * Un bâtiment de niveau 0 ne doit pas
     * produire comme un bâtiment niveau 1.
     */
    const buildingLevel = Math.max(
      0,
      Math.floor(
        Number(building.level) || 0
      )
    )

    if (buildingLevel <= 0) {
      continue
    }

    const production =
      getBuildingProduction(
        buildingType,
        buildingLevel
      )

    moneyPerHour +=
      Number(
        production.moneyPerHour
      ) || 0

    materialsPerHour +=
      Number(
        production.materialsPerHour
      ) || 0

    influencePerHour +=
      Number(
        production.influencePerHour
      ) || 0

    equipmentPerHour +=
      Number(
        production.equipmentPerHour
      ) || 0
  }

  return {
    moneyPerHour,
    materialsPerHour,
    influencePerHour,
    equipmentPerHour,
  }
}
