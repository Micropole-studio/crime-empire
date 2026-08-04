import type {
  MissionDefinition,
  MissionType,
} from "../types/mission"

export const MISSIONS: Record<
  MissionType,
  MissionDefinition
> = {
  market_collection: {
    key: "market_collection",
    name: "Racket du marché",
    description:
      "Envoyez quelques hommes récupérer les contributions imposées aux commerçants du quartier.",

    icon: "💼",
    category: "collection",

    baseDurationSeconds: 60,

    requiredSecurityLevel: 1,
    minimumTroops: 2,

    allowedTroops: [
      "henchman_1",
    ],

    rewardItemKey:
      "money_bag",

    rewardRange: {
      moneyMin: 500,
      moneyMax: 1000,

      materialsMin: 0,
      materialsMax: 0,

      influenceMin: 0,
      influenceMax: 0,

      equipmentMin: 0,
      equipmentMax: 0,
    },

    commanderXp: 50,
    dailyLimit: 2,
  },

  construction_recovery: {
    key: "construction_recovery",
    name: "Récupération de matériel",
    description:
      "Une équipe part récupérer des matériaux et des équipements sur un chantier peu surveillé.",

    icon: "🏗️",
    category: "collection",

    baseDurationSeconds: 120,

    requiredSecurityLevel: 1,
    minimumTroops: 3,

    allowedTroops: [
      "henchman_1",
    ],

    rewardItemKey:
      "material_crate",

    rewardRange: {
      moneyMin: 0,
      moneyMax: 0,

      materialsMin: 20,
      materialsMax: 30,

      influenceMin: 0,
      influenceMax: 0,

      equipmentMin: 2,
      equipmentMax: 5,
    },

    commanderXp: 80,
    dailyLimit: 2,
  },
}

export const MISSION_LIST =
  Object.values(MISSIONS)

export function getMissionDefinition(
  missionType: MissionType
) {
  return MISSIONS[missionType]
}

export function getMissionDurationSeconds(
  missionType: MissionType
) {
  const definition =
    getMissionDefinition(
      missionType
    )

  return Math.max(
    1,
    definition.baseDurationSeconds
  )
}
