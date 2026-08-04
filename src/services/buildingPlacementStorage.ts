import { DEFAULT_BUILDING_PLACEMENTS } from "../data/buildingPlacements"

import type {
  BuildingPlacements,
} from "../types/buildingPlacement"

const PLACEMENTS_STORAGE_KEY =
  "crime_empire_map_placements"

export function saveBuildingPlacements(
  placements: BuildingPlacements
) {
  try {
    localStorage.setItem(
      PLACEMENTS_STORAGE_KEY,
      JSON.stringify(placements)
    )
  } catch (error) {
    console.error(
      "Impossible de sauvegarder les placements :",
      error
    )
  }
}

export function loadBuildingPlacements(): BuildingPlacements {
  try {
    const raw = localStorage.getItem(
      PLACEMENTS_STORAGE_KEY
    )

    if (!raw) {
      return structuredClone(
        DEFAULT_BUILDING_PLACEMENTS
      )
    }

    const saved =
      JSON.parse(raw) as Partial<BuildingPlacements>

    return {
      villa: {
        ...DEFAULT_BUILDING_PLACEMENTS.villa,
        ...saved.villa,
        type: "villa",
      },

      workshop: {
        ...DEFAULT_BUILDING_PLACEMENTS.workshop,
        ...saved.workshop,
        type: "workshop",
      },

      hideout: {
        ...DEFAULT_BUILDING_PLACEMENTS.hideout,
        ...saved.hideout,
        type: "hideout",
      },

      wall: {
        ...DEFAULT_BUILDING_PLACEMENTS.wall,
        ...saved.wall,
        type: "wall",
      },

      laboratory: {
        ...DEFAULT_BUILDING_PLACEMENTS.laboratory,
        ...saved.laboratory,
        type: "laboratory",
      },

      syndicate: {
        ...DEFAULT_BUILDING_PLACEMENTS.syndicate,
        ...saved.syndicate,
        type: "syndicate",
      },

      factory: {
        ...DEFAULT_BUILDING_PLACEMENTS.factory,
        ...saved.factory,
        type: "factory",
      },
    }
  } catch (error) {
    console.error(
      "Impossible de charger les placements :",
      error
    )

    return structuredClone(
      DEFAULT_BUILDING_PLACEMENTS
    )
  }
}

export function resetBuildingPlacements(): BuildingPlacements {
  localStorage.removeItem(
    PLACEMENTS_STORAGE_KEY
  )

  return structuredClone(
    DEFAULT_BUILDING_PLACEMENTS
  )
}