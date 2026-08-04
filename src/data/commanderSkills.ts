import type {
  CommanderSkillKey,
  CommanderSkills,
} from "../types/commander"

export type CommanderSkillDefinition = {
  key: CommanderSkillKey
  name: string
  branch: "military" | "logistics" | "economy"
  icon: string
  description: string
  bonusPerLevel: number
  bonusUnit: "%"
  maximumLevel: number
  effectLabel: string
  implementationNote: string
}

export const COMMANDER_SKILLS: Record<
  CommanderSkillKey,
  CommanderSkillDefinition
> = {
  military_power: {
    key: "military_power",
    name: "Autorité militaire",
    branch: "military",
    icon: "⚔️",
    description:
      "Renforce l'efficacité générale des troupes placées sous le commandement du joueur.",
    bonusPerLevel: 2,
    bonusUnit: "%",
    maximumLevel: 5,
    effectLabel:
      "Puissance militaire",
    implementationNote:
      "Bonus actif dans le calcul de la puissance militaire. Il sera également repris par le futur moteur de combat.",
  },

  operation_logistics: {
    key: "operation_logistics",
    name: "Logistique des opérations",
    branch: "logistics",
    icon: "🧭",
    description:
      "Améliore l'organisation des déplacements et des opérations extérieures.",
    bonusPerLevel: 1,
    bonusUnit: "%",
    maximumLevel: 5,
    effectLabel:
      "Réduction du temps des missions",
    implementationNote:
      "Bonus actif sur la durée des nouvelles missions lancées.",
  },

  underground_management: {
    key: "underground_management",
    name: "Gestion clandestine",
    branch: "economy",
    icon: "📈",
    description:
      "Optimise les réseaux financiers et la circulation de l'argent dans la ville.",
    bonusPerLevel: 1,
    bonusUnit: "%",
    maximumLevel: 5,
    effectLabel:
      "Production d'argent",
    implementationNote:
      "Bonus actif sur la production d’argent de la ville.",
  },
}

export const COMMANDER_SKILL_LIST =
  Object.values(COMMANDER_SKILLS)

export function getCommanderSkillLevel(
  skills: CommanderSkills,
  skillKey: CommanderSkillKey
) {
  return Math.max(
    0,
    Number(
      skills[skillKey]
    ) || 0
  )
}

export function getCommanderSkillBonus(
  skills: CommanderSkills,
  skillKey: CommanderSkillKey
) {
  const definition =
    COMMANDER_SKILLS[
      skillKey
    ]

  return (
    getCommanderSkillLevel(
      skills,
      skillKey
    ) *
    definition.bonusPerLevel
  )
}

export function createEmptyCommanderSkills(
  playerId: string
): CommanderSkills {
  const now =
    new Date().toISOString()

  return {
    player_id: playerId,
    military_power: 0,
    operation_logistics: 0,
    underground_management: 0,
    created_at: now,
    updated_at: now,
  }
}
