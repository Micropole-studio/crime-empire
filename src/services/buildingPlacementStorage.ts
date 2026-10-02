import { DEFAULT_BUILDING_PLACEMENTS } from "../data/buildingPlacements"

import type {
  BuildingPlacements,
} from "../types/buildingPlacement"

const PLACEMENTS_STORAGE_KEY =
  "crime_empire_map_placements"

function getStorageKey(
  cityId?: string
) {
  const normalizedCityId =
    cityId?.trim()

  return normalizedCityId
    ? `${PLACEMENTS_STORAGE_KEY}:${normalizedCityId}`
    : PLACEMENTS_STORAGE_KEY
}

export function saveBuildingPlacements(
  placements: BuildingPlacements,
  cityId?: string
) {
  try {
    localStorage.setItem(
      getStorageKey(cityId),
      JSON.stringify(placements)
    )
  } catch (error) {
    console.error(
      "Impossible de sauvegarder les placements :",
      error
    )
  }
}

export function loadBuildingPlacements(
  cityId?: string
): BuildingPlacements {
  try {
    const scopedKey =
      getStorageKey(cityId)

    let raw =
      localStorage.getItem(
        scopedKey
      )

    /*
     * Migration douce : l'ancienne version du jeu
     * stockait une seule disposition pour tout le
     * navigateur. On ne la récupère que si aucun
     * cityId n'est fourni. Un nouveau joueur ne doit
     * jamais hériter de la disposition locale DEV.
     */
    if (!raw && !cityId) {
      raw = localStorage.getItem(
        PLACEMENTS_STORAGE_KEY
      )
    }

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

export function resetBuildingPlacements(
  cityId?: string
): BuildingPlacements {
  localStorage.removeItem(
    getStorageKey(cityId)
  )

  return structuredClone(
    DEFAULT_BUILDING_PLACEMENTS
  )
}
