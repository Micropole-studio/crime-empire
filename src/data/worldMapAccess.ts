export type WorldMapAccessPlacement = {
  x: number
  y: number
  width: number
  rotation: number
  zIndex: number
}

export const WORLD_MAP_HELICOPTER_DEFAULT_PLACEMENT:
  WorldMapAccessPlacement = {
    x: 22.2,
    y: 27.2,
    width: 15.5,
    rotation: -4,
    zIndex: 90,
  }

const STORAGE_KEY =
  "crime-empire:world-map-helicopter-placement"

const LEGACY_MIGRATION_PREFIX =
  "crime-empire:world-map-helicopter-placement:migrated"

function getStorageKey(cityId?: string) {
  const normalizedCityId = cityId?.trim()

  return normalizedCityId
    ? `${STORAGE_KEY}:${normalizedCityId}`
    : STORAGE_KEY
}

function getLegacyMigrationKey(
  cityId: string
) {
  return `${LEGACY_MIGRATION_PREFIX}:${cityId}`
}

function migrateLegacyPlacement(
  cityId: string
): string | null {
  const scopedKey =
    getStorageKey(cityId)

  const migrationKey =
    getLegacyMigrationKey(cityId)

  const legacyRaw =
    window.localStorage.getItem(
      STORAGE_KEY
    )

  if (
    !legacyRaw ||
    window.localStorage.getItem(
      migrationKey
    )
  ) {
    return window.localStorage.getItem(
      scopedKey
    )
  }

  try {
    const normalized =
      normalizeWorldMapAccessPlacement(
        JSON.parse(
          legacyRaw
        )
      )

    const serialized =
      JSON.stringify(
        normalized
      )

    window.localStorage.setItem(
      scopedKey,
      serialized
    )

    window.localStorage.setItem(
      migrationKey,
      "1"
    )

    window.localStorage.removeItem(
      STORAGE_KEY
    )

    return serialized
  } catch (error) {
    console.error(
      "Impossible de migrer l'ancienne position de l'hélicoptère :",
      error
    )

    return window.localStorage.getItem(
      scopedKey
    )
  }
}

function getFiniteNumber(
  value: unknown,
  fallback: number
) {
  const numericValue =
    Number(value)

  return Number.isFinite(
    numericValue
  )
    ? numericValue
    : fallback
}

export function normalizeWorldMapAccessPlacement(
  value: unknown
): WorldMapAccessPlacement {
  const source =
    value &&
    typeof value ===
      "object"
      ? (
          value as Partial<
            WorldMapAccessPlacement
          >
        )
      : {}

  return {
    x:
      Math.min(
        100,
        Math.max(
          0,
          getFiniteNumber(
            source.x,
            WORLD_MAP_HELICOPTER_DEFAULT_PLACEMENT.x
          )
        )
      ),

    y:
      Math.min(
        100,
        Math.max(
          0,
          getFiniteNumber(
            source.y,
            WORLD_MAP_HELICOPTER_DEFAULT_PLACEMENT.y
          )
        )
      ),

    width:
      Math.min(
        60,
        Math.max(
          1,
          getFiniteNumber(
            source.width,
            WORLD_MAP_HELICOPTER_DEFAULT_PLACEMENT.width
          )
        )
      ),

    rotation:
      getFiniteNumber(
        source.rotation,
        WORLD_MAP_HELICOPTER_DEFAULT_PLACEMENT.rotation
      ),

    zIndex:
      Math.min(
        100,
        Math.max(
          1,
          Math.round(
            getFiniteNumber(
              source.zIndex,
              WORLD_MAP_HELICOPTER_DEFAULT_PLACEMENT.zIndex
            )
          )
        )
      ),
  }
}

export function loadWorldMapAccessPlacement(
  cityId?: string
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return {
      ...WORLD_MAP_HELICOPTER_DEFAULT_PLACEMENT,
    }
  }

  try {
    const normalizedCityId =
      cityId?.trim()

    const rawValue =
      normalizedCityId
        ? migrateLegacyPlacement(
            normalizedCityId
          )
        : window.localStorage.getItem(
            STORAGE_KEY
          )

    if (!rawValue) {
      return {
        ...WORLD_MAP_HELICOPTER_DEFAULT_PLACEMENT,
      }
    }

    return normalizeWorldMapAccessPlacement(
      JSON.parse(
        rawValue
      )
    )
  } catch (error) {
    console.error(
      "Impossible de charger la position locale de l'hélicoptère :",
      error
    )

    return {
      ...WORLD_MAP_HELICOPTER_DEFAULT_PLACEMENT,
    }
  }
}

export function saveWorldMapAccessPlacement(
  placement:
    WorldMapAccessPlacement,
  cityId?: string
) {
  const normalized =
    normalizeWorldMapAccessPlacement(
      placement
    )

  if (
    typeof window !==
    "undefined"
  ) {
    window.localStorage.setItem(
      getStorageKey(cityId),
      JSON.stringify(
        normalized
      )
    )
  }

  return normalized
}

export function resetWorldMapAccessPlacement(
  cityId?: string
) {
  const defaults = {
    ...WORLD_MAP_HELICOPTER_DEFAULT_PLACEMENT,
  }

  saveWorldMapAccessPlacement(
    defaults,
    cityId
  )

  return defaults
}
