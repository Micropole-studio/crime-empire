export type CommanderSkillKey =
  | "military_power"
  | "operation_logistics"
  | "underground_management"

export type CommanderSkills = {
  player_id: string
  military_power: number
  operation_logistics: number
  underground_management: number
  created_at: string
  updated_at: string
}

export type CommanderPlayer = {
  id: string
  username?: string | null
  email?: string | null
  commander_level?: number | null
  commander_xp?: number | null
  commander_skill_points?: number | null
}

export type UpgradeCommanderSkillResult = {
  player: CommanderPlayer
  skills: CommanderSkills
  upgraded_skill: CommanderSkillKey
}

export type CommanderTroopPowerDetail = {
  troop_key: string
  quantity: number
  unit_power: number
  power: number
}

export type CommanderBuildingPowerDetail = {
  building_type: string
  levels_total: number
  coefficient: number
  power: number
}

export type CommanderResearchPowerDetail = {
  category: string
  completed_count: number
  power: number
}

export type CommanderPowerBreakdown = {
  player_id: string
  total_power: number

  troops: {
    power: number
    base_power: number
    total_units: number
    bonus_percent: number
    passive_commander_bonus_percent: number
    military_skill_bonus_percent: number
    details: CommanderTroopPowerDetail[]
  }

  buildings: {
    power: number
    details: CommanderBuildingPowerDetail[]
  }

  researches: {
    power: number
    completed_count: number
    details: CommanderResearchPowerDetail[]
  }

  commander: {
    power: number
    level: number
    spent_skill_points: number
    military_power_level: number
    operation_logistics_level: number
    underground_management_level: number
  }
}
