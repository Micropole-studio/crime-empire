import type {
  LootPayload,
} from "./inventory"

import type {
  TroopType,
} from "./troop"

export type MissionType =
  | "market_collection"
  | "construction_recovery"

export type MissionStatus =
  | "active"
  | "completed"
  | "claimed"

export type MissionCategory =
  | "collection"
  | "operation"
  | "exploration"

export type MissionRewardRange = {
  moneyMin: number
  moneyMax: number
  materialsMin: number
  materialsMax: number
  influenceMin: number
  influenceMax: number
  equipmentMin: number
  equipmentMax: number
}

export type MissionDefinition = {
  key: MissionType
  name: string
  description: string
  icon: string
  category: MissionCategory
  baseDurationSeconds: number
  requiredSecurityLevel: number
  minimumTroops: number
  allowedTroops: TroopType[]
  rewardItemKey: string
  rewardRange: MissionRewardRange
  commanderXp: number
}

export type MissionTroopAssignment = {
  id: string
  mission_id: string
  troop_key: TroopType
  quantity: number
}

export type CityMission = {
  id: string
  city_id: string
  mission_key: MissionType
  status: MissionStatus
  reward_payload: Partial<LootPayload>
  reward_xp: number
  started_at: string
  finish_at: string
  completed_at: string | null
  claimed_at: string | null
  created_at: string
  assigned_troops: MissionTroopAssignment[]
}

export type ClaimMissionResult = {
  mission?: CityMission
  inventory_item?: unknown
  xp_gained: number
  levels_gained: number
  commander_level: number
  commander_xp: number
  xp_to_next_level: number
  commander_skill_points: number
}
