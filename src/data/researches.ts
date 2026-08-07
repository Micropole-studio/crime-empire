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

  /*
   * =====================================================
   * AFFAIRES CLANDESTINES
   * =====================================================
   */

  underground_accounting_1: {
    type: "underground_accounting_1",
    category: "economy",
    name: "Comptabilité parallèle I",
    description:
      "Met en place une comptabilité clandestine capable d'améliorer les revenus générés par les affaires de la ville.",
    icon: "💵",
    laboratoryLevelRequired: 1,
    securityLevelRequired: 2,
    prerequisiteResearches: [],
    researchTimeSeconds: 10 * 60,
    cost: {
      money: 2500,
      materials: 500,
      influence: 75,
    },
    unlocks: [
      "+2 % de production d'argent",
    ],
  },

  supplier_network_1: {
    type: "supplier_network_1",
    category: "economy",
    name: "Réseau de fournisseurs I",
    description:
      "Organise un réseau discret de fournisseurs afin d'augmenter l'arrivée de matériaux dans la ville.",
    icon: "🚚",
    laboratoryLevelRequired: 2,
    securityLevelRequired: 2,
    prerequisiteResearches: [
      "underground_accounting_1",
    ],
    researchTimeSeconds: 20 * 60,
    cost: {
      money: 4500,
      materials: 1000,
      influence: 150,
    },
    unlocks: [
      "+2 % de production de matériaux",
    ],
  },

  influence_network_1: {
    type: "influence_network_1",
    category: "economy",
    name: "Réseau d'influence I",
    description:
      "Développe des relais dans les milieux locaux afin d'accroître progressivement l'Influence du réseau.",
    icon: "🕸️",
    laboratoryLevelRequired: 2,
    securityLevelRequired: 3,
    prerequisiteResearches: [
      "underground_accounting_1",
    ],
    researchTimeSeconds: 30 * 60,
    cost: {
      money: 6000,
      materials: 1300,
      influence: 300,
    },
    unlocks: [
      "+2 % de production d'Influence",
    ],
  },

  ghost_workshops_1: {
    type: "ghost_workshops_1",
    category: "economy",
    name: "Ateliers fantômes I",
    description:
      "Installe des chaînes de fabrication discrètes pour produire davantage d'équipements sans attirer l'attention.",
    icon: "🧰",
    laboratoryLevelRequired: 3,
    securityLevelRequired: 4,
    prerequisiteResearches: [
      "supplier_network_1",
    ],
    researchTimeSeconds: 60 * 60,
    cost: {
      money: 10000,
      materials: 2500,
      influence: 500,
    },
    unlocks: [
      "+2 % de production d'équipements",
    ],
  },

  hidden_warehouses_1: {
    type: "hidden_warehouses_1",
    category: "economy",
    name: "Entrepôts dissimulés I",
    description:
      "Aménage des zones de stockage secrètes pour conserver davantage de ressources à l'abri des regards.",
    icon: "🏚️",
    laboratoryLevelRequired: 4,
    securityLevelRequired: 5,
    prerequisiteResearches: [
      "supplier_network_1",
      "influence_network_1",
    ],
    researchTimeSeconds: 2 * 60 * 60,
    cost: {
      money: 18000,
      materials: 5000,
      influence: 1000,
    },
    unlocks: [
      "+5 % aux capacités de stockage",
    ],
  },

  /*
   * =====================================================
   * RÉSEAU & TERRITOIRE
   * =====================================================
   */

  clandestine_routes_1: {
    type: "clandestine_routes_1",
    category: "organization",
    name: "Itinéraires clandestins I",
    description:
      "Identifie des passages plus rapides et plus discrets pour réduire la durée des opérations.",
    icon: "🛣️",
    laboratoryLevelRequired: 2,
    securityLevelRequired: 3,
    prerequisiteResearches: [],
    researchTimeSeconds: 20 * 60,
    cost: {
      money: 4000,
      materials: 800,
      influence: 150,
    },
    unlocks: [
      "-2 % sur la durée des missions",
    ],
  },

  loot_organization_1: {
    type: "loot_organization_1",
    category: "organization",
    name: "Organisation du butin I",
    description:
      "Améliore la préparation des équipes afin de récupérer davantage de ressources pendant les missions.",
    icon: "🎒",
    laboratoryLevelRequired: 2,
    securityLevelRequired: 3,
    prerequisiteResearches: [],
    researchTimeSeconds: 25 * 60,
    cost: {
      money: 4500,
      materials: 900,
      influence: 200,
    },
    unlocks: [
      "+3 % aux récompenses des missions",
    ],
  },

  experienced_teams_1: {
    type: "experienced_teams_1",
    category: "organization",
    name: "Équipes expérimentées I",
    description:
      "Apprend aux équipes à transmettre leurs méthodes au commandant après chaque opération réussie.",
    icon: "🎖️",
    laboratoryLevelRequired: 3,
    securityLevelRequired: 4,
    prerequisiteResearches: [
      "clandestine_routes_1",
      "loot_organization_1",
    ],
    researchTimeSeconds: 60 * 60,
    cost: {
      money: 9000,
      materials: 2000,
      influence: 450,
    },
    unlocks: [
      "+10 % d'XP de commandant obtenue en mission",
    ],
  },

  clandestine_routes_2: {
    type: "clandestine_routes_2",
    category: "organization",
    name: "Itinéraires clandestins II",
    description:
      "Étend le réseau de passages sécurisés pour accélérer encore davantage les opérations.",
    icon: "🗺️",
    laboratoryLevelRequired: 4,
    securityLevelRequired: 5,
    prerequisiteResearches: [
      "clandestine_routes_1",
    ],
    researchTimeSeconds: 90 * 60,
    cost: {
      money: 15000,
      materials: 3500,
      influence: 750,
    },
    unlocks: [
      "-3 % supplémentaires sur la durée des missions",
    ],
  },

  loot_organization_2: {
    type: "loot_organization_2",
    category: "organization",
    name: "Organisation du butin II",
    description:
      "Professionnalise la récupération, le tri et le transport du butin obtenu pendant les opérations.",
    icon: "💼",
    laboratoryLevelRequired: 5,
    securityLevelRequired: 6,
    prerequisiteResearches: [
      "loot_organization_1",
      "experienced_teams_1",
    ],
    researchTimeSeconds: 2 * 60 * 60,
    cost: {
      money: 22000,
      materials: 5500,
      influence: 1200,
    },
    unlocks: [
      "+5 % supplémentaires aux récompenses des missions",
    ],
  },

}
