import { DEFAULT_BUILDING_PLACEMENTS } from "../data/buildingPlacements"

import type {
  BuildingPlacements,
} from "../types/buildingPlacement"

const PLACEMENTS_STORAGE_KEY =
  "crime_empire_map_placements"

const LEGACY_MIGRATION_PREFIX =
  "crime_empire_map_placements_migrated"

function getStorageKey(
  cityId?: string
) {
  const normalizedCityId =
    cityId?.trim()

  return normalizedCityId
    ? `${PLACEMENTS_STORAGE_KEY}:${normalizedCityId}`
    : PLACEMENTS_STORAGE_KEY
}

function getLegacyMigrationKey(
  cityId: string
) {
  return `${LEGACY_MIGRATION_PREFIX}:${cityId}`
}

function normalizePlacements(
  saved: Partial<BuildingPlacements>
): BuildingPlacements {
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
}

function migrateLegacyPlacements(
  cityId: string
): string | null {
  const scopedKey =
    getStorageKey(cityId)

  const migrationKey =
    getLegacyMigrationKey(cityId)

  const legacyRaw =
    localStorage.getItem(
      PLACEMENTS_STORAGE_KEY
    )

  if (
    !legacyRaw ||
    localStorage.getItem(
      migrationKey
    )
  ) {
    return localStorage.getItem(
      scopedKey
    )
  }

  try {
    const parsed =
      JSON.parse(
        legacyRaw
      ) as Partial<BuildingPlacements>

    const normalized =
      normalizePlacements(
        parsed
      )

    const serialized =
      JSON.stringify(
        normalized
      )

    /*
     * Migration unique vers la première ville réelle
     * chargée sur ce navigateur. Cela restaure la
     * disposition DEV historique, puis supprime la
     * vieille clé globale pour qu'un futur compte ne
     * puisse pas l'hériter.
     */
    localStorage.setItem(
      scopedKey,
      serialized
    )

    localStorage.setItem(
      migrationKey,
      "1"
    )

    localStorage.removeItem(
      PLACEMENTS_STORAGE_KEY
    )

    return serialized
  } catch (error) {
    console.error(
      "Impossible de migrer les anciens placements :",
      error
    )

    return localStorage.getItem(
      scopedKey
    )
  }
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
    const normalizedCityId =
      cityId?.trim()

    const raw =
      normalizedCityId
        ? migrateLegacyPlacements(
            normalizedCityId
          )
        : localStorage.getItem(
            PLACEMENTS_STORAGE_KEY
          )

    if (!raw) {
      return structuredClone(
        DEFAULT_BUILDING_PLACEMENTS
      )
    }

    const saved =
      JSON.parse(raw) as Partial<BuildingPlacements>

    return normalizePlacements(
      saved
    )
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
