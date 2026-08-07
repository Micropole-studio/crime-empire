import type {
  ResearchCategory,
  ResearchType,
} from "../types/research"

export type ResearchDefinition = {
  type: ResearchType
  category: ResearchCategory
  name: string
  description: string
  icon: string

  laboratoryLevelRequired: number
  securityLevelRequired: number

  prerequisiteResearches: ResearchType[]

  researchTimeSeconds: number

  cost: {
    money: number
    materials: number
    influence: number
  }

  unlocks: string[]
}

export const RESEARCHES: Record<
  ResearchType,
  ResearchDefinition
> = {
  reinforced_training: {
    type: "reinforced_training",
    category: "military",
    name: "Entraînement renforcé",
    description:
      "Développe de nouvelles méthodes d'entraînement pour améliorer les hommes de main.",
    icon: "🥊",
    laboratoryLevelRequired: 2,
    securityLevelRequired: 3,
    prerequisiteResearches: [],
    researchTimeSeconds: 15 * 60,
    cost: {
      money: 3000,
      materials: 750,
      influence: 100,
    },
    unlocks: ["Homme de main II"],
  },

  recruitment_capacity_1: {
    type: "recruitment_capacity_1",
    category: "military",
    name: "Organisation des recrues I",
    description:
      "Améliore l'organisation du poste de Sécurité afin de former davantage de recrues en une seule commande.",
    icon: "📋",
    laboratoryLevelRequired: 2,
    securityLevelRequired: 3,
    prerequisiteResearches: [],
    researchTimeSeconds: 20 * 60,
    cost: {
      money: 3500,
      materials: 850,
      influence: 120,
    },
    unlocks: ["+5 troupes par commande de recrutement"],
  },

  recruitment_speed_1: {
    type: "recruitment_speed_1",
    category: "military",
    name: "Formation accélérée I",
    description:
      "Optimise les séances d'entraînement afin de réduire le temps nécessaire au recrutement des troupes.",
    icon: "⚡",
    laboratoryLevelRequired: 3,
    securityLevelRequired: 4,
    prerequisiteResearches: [
      "recruitment_capacity_1",
    ],
    researchTimeSeconds: 30 * 60,
    cost: {
      money: 6500,
      materials: 1400,
      influence: 250,
    },
    unlocks: ["+5 % de vitesse de recrutement"],
  },

  recruitment_capacity_2: {
    type: "recruitment_capacity_2",
    category: "military",
    name: "Organisation des recrues II",
    description:
      "Développe une structure de recrutement plus importante pour lancer de plus grandes commandes.",
    icon: "🗂️",
    laboratoryLevelRequired: 5,
    securityLevelRequired: 6,
    prerequisiteResearches: [
      "recruitment_capacity_1",
    ],
    researchTimeSeconds: 90 * 60,
    cost: {
      money: 18000,
      materials: 4200,
      influence: 800,
    },
    unlocks: ["+10 troupes supplémentaires par commande"],
  },

  henchman_doctrine: {
    type: "henchman_doctrine",
    category: "military",
    name: "Doctrine des hommes de main",
    description:
      "Améliore l'organisation, l'équipement et l'efficacité des hommes de main expérimentés.",
    icon: "📖",
    laboratoryLevelRequired: 5,
    securityLevelRequired: 7,
    prerequisiteResearches: [
      "reinforced_training",
    ],
    researchTimeSeconds: 2 * 60 * 60,
    cost: {
      money: 20000,
      materials: 5000,
      influence: 1000,
    },
    unlocks: ["Homme de main III"],
  },

  second_recruitment_queue: {
    type: "second_recruitment_queue",
    category: "military",
    name: "Centre d'entraînement parallèle",
    description:
      "Permet au poste de Sécurité d'entraîner deux groupes de recrues simultanément.",
    icon: "⏩",
    laboratoryLevelRequired: 6,
    securityLevelRequired: 7,
    prerequisiteResearches: [
      "recruitment_capacity_2",
      "recruitment_speed_1",
    ],
    researchTimeSeconds: 4 * 60 * 60,
    cost: {
      money: 35000,
      materials: 9000,
      influence: 1800,
    },
    unlocks: ["Deuxième file de recrutement"],
  },

  deployment_capacity_1: {
    type: "deployment_capacity_1",
    category: "military",
    name: "Logistique de déploiement I",
    description:
      "Met en place une première organisation logistique pour mobiliser davantage d'hommes lors des opérations extérieures.",
    icon: "🎯",
    laboratoryLevelRequired: 3,
    securityLevelRequired: 4,
    prerequisiteResearches: [
      "reinforced_training",
    ],
    researchTimeSeconds: 45 * 60,
    cost: {
      money: 7500,
      materials: 1600,
      influence: 300,
    },
    unlocks: [
      "Bonus total de déploiement : +20 points",
    ],
  },

  deployment_capacity_2: {
    type: "deployment_capacity_2",
    category: "military",
    name: "Logistique de déploiement II",
    description:
      "Structure les convois, les équipes et la chaîne de commandement afin d'augmenter encore la taille des forces mobilisables.",
    icon: "🧭",
    laboratoryLevelRequired: 5,
    securityLevelRequired: 6,
    prerequisiteResearches: [
      "deployment_capacity_1",
    ],
    researchTimeSeconds: 2 * 60 * 60,
    cost: {
      money: 25000,
      materials: 5500,
      influence: 1100,
    },
    unlocks: [
      "Bonus total de déploiement : +40 points",
    ],
  },

  deployment_capacity_3: {
    type: "deployment_capacity_3",
    category: "military",
    name: "Logistique de déploiement III",
    description:
      "Développe une organisation opérationnelle avancée capable de coordonner des forces beaucoup plus importantes sur le terrain.",
    icon: "🛰️",
    laboratoryLevelRequired: 7,
    securityLevelRequired: 8,
    prerequisiteResearches: [
      "deployment_capacity_2",
    ],
    researchTimeSeconds: 5 * 60 * 60,
    cost: {
      money: 60000,
      materials: 13000,
      influence: 3000,
    },
    unlocks: [
      "Bonus total de déploiement : +60 points",
    ],
  },

  criminal_command: {
    type: "criminal_command",
    category: "military",
    name: "Commandement criminel",
    description:
      "Forme des cadres capables de commander et de renforcer une escouade.",
    icon: "♟️",
    laboratoryLevelRequired: 7,
    securityLevelRequired: 10,
    prerequisiteResearches: [
      "henchman_doctrine",
    ],
    researchTimeSeconds: 8 * 60 * 60,
    cost: {
      money: 75000,
      materials: 16000,
      influence: 4000,
    },
    unlocks: [
      "Lieutenant I",
      "Commandement d'escouade",
    ],
  },
}
