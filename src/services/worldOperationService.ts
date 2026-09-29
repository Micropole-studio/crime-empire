import { supabase } from "./supabase"

import type {
  HumanDeploymentSelection,
} from "../types/deployment"

import type {
  CityTroop,
  TroopType,
} from "../types/troop"

import type {
  WorldCombatResult,
  WorldOperationRewards,
} from "../types/worldOperation"

const TROOP_TYPES: TroopType[] = [
  "henchman_1",
  "henchman_2",
  "henchman_3",
  "lieutenant_1",
]

function normalizeQuantity(
  value: unknown
) {
  return Math.max(
    0,
    Math.floor(Number(value) || 0)
  )
}

async function loadTroops(
  cityId: string
) {
  const { data, error } = await supabase
    .from("city_troops")
    .select("id, city_id, troop_key, quantity")
    .eq("city_id", cityId)

  if (error) {
    throw error
  }

  return (data ?? []) as CityTroop[]
}

export async function reserveWorldOperationTroops(
  cityId: string,
  selection: HumanDeploymentSelection
) {
  const troops = await loadTroops(cityId)

  const byType = new Map<TroopType, CityTroop>()

  for (const troop of troops) {
    byType.set(troop.troop_key, troop)
  }

  const changes: Array<{
    troop: CityTroop
    previousQuantity: number
    nextQuantity: number
  }> = []

  for (const troopType of TROOP_TYPES) {
    const requested = normalizeQuantity(
      selection[troopType]
    )

    if (requested <= 0) {
      continue
    }

    const troop = byType.get(troopType)
    const available = normalizeQuantity(
      troop?.quantity
    )

    if (!troop || available < requested) {
      throw new Error(
        "Tes troupes ont changé depuis l'ouverture de la préparation. Recharge l'escouade avant de repartir."
      )
    }

    changes.push({
      troop,
      previousQuantity: available,
      nextQuantity: available - requested,
    })
  }

  const applied: typeof changes = []

  try {
    for (const change of changes) {
      const { data, error } = await supabase
        .from("city_troops")
        .update({
          quantity: change.nextQuantity,
        })
        .eq("id", change.troop.id)
        .eq("quantity", change.previousQuantity)
        .select("id")

      if (error) {
        throw error
      }

      if (!data || data.length === 0) {
        throw new Error(
          "La garnison a changé pendant l'envoi de l'escouade. Relance la préparation."
        )
      }

      applied.push(change)
    }
  } catch (error) {
    for (const change of applied.reverse()) {
      await supabase
        .from("city_troops")
        .update({
          quantity: change.previousQuantity,
        })
        .eq("id", change.troop.id)
        .eq("quantity", change.nextQuantity)
    }

    throw error
  }

  return loadTroops(cityId)
}

async function returnTroops(
  cityId: string,
  selection: HumanDeploymentSelection
) {
  const troops = await loadTroops(cityId)
  const byType = new Map<TroopType, CityTroop>()

  for (const troop of troops) {
    byType.set(troop.troop_key, troop)
  }

  for (const troopType of TROOP_TYPES) {
    const returned = normalizeQuantity(
      selection[troopType]
    )

    if (returned <= 0) {
      continue
    }

    const troop = byType.get(troopType)

    if (!troop) {
      const { error } = await supabase
        .from("city_troops")
        .insert({
          city_id: cityId,
          troop_key: troopType,
          quantity: returned,
        })

      if (error) {
        throw error
      }

      continue
    }

    const current = normalizeQuantity(
      troop.quantity
    )

    const { error } = await supabase
      .from("city_troops")
      .update({
        quantity: current + returned,
      })
      .eq("id", troop.id)

    if (error) {
      throw error
    }
  }
}

function normalizeRewards(
  rewards?: Partial<WorldOperationRewards> | null
): WorldOperationRewards {
  return {
    money: normalizeQuantity(rewards?.money),
    materials: normalizeQuantity(rewards?.materials),
    equipment: normalizeQuantity(rewards?.equipment),
    influence: normalizeQuantity(rewards?.influence),
    commanderXp: normalizeQuantity(rewards?.commanderXp),
  }
}

async function addCityRewards(
  cityId: string,
  rewards: WorldOperationRewards
) {
  const safeRewards = normalizeRewards(rewards)

  if (
    safeRewards.money <= 0 &&
    safeRewards.materials <= 0 &&
    safeRewards.equipment <= 0 &&
    safeRewards.influence <= 0
  ) {
    return
  }

  const { data: city, error } = await supabase
    .from("cities")
    .select("id, money, materials, equipment, influence")
    .eq("id", cityId)
    .single()

  if (error) {
    throw error
  }

  const { error: updateError } = await supabase
    .from("cities")
    .update({
      money:
        (Number(city.money) || 0) +
        safeRewards.money,
      materials:
        (Number(city.materials) || 0) +
        safeRewards.materials,
      equipment:
        (Number(city.equipment) || 0) +
        safeRewards.equipment,
      influence:
        (Number(city.influence) || 0) +
        safeRewards.influence,
    })
    .eq("id", cityId)

  if (updateError) {
    throw updateError
  }
}

async function addCommanderXp(
  playerId: string,
  xpGained: number
) {
  const safeXp = normalizeQuantity(xpGained)

  if (!playerId || safeXp <= 0) {
    return
  }

  const { data: player, error } = await supabase
    .from("players")
    .select(
      "id, commander_level, commander_xp, commander_skill_points"
    )
    .eq("id", playerId)
    .single()

  if (error) {
    throw error
  }

  let level = Math.max(
    1,
    normalizeQuantity(player.commander_level) || 1
  )

  let xp = Math.max(
    0,
    normalizeQuantity(player.commander_xp) + safeXp
  )

  let skillPoints = Math.max(
    0,
    normalizeQuantity(player.commander_skill_points)
  )

  while (xp >= level * 100) {
    xp -= level * 100
    level += 1
    skillPoints += 1
  }

  const { error: updateError } = await supabase
    .from("players")
    .update({
      commander_level: level,
      commander_xp: xp,
      commander_skill_points: skillPoints,
    })
    .eq("id", playerId)

  if (updateError) {
    throw updateError
  }
}

export async function settleWorldOperation({
  cityId,
  playerId,
  returningTroops,
  combatResult,
  returnTroopsToGarrison = true,
}: {
  cityId: string
  playerId: string
  returningTroops: HumanDeploymentSelection
  combatResult?: WorldCombatResult
  returnTroopsToGarrison?: boolean
}) {
  if (returnTroopsToGarrison) {
    await returnTroops(
      cityId,
      returningTroops
    )
  }

  if (combatResult) {
    await addCityRewards(
      cityId,
      combatResult.rewards
    )

    await addCommanderXp(
      playerId,
      combatResult.rewards.commanderXp
    )
  }

  return loadTroops(cityId)
}
