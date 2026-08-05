import { supabase } from "./supabase"

import {
  loadWorldMapAccessPlacement,
  normalizeWorldMapAccessPlacement,
  saveWorldMapAccessPlacement,
} from "../data/worldMapAccess"

import type {
  WorldMapAccessPlacement,
} from "../data/worldMapAccess"

export const WORLD_MAP_ACCESS_UPDATED_EVENT =
  "crime-empire:world-map-access-updated"

export type SharedWorldMapAccessResult = {
  placement: WorldMapAccessPlacement
  hasRemotePlacement: boolean
}

type RemotePlacements = {
  helicopter?: Partial<
    WorldMapAccessPlacement
  >
}

function notifyWorldMapAccessUpdated(
  placement:
    WorldMapAccessPlacement
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return
  }

  window.dispatchEvent(
    new CustomEvent(
      WORLD_MAP_ACCESS_UPDATED_EVENT,
      {
        detail:
          placement,
      }
    )
  )
}

export async function loadSharedWorldMapAccess(
  cityId: string
): Promise<SharedWorldMapAccessResult> {
  const localPlacement =
    loadWorldMapAccessPlacement()

  if (!cityId) {
    return {
      placement:
        localPlacement,

      hasRemotePlacement:
        false,
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
    console.error(
      "Impossible de charger la position partagée de l'hélicoptère :",
      error
    )

    return {
      placement:
        localPlacement,

      hasRemotePlacement:
        false,
    }
  }

  const remotePlacements =
    (
      data &&
      typeof data ===
        "object"
        ? data
        : {}
    ) as RemotePlacements

  const remotePlacement =
    remotePlacements.helicopter

  if (!remotePlacement) {
    return {
      placement:
        localPlacement,

      hasRemotePlacement:
        false,
    }
  }

  const placement =
    normalizeWorldMapAccessPlacement({
      ...localPlacement,
      ...remotePlacement,
    })

  saveWorldMapAccessPlacement(
    placement
  )

  notifyWorldMapAccessUpdated(
    placement
  )

  return {
    placement,
    hasRemotePlacement:
      true,
  }
}

export async function saveSharedWorldMapAccess(
  cityId: string,
  placement:
    WorldMapAccessPlacement
): Promise<WorldMapAccessPlacement> {
  if (!cityId) {
    throw new Error(
      "Impossible de publier la position de l'hélicoptère : City ID manquant"
    )
  }

  const normalized =
    normalizeWorldMapAccessPlacement(
      placement
    )

  const {
    data,
    error,
  } = await supabase.rpc(
    "save_city_building_placements",
    {
      p_city_id:
        cityId,

      p_placements: {
        helicopter: {
          type:
            "helicopter",

          ...normalized,
        },
      },
    }
  )

  if (error) {
    console.error(
      "Impossible de publier la position de l'hélicoptère :",
      error
    )

    throw error
  }

  const remotePlacements =
    (
      data &&
      typeof data ===
        "object"
        ? data
        : {}
    ) as RemotePlacements

  const synchronized =
    normalizeWorldMapAccessPlacement({
      ...normalized,
      ...remotePlacements.helicopter,
    })

  saveWorldMapAccessPlacement(
    synchronized
  )

  notifyWorldMapAccessUpdated(
    synchronized
  )

  return synchronized
}
