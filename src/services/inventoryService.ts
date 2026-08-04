import { supabase } from "./supabase"

import {
  getSpeedupTargetLabel,
} from "../data/inventory"

import type {
  InventoryItem,
  InventoryPayload,
  LootPayload,
  OpenInventoryLootResult,
  SpeedupScope,
  SpeedupTarget,
  SpeedupTargetType,
  UseInventorySpeedupResult,
} from "../types/inventory"

function normalizeAmount(
  value: unknown
) {
  const amount = Number(value)

  if (
    !Number.isFinite(amount) ||
    amount < 0
  ) {
    return 0
  }

  return amount
}

function normalizePositiveInteger(
  value: unknown
) {
  const amount =
    Math.floor(
      Number(value)
    )

  if (
    !Number.isFinite(amount) ||
    amount < 0
  ) {
    return 0
  }

  return amount
}

function normalizeSpeedupScope(
  value: unknown
): SpeedupScope | undefined {
  if (
    value === "construction" ||
    value === "recruitment" ||
    value === "research" ||
    value === "universal"
  ) {
    return value
  }

  return undefined
}

export function normalizeLootPayload(
  payload?: Partial<LootPayload> | null
): LootPayload {
  return {
    money:
      normalizeAmount(
        payload?.money
      ),

    materials:
      normalizeAmount(
        payload?.materials
      ),

    influence:
      normalizeAmount(
        payload?.influence
      ),

    equipment:
      normalizeAmount(
        payload?.equipment
      ),
  }
}

export function normalizeInventoryPayload(
  payload?: InventoryPayload | null
): InventoryPayload {
  const loot =
    normalizeLootPayload(
      payload
    )

  const scope =
    normalizeSpeedupScope(
      payload?.accelerator_scope
    )

  const seconds =
    normalizePositiveInteger(
      payload?.seconds
    )

  const commanderXp =
    normalizePositiveInteger(
      payload?.commander_xp
    )

  return {
    ...loot,

    ...(scope
      ? {
          accelerator_scope:
            scope,
        }
      : {}),

    ...(seconds > 0
      ? {
          seconds,
        }
      : {}),

    ...(commanderXp > 0
      ? {
          commander_xp:
            commanderXp,
        }
      : {}),
  }
}

export async function getCityInventory(
  cityId: string
): Promise<InventoryItem[]> {
  if (!cityId) {
    throw new Error(
      "Impossible de charger l'inventaire : City ID manquant"
    )
  }

  const {
    data,
    error,
  } = await supabase
    .from("city_inventory")
    .select(
      `
        id,
        city_id,
        item_key,
        item_type,
        quantity,
        payload,
        source_label,
        created_at,
        updated_at
      `
    )
    .eq("city_id", cityId)
    .order("created_at", {
      ascending: false,
    })

  if (error) {
    throw error
  }

  return (data ?? []).map(
    (item) => ({
      ...item,

      quantity:
        Math.max(
          1,
          Math.floor(
            Number(
              item.quantity
            ) || 1
          )
        ),

      payload:
        normalizeInventoryPayload(
          item.payload
        ),
    })
  ) as InventoryItem[]
}

export async function openInventoryLoot(
  inventoryItemId: string
): Promise<OpenInventoryLootResult> {
  if (!inventoryItemId) {
    throw new Error(
      "Impossible d'ouvrir ce butin : identifiant manquant"
    )
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    "open_inventory_loot",
    {
      p_inventory_id:
        inventoryItemId,
    }
  )

  if (error) {
    throw error
  }

  const result =
    data as Partial<OpenInventoryLootResult> | null

  return {
    added:
      normalizeLootPayload(
        result?.added
      ),

    remaining:
      normalizeLootPayload(
        result?.remaining
      ),

    deleted:
      Boolean(
        result?.deleted
      ),

    city:
      result?.city,
  }
}

export async function createInventoryLoot(
  cityId: string,
  itemKey: string,
  payload: Partial<LootPayload>,
  sourceLabel?: string | null
): Promise<InventoryItem> {
  if (!cityId) {
    throw new Error(
      "Impossible d'ajouter le butin : City ID manquant"
    )
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    "create_inventory_loot",
    {
      p_city_id:
        cityId,

      p_item_key:
        itemKey,

      p_payload:
        normalizeLootPayload(
          payload
        ),

      p_source_label:
        sourceLabel ?? null,
    }
  )

  if (error) {
    throw error
  }

  const item =
    data as InventoryItem

  return {
    ...item,

    payload:
      normalizeInventoryPayload(
        item.payload
      ),
  }
}

