import { supabase } from "./supabase"

import type {
  CityMission,
  ClaimMissionResult,
  MissionType,
} from "../types/mission"

import type {
  TroopType,
} from "../types/troop"

function normalizeMission(
  mission: any
): CityMission {
  return {
    ...mission,

    reward_payload:
      mission?.reward_payload ?? {},

    reward_xp:
      Number(
        mission?.reward_xp
      ) || 0,

    assigned_troops:
      Array.isArray(
        mission?.assigned_troops
      )
        ? mission.assigned_troops
        : [],
  } as CityMission
}

export async function getCityMissions(
  cityId: string
): Promise<CityMission[]> {
  if (!cityId) {
    throw new Error(
      "Impossible de charger les missions : City ID manquant"
    )
  }

  const {
    data,
    error,
  } = await supabase
    .from("city_missions")
    .select(
      `
        id,
        city_id,
        mission_key,
        status,
        reward_payload,
        reward_xp,
        started_at,
        finish_at,
        completed_at,
        claimed_at,
        created_at,
        assigned_troops:city_mission_troops (
          id,
          mission_id,
          troop_key,
          quantity
        )
      `
    )
    .eq("city_id", cityId)
    .in("status", [
      "active",
      "completed",
    ])
    .order("created_at", {
      ascending: false,
    })

  if (error) {
    console.error(
      "Erreur pendant le chargement des missions :",
      error
    )

    throw error
  }

  return (data ?? []).map(
    normalizeMission
  )
}

export async function syncCityMissions(
  cityId: string
): Promise<CityMission[]> {
  if (!cityId) {
    throw new Error(
      "Impossible de synchroniser les missions : City ID manquant"
    )
  }

  const {
    error,
  } = await supabase.rpc(
    "sync_city_missions",
    {
      p_city_id:
        cityId,
    }
  )

  if (error) {
    console.error(
      "Erreur pendant la synchronisation des missions :",
      error
    )

    throw error
  }

  return getCityMissions(
    cityId
  )
}

export function getActiveMission(
  missions: CityMission[]
) {
  return (
    missions.find(
      (mission) =>
        mission.status ===
        "active"
    ) ?? null
  )
}

export function getCompletedMissions(
  missions: CityMission[]
) {
  return missions.filter(
    (mission) =>
      mission.status ===
      "completed"
  )
}

export function getMissionRemainingSeconds(
  mission: CityMission,
  currentTime = Date.now()
) {
  if (
    mission.status !== "active" ||
    !mission.finish_at
  ) {
    return 0
  }

  const finishTime =
    new Date(
      mission.finish_at
    ).getTime()

  if (
    Number.isNaN(
      finishTime
    )
  ) {
    return 0
  }

  return Math.max(
    0,
    Math.ceil(
      (
        finishTime -
        currentTime
      ) / 1000
    )
  )
}

export function getAssignedTroopQuantity(
  mission: CityMission | null,
  troopType: TroopType
) {
  if (!mission) {
    return 0
  }

  return mission.assigned_troops
    .filter(
      (assignment) =>
        assignment.troop_key ===
        troopType
    )
    .reduce(
      (
        total,
        assignment
      ) =>
        total +
        (
          Number(
            assignment.quantity
          ) || 0
        ),
      0
    )
}

export async function startCityMission(
  cityId: string,
  missionType: MissionType,
  troopType: TroopType,
  quantity: number
): Promise<CityMission> {
  if (!cityId) {
    throw new Error(
      "Impossible de lancer la mission : City ID manquant"
    )
  }

  const safeQuantity =
    Math.floor(
      Number(quantity)
    )

  if (
    !Number.isFinite(
      safeQuantity
    ) ||
    safeQuantity < 1
  ) {
    throw new Error(
      "La quantité de troupes est invalide"
    )
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    "start_city_mission",
    {
      p_city_id:
        cityId,

      p_mission_key:
        missionType,

      p_troop_key:
        troopType,

      p_quantity:
        safeQuantity,
    }
  )

  if (error) {
    console.error(
      "Erreur pendant le lancement de la mission :",
      error
    )

    throw error
  }

  return normalizeMission(
    data
  )
}

export async function claimCityMissionReward(
  missionId: string
): Promise<ClaimMissionResult> {
  if (!missionId) {
    throw new Error(
      "Impossible de récupérer le butin : Mission ID manquant"
    )
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    "claim_city_mission",
    {
      p_mission_id:
        missionId,
    }
  )

  if (error) {
    console.error(
      "Erreur pendant la récupération du butin :",
      error
    )

    throw error
  }

  const result =
    (data ?? {}) as Partial<ClaimMissionResult>

  return {
    mission:
      result.mission,

    inventory_item:
      result.inventory_item,

    xp_gained:
      Number(
        result.xp_gained
      ) || 0,

    levels_gained:
      Number(
        result.levels_gained
      ) || 0,

    commander_level:
      Math.max(
        1,
        Number(
          result.commander_level
        ) || 1
      ),

    commander_xp:
      Math.max(
        0,
        Number(
          result.commander_xp
        ) || 0
      ),

    xp_to_next_level:
      Math.max(
        100,
        Number(
          result.xp_to_next_level
        ) || 100
      ),

    commander_skill_points:
      Math.max(
        0,
        Number(
          result.commander_skill_points
        ) || 0
      ),
  }
}
