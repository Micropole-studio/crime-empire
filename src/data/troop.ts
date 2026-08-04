import type {
  TroopDefinition,
  TroopType,
} from "../types/troop"

export const TROOPS: Record<
  TroopType,
  TroopDefinition
> = {
  henchman_1: {
    type: "henchman_1",
    name: "Homme de main I",
    description:
      "Unité criminelle de base, peu coûteuse et rapidement recrutée.",

    icon: "🕴️",

    securityLevelRequired: 1,
    laboratoryLevelRequired: 0,
    researchRequired: null,

    recruitmentTimeSeconds:
      60,

    cost: {
      money: 100,
      equipment: 0,
      influence: 0,
    },

    stats: {
      attack: 10,
      defense: 8,
      health: 100,
    },
  },

  henchman_2: {
    type: "henchman_2",
    name: "Homme de main II",
    description:
      "Homme de main mieux entraîné et équipé pour les premières opérations importantes.",

    icon: "🕴️",

    securityLevelRequired: 3,
    laboratoryLevelRequired: 2,
    researchRequired:
      "reinforced_training",

    recruitmentTimeSeconds:
      3 * 60,

    cost: {
      money: 250,
      equipment: 2,
      influence: 0,
    },

    stats: {
      attack: 18,
      defense: 14,
      health: 130,
    },
  },

  henchman_3: {
    type: "henchman_3",
    name: "Homme de main III",
    description:
      "Combattant expérimenté bénéficiant d'un entraînement et d'un équipement avancés.",

    icon: "🕴️",

    securityLevelRequired: 7,
    laboratoryLevelRequired: 5,
    researchRequired:
      "henchman_doctrine",

    recruitmentTimeSeconds:
      6 * 60,

    cost: {
      money: 600,
      equipment: 5,
      influence: 0,
    },

    stats: {
      attack: 30,
      defense: 24,
      health: 180,
    },
  },

  lieutenant_1: {
    type: "lieutenant_1",
    name: "Lieutenant I",
    description:
      "Chef d'escouade capable de renforcer les hommes de main qui l'accompagnent.",

    icon: "🎩",

    securityLevelRequired: 10,
    laboratoryLevelRequired: 7,
    researchRequired:
      "criminal_command",

    recruitmentTimeSeconds:
      10 * 60,

    cost: {
      money: 1500,
      equipment: 12,
      influence: 5,
    },

    stats: {
      attack: 45,
      defense: 38,
      health: 260,
    },
  },
}