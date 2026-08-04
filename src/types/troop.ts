import type {
  ResearchType,
} from "./research"

export type TroopType =
  | "henchman_1"
  | "henchman_2"
  | "henchman_3"
  | "lieutenant_1"

export type TroopCost = {
  money: number
  equipment: number
  influence: number
}

export type TroopStats = {
  attack: number
  defense: number
  health: number
}

export type TroopDefinition = {
  type: TroopType
  name: string
  description: string
  icon: string

  securityLevelRequired: number
  laboratoryLevelRequired: number
  researchRequired: ResearchType | null

  recruitmentTimeSeconds: number
  cost: TroopCost
  stats: TroopStats
}

export type CityTroop = {
  id: string
  city_id: string
  troop_key: TroopType
  quantity: number
}