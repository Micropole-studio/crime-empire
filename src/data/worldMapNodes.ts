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
      mapAssetSrc: "/buildings/villa3.png",
      mapAssetAlt: "Villa principale de votre empire",
      mapAssetWidth: 16,

      x: 23,
      y: 62,
      hotspotWidth: 21,
      hotspotHeight: 18,
      hotspotRotation: -4,

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
      mapAssetSrc: "/buildings/villa.png",
      mapAssetAlt: "Villa fortifiée de Port Sombre",
      mapAssetWidth: 14,

      x: 66,
      y: 17,
      hotspotWidth: 19,
      hotspotHeight: 15,
      hotspotRotation: 3,

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
      imageSrc: "/world/locations/black-market-cover.webp",
      imageAlt: "Marché noir clandestin éclairé aux néons",
      mapAssetSrc: "/buildings/hideout.png",
      mapAssetAlt: "Planque clandestine du Marché noir",
      mapAssetWidth: 12,

      x: 18,
      y: 39,
      hotspotWidth: 19,
      hotspotHeight: 17,
      hotspotRotation: -4,

      level: 1,
      recommendedPower: 220,

      resourceType:
        "money",

      travelSeconds: 60,
      cooldownHours: 6,

      rewards: {
        moneyGuaranteed: 1000,
        moneyBonusMax: 500,
        commanderXp: 40,
        specialDrop: {
          itemKey: "money_bag",
          name: "Sac de billets",
          icon: "💼",
          chancePercent: 8,
          moneyMin: 700,
          moneyMax: 1200,
        },
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
      imageSrc: "/world/locations/construction-site-cover.webp",
      imageAlt: "Chantier clandestin surveillé au crépuscule",
      mapAssetSrc: "/buildings/factory.png",
      mapAssetAlt: "Installation industrielle du Chantier clandestin",
      mapAssetWidth: 13,

      x: 43,
      y: 61,
      hotspotWidth: 20,
      hotspotHeight: 17,
      hotspotRotation: -2,

      level: 2,
      recommendedPower: 360,

      resourceType:
        "materials",

      travelSeconds: 120,
      cooldownHours: 8,

      rewards: {
        materialsGuaranteed: 30,
        materialsBonusMax: 15,
        moneyGuaranteed: 500,
        moneyBonusMax: 300,
        commanderXp: 65,
        specialDrop: {
          itemKey: "materials_crate",
          name: "Caisse de matériaux",
          icon: "📦",
          chancePercent: 7,
          materialsMin: 20,
          materialsMax: 35,
        },
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
      imageSrc: "/world/locations/weapons-depot-cover.webp",
      imageAlt: "Dépôt d’armes fortifié de nuit",
      mapAssetSrc: "/buildings/wall.png",
      mapAssetAlt: "Complexe de sécurité du Dépôt d’armes",
      mapAssetWidth: 13,

      x: 82,
      y: 49,
      hotspotWidth: 18,
      hotspotHeight: 17,
      hotspotRotation: 4,

      level: 3,
      recommendedPower: 560,

      resourceType:
        "equipment",

      travelSeconds: 180,
      cooldownHours: 12,

      rewards: {
        materialsGuaranteed: 25,
        materialsBonusMax: 10,
        equipmentGuaranteed: 6,
        equipmentBonusMax: 4,
        commanderXp: 90,
        specialDrop: {
          itemKey: "equipment_case",
          name: "Lot d'équipements",
          icon: "🧰",
          chancePercent: 6,
          equipmentMin: 4,
          equipmentMax: 7,
        },
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
      imageSrc: "/world/locations/district-network-cover.webp",
      imageAlt: "Quartier criminel animé par les néons",
      mapAssetSrc: "/buildings/syndicate.png",
      mapAssetAlt: "QG du Réseau des quartiers",
      mapAssetWidth: 12,

      x: 50,
      y: 45,
      hotspotWidth: 20,
      hotspotHeight: 17,
      hotspotRotation: 0,

      level: 4,
      recommendedPower: 780,

      resourceType:
        "influence",

      travelSeconds: 300,
      cooldownHours: 24,

      rewards: {
        moneyGuaranteed: 2000,
        moneyBonusMax: 1000,
        influenceGuaranteed: 14,
        influenceBonusMax: 10,
        commanderXp: 140,
        specialDrop: {
          itemKey: "influence_files",
          name: "Dossiers compromettants",
          icon: "🗂️",
          chancePercent: 5,
          influenceMin: 6,
          influenceMax: 10,
        },
      },
    },
  ]
}
