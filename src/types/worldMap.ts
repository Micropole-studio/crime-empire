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

export type WorldSpecialDropDefinition = {
  itemKey: string
  name: string
  icon: string
  chancePercent: number

  moneyMin?: number
  moneyMax?: number
  materialsMin?: number
  materialsMax?: number
  equipmentMin?: number
  equipmentMax?: number
  influenceMin?: number
  influenceMax?: number
}

export type WorldRewardRange = {
  /*
   * Nouveau modèle World Map : une part garantie + un bonus aléatoire.
   * Les anciens champs Min/Max restent acceptés pour compatibilité avec
   * une opération déjà enregistrée par une version précédente.
   */
  moneyGuaranteed?: number
  moneyBonusMax?: number
  materialsGuaranteed?: number
  materialsBonusMax?: number
  equipmentGuaranteed?: number
  equipmentBonusMax?: number
  influenceGuaranteed?: number
  influenceBonusMax?: number

  moneyMin?: number
  moneyMax?: number
  materialsMin?: number
  materialsMax?: number
  equipmentMin?: number
  equipmentMax?: number
  influenceMin?: number
  influenceMax?: number

  commanderXp?: number
  specialDrop?: WorldSpecialDropDefinition
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
