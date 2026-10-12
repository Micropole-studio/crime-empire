import { supabase } from "./supabase"

import type {
  BuildingPlacement,
  BuildingPlacements,
} from "../types/buildingPlacement"

import type {
  BuildingType,
} from "../types/building"

import {
  loadBuildingPlacements,
  saveBuildingPlacements,
} from "./buildingPlacementStorage"

export const BUILDING_PLACEMENTS_UPDATED_EVENT =
  "crime-empire:building-placements-updated"

const BUILDING_TYPES: BuildingType[] = [
  "villa",
  "workshop",
  "hideout",
  "wall",
  "laboratory",
  "syndicate",
  "factory",
]

type RemotePlacements = Partial<
  Record<
    BuildingType,
    Partial<BuildingPlacement>
  >
>

export type SharedPlacementsResult = {
  placements: BuildingPlacements
  hasRemotePlacements: boolean
  loadError: string | null
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

function mergePlacements(
  localPlacements: BuildingPlacements,
  remotePlacements: RemotePlacements
): BuildingPlacements {
  const merged = {
    ...localPlacements,
  }

  for (const type of BUILDING_TYPES) {
    const remote =
      remotePlacements[type]

    if (!remote) {
      continue
    }

    merged[type] = {
      ...localPlacements[type],
      ...remote,
      type,
      x:
        getFiniteNumber(
          remote.x,
          localPlacements[type].x
        ),

      y:
        getFiniteNumber(
          remote.y,
          localPlacements[type].y
        ),

      width:
        getFiniteNumber(
          remote.width,
          localPlacements[type].width
        ),

      rotation:
        getFiniteNumber(
          remote.rotation,
          localPlacements[type].rotation
        ),

      zIndex:
        getFiniteNumber(
          remote.zIndex,
          localPlacements[type].zIndex
        ),
    }
  }

  return merged
}

function notifyPlacementsUpdated(
  placements: BuildingPlacements
) {
  if (typeof window === "undefined") {
    return
  }

  window.dispatchEvent(
    new CustomEvent(
      BUILDING_PLACEMENTS_UPDATED_EVENT,
      {
        detail: placements,
      }
    )
  )
}

export async function loadSharedBuildingPlacements(
  cityId: string
): Promise<SharedPlacementsResult> {
  const localPlacements =
    loadBuildingPlacements(
      cityId
    )

  if (!cityId) {
    return {
      placements:
        localPlacements,
      hasRemotePlacements:
        false,
      loadError: null,
    }
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    "get_city_building_placements",
    {
      p_city_id:
        cityId,
    }
  )

  if (error) {
    const details = [error.code, error.message, error.details, error.hint]
      .filter(Boolean).join(" | ")
    console.error("Positions Supabase indisponibles", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    })
    // Ne jamais confondre une erreur réseau/SQL avec une table vide :
    // l'éditeur NE DOIT PAS publier ses valeurs locales automatiquement.
    return {
      placements: localPlacements,
      hasRemotePlacements: false,
      loadError: details || "Échec de lecture Supabase",
    }
  }

  const remotePlacements =
    (
      data &&
      typeof data === "object"
        ? data
        : {}
    ) as RemotePlacements

  const hasRemotePlacements =
    Object.keys(
      remotePlacements
    ).length > 0

  const placements =
    mergePlacements(
      localPlacements,
      remotePlacements
    )

  /*
   * Une copie locale reste disponible
   * pour que l'éditeur fonctionne même
   * en cas de coupure réseau.
   */
  saveBuildingPlacements(
    placements,
    cityId
  )

  notifyPlacementsUpdated(
    placements
  )

  return {
    placements,
    hasRemotePlacements,
    loadError: null,
  }
}

export async function saveSharedBuildingPlacements(
  cityId: string,
  placements: BuildingPlacements
): Promise<BuildingPlacements> {
  if (!cityId) {
    throw new Error(
      "Impossible de publier les positions : City ID manquant"
    )
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    "save_city_building_placements",
    {
      p_city_id:
        cityId,
      p_placements:
        placements,
    }
  )

  if (error) {
    console.error("Impossible de publier les positions :", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    })

    throw error
  }

  const remotePlacements =
    (
      data &&
      typeof data === "object"
        ? data
        : {}
    ) as RemotePlacements

  const synchronized =
    mergePlacements(
      placements,
      remotePlacements
    )

  saveBuildingPlacements(
    synchronized,
    cityId
  )

  notifyPlacementsUpdated(
    synchronized
  )

  return synchronized
}
