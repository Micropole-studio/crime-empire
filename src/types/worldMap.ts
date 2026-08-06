export type WorldNodeType =
  | "player_city"
  | "bot_territory"

export type WorldCityKind =
  | "current"
  | "rival"

export type WorldResourceType =
  | "money"
  | "materials"
  | "equipment"
  | "influence"

export type WorldRewardRange = {
  moneyMin?: number
  moneyMax?: number

  materialsMin?: number
  materialsMax?: number

  equipmentMin?: number
  equipmentMax?: number

  influenceMin?: number
  influenceMax?: number

  commanderXp?: number
}

export type WorldNode = {
  id: string
  key: string
  type: WorldNodeType

  name: string
  description: string
  icon: string

  x: number
  y: number

  level: number
  recommendedPower: number

  cityKind?: WorldCityKind

  resourceType?:
    WorldResourceType

  rewards?:
    WorldRewardRange

  travelSeconds?: number
  cooldownHours?: number
}