export async function getCitySpeedupTargets(
  cityId: string
): Promise<SpeedupTarget[]> {
  if (!cityId) {
    throw new Error(
      "Impossible de charger les accélérations : City ID manquant"
    )
  }

  const now =
    new Date().toISOString()

  const [
    buildingsResult,
    recruitmentsResult,
    researchesResult,
  ] = await Promise.all([
    supabase
      .from("buildings")
      .select(
        `
          id,
          type,
          level,
          target_level,
          is_upgrading,
          upgrade_finish
        `
      )
      .eq(
        "city_id",
        cityId
      )
      .eq(
        "is_upgrading",
        true
      )
      .gt(
        "upgrade_finish",
        now
      ),

    supabase
      .from(
        "city_recruitments"
      )
      .select(
        `
          id,
          troop_key,
          quantity,
          status,
          finish_at
        `
      )
      .eq(
        "city_id",
        cityId
      )
      .eq(
        "status",
        "recruiting"
      )
      .gt(
        "finish_at",
        now
      ),

    supabase
      .from(
        "city_researches"
      )
      .select(
        `
          id,
          research_key,
          status,
          finish_at
        `
      )
      .eq(
        "city_id",
        cityId
      )
      .eq(
        "status",
        "researching"
      )
      .gt(
        "finish_at",
        now
      ),
  ])

  const firstError =
    buildingsResult.error ??
    recruitmentsResult.error ??
    researchesResult.error

  if (firstError) {
    throw firstError
  }

  const targets: SpeedupTarget[] =
    []

  for (
    const building of
      buildingsResult.data ?? []
  ) {
    if (
      !building.upgrade_finish
    ) {
      continue
    }

    targets.push({
      id:
        building.id,

      target_type:
        "construction",

      key:
        building.type,

      label:
        getSpeedupTargetLabel(
          "construction",
          building.type,
          `niveau ${building.level} → ${building.target_level}`
        ),

      finish_at:
        building.upgrade_finish,
    })
  }

  for (
    const recruitment of
      recruitmentsResult.data ??
      []
  ) {
    if (
      !recruitment.finish_at
    ) {
      continue
    }

    targets.push({
      id:
        recruitment.id,

      target_type:
        "recruitment",

      key:
        recruitment.troop_key,

      label:
        getSpeedupTargetLabel(
          "recruitment",
          recruitment.troop_key,
          `x${recruitment.quantity}`
        ),

      finish_at:
        recruitment.finish_at,
    })
  }

  for (
    const research of
      researchesResult.data ??
      []
  ) {
    if (
      !research.finish_at
    ) {
      continue
    }

    targets.push({
      id:
        research.id,

      target_type:
        "research",

      key:
        research.research_key,

      label:
        getSpeedupTargetLabel(
          "research",
          research.research_key
        ),

      finish_at:
        research.finish_at,
    })
  }

  return targets.sort(
    (left, right) =>
      new Date(
        left.finish_at
      ).getTime() -
      new Date(
        right.finish_at
      ).getTime()
  )
}

export async function useInventorySpeedup(
  inventoryItemId: string,
  targetType: SpeedupTargetType,
  targetId: string
): Promise<UseInventorySpeedupResult> {
  if (
    !inventoryItemId ||
    !targetId
  ) {
    throw new Error(
      "Impossible d'utiliser cet accélérateur : cible manquante"
    )
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    "use_inventory_speedup",
    {
      p_inventory_id:
        inventoryItemId,

      p_target_type:
        targetType,

      p_target_id:
        targetId,
    }
  )

  if (error) {
    throw error
  }

  const result =
    data as Partial<UseInventorySpeedupResult> | null

  return {
    target_type:
      (
        result?.target_type ??
        targetType
      ) as SpeedupTargetType,

    target_id:
      String(
        result?.target_id ??
        targetId
      ),

    seconds_requested:
      normalizePositiveInteger(
        result?.seconds_requested
      ),

    seconds_applied:
      normalizePositiveInteger(
        result?.seconds_applied
      ),

    remaining_seconds:
      normalizePositiveInteger(
        result?.remaining_seconds
      ),

    completed:
      Boolean(
        result?.completed
      ),

    new_finish_at:
      String(
        result?.new_finish_at ??
        new Date().toISOString()
      ),

    inventory_deleted:
      Boolean(
        result?.inventory_deleted
      ),

    inventory_quantity:
      normalizePositiveInteger(
        result?.inventory_quantity
      ),
  }
}
