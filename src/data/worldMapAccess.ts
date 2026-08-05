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

export function loadWorldMapAccessPlacement() {
  if (
    typeof window ===
    "undefined"
  ) {
    return {
      ...WORLD_MAP_HELICOPTER_DEFAULT_PLACEMENT,
    }
  }

  try {
    const rawValue =
      window.localStorage.getItem(
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
    WorldMapAccessPlacement
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
      STORAGE_KEY,
      JSON.stringify(
        normalized
      )
    )
  }

  return normalized
}

export function resetWorldMapAccessPlacement() {
  const defaults = {
    ...WORLD_MAP_HELICOPTER_DEFAULT_PLACEMENT,
  }

  saveWorldMapAccessPlacement(
    defaults
  )

  return defaults
}
