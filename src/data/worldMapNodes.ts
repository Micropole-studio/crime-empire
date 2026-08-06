import type {
  WorldNode,
} from "../types/worldMap"

type CreateWorldNodesOptions = {
  currentCityName: string
  currentVillaLevel: number
  commanderLevel: number
}

export function createWorldNodes({
  currentCityName,
  currentVillaLevel,
  commanderLevel,
}: CreateWorldNodesOptions): WorldNode[] {
  return [
    {
      id: "current-player-city",
      key: "current_player_city",
      type: "player_city",

      cityKind: "current",

      name:
        currentCityName ||
        "Ma ville",

      description:
        "Le cœur de ton empire criminel. C'est ici que sont gérés tes bâtiments, tes ressources et tes troupes.",

      icon: "🏙️",

      x: 31,
      y: 69,

      level:
        Math.max(
          0,
          currentVillaLevel
        ),

      recommendedPower:
        Math.max(
          100,
          commanderLevel *
            100
        ),
    },

    {
      id: "rival-player-city",
      key: "rival_player_city",
      type: "player_city",

      cityKind: "rival",

      name:
        "Port Sombre",

      description:
        "Une ville rivale contrôlée par un autre empire. Elle servira de première cible PvP lorsque le combat entre joueurs sera activé.",

      icon: "🌆",

      x: 73,
      y: 27,

      level: 4,

      recommendedPower: 1250,
    },

    {
      id: "black-market",
      key: "black_market",
      type: "bot_territory",

      name:
        "Marché noir",

      description:
        "Un réseau de contrebande peu protégé. Une cible idéale pour récupérer rapidement de l'argent.",

      icon: "💵",

      x: 46,
      y: 53,

      level: 1,
      recommendedPower: 220,

      resourceType:
        "money",

      travelSeconds: 60,
      cooldownHours: 6,

      rewards: {
        moneyMin: 800,
        moneyMax: 1500,
        commanderXp: 40,
      },
    },

    {
      id: "illegal-construction-site",
      key: "illegal_construction_site",
      type: "bot_territory",

      name:
        "Chantier clandestin",

      description:
        "Des matériaux sont stockés sur ce chantier surveillé par une petite équipe armée.",

      icon: "🧱",

      x: 61,
      y: 72,

      level: 2,
      recommendedPower: 360,

      resourceType:
        "materials",

      travelSeconds: 120,
      cooldownHours: 8,

      rewards: {
        materialsMin: 25,
        materialsMax: 45,
        moneyMin: 400,
        moneyMax: 800,
        commanderXp: 65,
      },
    },

    {
      id: "weapons-depot",
      key: "weapons_depot",
      type: "bot_territory",

      name:
        "Dépôt d'armes",

      description:
        "Un entrepôt fortifié contenant des équipements destinés aux gangs de la région.",

      icon: "🧰",

      x: 81,
      y: 53,

      level: 3,
      recommendedPower: 560,

      resourceType:
        "equipment",

      travelSeconds: 180,
      cooldownHours: 12,

      rewards: {
        materialsMin: 20,
        materialsMax: 35,
        equipmentMin: 5,
        equipmentMax: 10,
        commanderXp: 90,
      },
    },

    {
      id: "district-network",
      key: "district_network",
      type: "bot_territory",

      name:
        "Réseau des quartiers",

      description:
        "Un réseau criminel implanté dans plusieurs quartiers. Le contrôler rapportera principalement de l'Influence.",

      icon: "⭐",

      x: 52,
      y: 29,

      level: 4,
      recommendedPower: 780,

      resourceType:
        "influence",

      travelSeconds: 300,
      cooldownHours: 24,

      rewards: {
        moneyMin: 1800,
        moneyMax: 3000,
        influenceMin: 12,
        influenceMax: 24,
        commanderXp: 140,
      },
    },
  ]
}
