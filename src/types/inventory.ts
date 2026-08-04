export type InventoryItemType =
  | "loot"
  | "boost"
  | "object"

export type SpeedupScope =
  | "construction"
  | "recruitment"
  | "research"
  | "universal"

export type SpeedupTargetType =
  | "construction"
  | "recruitment"
  | "research"

export type LootPayload = {
  money: number
  materials: number
  influence: number
  equipment: number
}

export type InventoryPayload =
  Partial<LootPayload> & {
    accelerator_scope?: SpeedupScope
    seconds?: number
    commander_xp?: number
  }

export type InventoryItem = {
  id: string
  city_id: string
  item_key: string
  item_type: InventoryItemType
  quantity: number
  payload: InventoryPayload
  source_label: string | null
  created_at: string
  updated_at: string
}

export type OpenInventoryLootResult = {
  added: LootPayload
  remaining: LootPayload
  deleted: boolean
  city?: unknown
}

export type SpeedupTarget = {
  id: string
  target_type: SpeedupTargetType
  key: string
  label: string
  finish_at: string
  details?: string | null
}

export type UseInventorySpeedupResult = {
  target_type: SpeedupTargetType
  target_id: string
  seconds_requested: number
  seconds_applied: number
  remaining_seconds: number
  completed: boolean
  new_finish_at: string
  inventory_deleted: boolean
  inventory_quantity: number
}
