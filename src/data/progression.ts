import type { BuildingType } from "../types/building"

export type ProgressionBuildingType =
  BuildingType

export type ResourceCost = {
  money: number
  materials: number
  influence: number
}

export type BuildingRequirement = {
  building: ProgressionBuildingType
  level: number
  label: string
}

export type BuildingLevelProgression = {
  level: number
  cost: ResourceCost
  constructionTimeSeconds: number

  /*
   * Bonus obtenus lorsque ce niveau
   * est terminé.
   */
  bonuses: string[]

  /*
   * Bâtiments, fonctions ou contenus
   * débloqués.
   */
  unlocks: string[]

  /*
   * Conditions nécessaires pour
   * construire ou améliorer.
   */
  requirements: BuildingRequirement[]
}

export type BuildingProgression = {
  name: string
  maxLevel: number
  levels: Record<
    number,
    BuildingLevelProgression
  >
}

function createLevel(
  level: number,
  cost: ResourceCost,
  constructionTimeSeconds: number,
  bonuses: string[] = [],
  unlocks: string[] = [],
  requirements: BuildingRequirement[] = []
): BuildingLevelProgression {
  return {
    level,
    cost,
    constructionTimeSeconds,
    bonuses,
    unlocks,
    requirements,
  }
}

export const BUILDING_PROGRESSIONS: Record<
  ProgressionBuildingType,
  BuildingProgression
> = {
  // =====================================================
  // VILLA
  // =====================================================

  villa: {
    name: "Villa",
    maxLevel: 10,

    levels: {
      1: createLevel(
        1,
        {
          money: 0,
          materials: 0,
          influence: 0,
        },
        0,
        [
          "Quartier général opérationnel",
          "Vitesse de construction normale",
        ],
        ["Accès à la ville"]
      ),

      2: createLevel(
        2,
        {
          money: 800,
          materials: 200,
          influence: 0,
        },
        3 * 60,
        [
          "Vitesse de construction totale : +3 %",
        ],
        ["Planque constructible"]
      ),

      3: createLevel(
        3,
        {
          money: 1800,
          materials: 450,
          influence: 0,
        },
        5 * 60,
        [
          "Vitesse de construction totale : +6 %",
        ],
        [
          "Garage constructible",
          "Sécurité constructible",
        ]
      ),

      4: createLevel(
        4,
        {
          money: 4000,
          materials: 900,
          influence: 0,
        },
        10 * 60,
        [
          "Vitesse de construction totale : +9 %",
        ],
        ["Syndicat constructible"]
      ),

      5: createLevel(
        5,
        {
          money: 8000,
          materials: 1800,
          influence: 0,
        },
        20 * 60,
        [
          "Vitesse de construction totale : +12 %",
        ],
        [
          "Laboratoire constructible",
          "Usine constructible",
        ]
      ),

      6: createLevel(
        6,
        {
          money: 15000,
          materials: 3200,
          influence: 0,
        },
        40 * 60,
        [
          "Vitesse de construction totale : +15 %",
        ]
      ),

      7: createLevel(
        7,
        {
          money: 28000,
          materials: 5500,
          influence: 0,
        },
        75 * 60,
        [
          "Vitesse de construction totale : +18 %",
        ]
      ),

      8: createLevel(
        8,
        {
          money: 50000,
          materials: 9000,
          influence: 0,
        },
        135 * 60,
        [
          "Vitesse de construction totale : +21 %",
        ]
      ),

      9: createLevel(
        9,
        {
          money: 90000,
          materials: 15000,
          influence: 0,
        },
        4 * 60 * 60,
        [
          "Vitesse de construction totale : +24 %",
        ]
      ),

      10: createLevel(
        10,
        {
          money: 160000,
          materials: 25000,
          influence: 0,
        },
        7 * 60 * 60,
        [
          "Vitesse de construction totale : +27 %",
          "Les autres bâtiments peuvent atteindre le niveau 10",
        ]
      ),
    },
  },

  // =====================================================
  // GARAGE
  // Identifiant interne : workshop
  // =====================================================

  workshop: {
    name: "Garage",
    maxLevel: 10,

    levels: {
      1: createLevel(
        1,
        {
          money: 600,
          materials: 150,
          influence: 0,
        },
        90,
        [
          "Capacité : 1 véhicule",
          "Accès aux missions basiques",
        ],
        [],
        [
          {
            building: "villa",
            level: 3,
            label: "Villa niveau 3",
          },
        ]
      ),

      2: createLevel(
        2,
        {
          money: 1200,
          materials: 300,
          influence: 0,
        },
        4 * 60,
        [
          "+5 % de revenus des véhicules",
        ]
      ),

      3: createLevel(
        3,
        {
          money: 2600,
          materials: 650,
          influence: 0,
        },
        10 * 60,
        ["Capacité : 2 véhicules"],
        [
          "Améliorations mécaniques basiques",
        ]
      ),

      4: createLevel(
        4,
        {
          money: 5200,
          materials: 1200,
          influence: 0,
        },
        20 * 60,
        [
          "+10 % de revenus des véhicules",
        ]
      ),

      5: createLevel(
        5,
        {
          money: 10000,
          materials: 2300,
          influence: 0,
        },
        40 * 60,
        ["Capacité : 3 véhicules"],
        [
          "Amélioration des moteurs",
          "Amélioration des protections",
        ]
      ),

      6: createLevel(
        6,
        {
          money: 18000,
          materials: 4000,
          influence: 0,
        },
        90 * 60,
        [
          "-10 % de temps de réparation",
        ]
      ),

      7: createLevel(
        7,
        {
          money: 32000,
          materials: 7000,
          influence: 0,
        },
        3 * 60 * 60,
        ["Capacité : 4 véhicules"],
        ["Missions de convoi"]
      ),

      8: createLevel(
        8,
        {
          money: 56000,
          materials: 12000,
          influence: 0,
        },
        6 * 60 * 60,
        [
          "+20 % de revenus des véhicules",
        ]
      ),

      9: createLevel(
        9,
        {
          money: 95000,
          materials: 20000,
          influence: 0,
        },
        12 * 60 * 60,
        [
          "Améliorations mécaniques avancées",
        ]
      ),

      10: createLevel(
        10,
        {
          money: 170000,
          materials: 35000,
          influence: 0,
        },
        24 * 60 * 60,
        ["Capacité : 5 véhicules"],
        ["Véhicules haut de gamme"]
      ),
    },
  },

  // =====================================================
  // PLANQUE
  // Identifiant interne : hideout
  // =====================================================

  hideout: {
    name: "Planque",
    maxLevel: 10,

    levels: {
      1: createLevel(
        1,
        {
          money: 500,
          materials: 120,
          influence: 0,
        },
        90,
        [
          "Stockage de ressources débloqué",
        ],
        [],
        [
          {
            building: "villa",
            level: 2,
            label: "Villa niveau 2",
          },
        ]
      ),

      2: createLevel(
        2,
        {
          money: 1000,
          materials: 250,
          influence: 0,
        },
        4 * 60,
        [
          "+20 % de capacité de stockage",
        ]
      ),

      3: createLevel(
        3,
        {
          money: 2200,
          materials: 500,
          influence: 0,
        },
        10 * 60,
        [
          "10 % des ressources sont protégées",
        ]
      ),

      4: createLevel(
        4,
        {
          money: 4500,
          materials: 1000,
          influence: 0,
        },
        20 * 60,
        [
          "+40 % de capacité de stockage",
        ]
      ),

      5: createLevel(
        5,
        {
          money: 9000,
          materials: 2000,
          influence: 0,
        },
        40 * 60,
        [
          "20 % des ressources sont protégées",
        ],
        ["Compartiment sécurisé"]
      ),

      6: createLevel(
        6,
        {
          money: 16000,
          materials: 3600,
          influence: 0,
        },
        90 * 60,
        [
          "+60 % de capacité de stockage",
        ]
      ),

      7: createLevel(
        7,
        {
          money: 28000,
          materials: 6500,
          influence: 0,
        },
        3 * 60 * 60,
        [
          "30 % des ressources sont protégées",
        ]
      ),

      8: createLevel(
        8,
        {
          money: 50000,
          materials: 11000,
          influence: 0,
        },
        6 * 60 * 60,
        [
          "+80 % de capacité de stockage",
        ]
      ),

      9: createLevel(
        9,
        {
          money: 85000,
          materials: 18000,
          influence: 0,
        },
        12 * 60 * 60,
        [
          "35 % des ressources sont protégées",
        ]
      ),

      10: createLevel(
        10,
        {
          money: 150000,
          materials: 30000,
          influence: 0,
        },
        24 * 60 * 60,
        [
          "+100 % de capacité de stockage",
          "40 % des ressources sont protégées",
        ],
        [
          "Réseau de planques secondaires",
        ]
      ),
    },
  },

  // =====================================================
  // SÉCURITÉ
  // Identifiant interne : wall
  // =====================================================

  wall: {
    name: "Sécurité",
    maxLevel: 10,

    levels: {
      1: createLevel(
        1,
        {
          money: 700,
          materials: 200,
          influence: 0,
        },
        2 * 60,
        [
          "Capacité totale : 10 troupes",
          "Recrutement maximum : 5 troupes par commande",
          "Défense locale de la ville",
        ],
        ["Hommes de main"],
        [
          {
            building: "villa",
            level: 3,
            label: "Villa niveau 3",
          },
        ]
      ),

      2: createLevel(
        2,
        {
          money: 1500,
          materials: 400,
          influence: 0,
        },
        5 * 60,
        [
          "Capacité totale : 15 troupes",
          "Recrutement maximum : 7 troupes par commande",
          "Vitesse de recrutement : +2 %",
        ]
      ),

      3: createLevel(
        3,
        {
          money: 3200,
          materials: 800,
          influence: 0,
        },
        15 * 60,
        [
          "Capacité totale : 25 troupes",
          "Recrutement maximum : 10 troupes par commande",
          "Vitesse de recrutement : +4 %",
        ],
        [
          "Tireurs",
          "Attaques contre les autres villes",
        ]
      ),

      4: createLevel(
        4,
        {
          money: 6500,
          materials: 1500,
          influence: 0,
        },
        30 * 60,
        [
          "Capacité totale : 35 troupes",
          "Recrutement maximum : 15 troupes par commande",
          "Vitesse de recrutement : +6 %",
        ]
      ),

      5: createLevel(
        5,
        {
          money: 13000,
          materials: 3000,
          influence: 0,
        },
        60 * 60,
        [
          "Capacité totale : 50 troupes",
          "Recrutement maximum : 20 troupes par commande",
          "Vitesse de recrutement : +8 %",
        ],
        [
          "Lieutenants",
          "Commandement d’escouade",
        ]
      ),

      6: createLevel(
        6,
        {
          money: 23000,
          materials: 5200,
          influence: 0,
        },
        2 * 60 * 60,
        [
          "Capacité totale : 70 troupes",
          "Recrutement maximum : 25 troupes par commande",
          "Vitesse de recrutement : +10 %",
          "+15 % de défense de la ville",
        ]
      ),

      7: createLevel(
        7,
        {
          money: 42000,
          materials: 9000,
          influence: 0,
        },
        4 * 60 * 60,
        [
          "Capacité totale : 95 troupes",
          "Recrutement maximum : 30 troupes par commande",
          "Vitesse de recrutement : +12 %",
        ],
        [
          "Exécuteurs",
          "Deuxième groupe d’attaque",
        ]
      ),

      8: createLevel(
        8,
        {
          money: 73000,
          materials: 15000,
          influence: 0,
        },
        8 * 60 * 60,
        [
          "Capacité totale : 125 troupes",
          "Recrutement maximum : 40 troupes par commande",
          "Vitesse de recrutement : +14 %",
        ]
      ),

      9: createLevel(
        9,
        {
          money: 125000,
          materials: 25000,
          influence: 0,
        },
        16 * 60 * 60,
        [
          "Capacité totale : 160 troupes",
          "Recrutement maximum : 50 troupes par commande",
          "Vitesse de recrutement : +16 %",
          "-10 % de pertes après un combat",
        ],
        ["Entraînement avancé"]
      ),

      10: createLevel(
        10,
        {
          money: 220000,
          materials: 42000,
          influence: 0,
        },
        32 * 60 * 60,
        [
          "Capacité totale : 200 troupes",
          "Recrutement maximum : 60 troupes par commande",
          "Vitesse de recrutement : +18 %",
          "Défense avancée de la ville",
        ],
        [
          "Capos",
          "Unités d’élite",
        ]
      ),
    },
  },

  // =====================================================
  // LABORATOIRE
  // =====================================================

  laboratory: {
    name: "Laboratoire",
    maxLevel: 10,

    levels: {
      1: createLevel(
        1,
        {
          money: 1000,
          materials: 300,
          influence: 50,
        },
        5 * 60,
        ["Accès aux recherches"],
        ["Recherches économiques"],
        [
          {
            building: "villa",
            level: 5,
            label: "Villa niveau 5",
          },
        ]
      ),

      2: createLevel(
        2,
        {
          money: 2200,
          materials: 600,
          influence: 100,
        },
        10 * 60,
        [
          "Niveau maximal des recherches : 2",
        ]
      ),

      3: createLevel(
        3,
        {
          money: 5000,
          materials: 1200,
          influence: 250,
        },
        30 * 60,
        [
          "Niveau maximal des recherches : 3",
        ],
        ["Recherches sur les véhicules"]
      ),

      4: createLevel(
        4,
        {
          money: 10000,
          materials: 2500,
          influence: 500,
        },
        60 * 60,
        [
          "Niveau maximal des recherches : 4",
        ],
        ["Recherches de défense"]
      ),

      5: createLevel(
        5,
        {
          money: 20000,
          materials: 5000,
          influence: 1000,
        },
        2 * 60 * 60,
        [
          "Niveau maximal des recherches : 5",
        ],
        [
          "Recherches militaires avancées",
        ]
      ),

      6: createLevel(
        6,
        {
          money: 35000,
          materials: 8500,
          influence: 1800,
        },
        4 * 60 * 60,
        [
          "-10 % de temps de recherche",
        ]
      ),

      7: createLevel(
        7,
        {
          money: 60000,
          materials: 14000,
          influence: 3000,
        },
        8 * 60 * 60,
        [
          "Niveau maximal des recherches : 7",
        ],
        ["Technologies spécialisées"]
      ),

      8: createLevel(
        8,
        {
          money: 100000,
          materials: 22000,
          influence: 5000,
        },
        16 * 60 * 60,
        [
          "Recherches de protection améliorées",
        ],
        [
          "Protection avancée des ressources",
        ]
      ),

      9: createLevel(
        9,
        {
          money: 170000,
          materials: 36000,
          influence: 8000,
        },
        24 * 60 * 60,
        [
          "Recherches économiques avancées",
        ],
        [
          "Bonus avancés de production",
        ]
      ),

      10: createLevel(
        10,
        {
          money: 300000,
          materials: 60000,
          influence: 15000,
        },
        48 * 60 * 60,
        [
          "Niveau maximal des recherches : 10",
          "-20 % de temps de recherche",
        ],
        [
          "Technologies de très haut niveau",
        ]
      ),
    },
  },

  // =====================================================
  // SYNDICAT
  // Identifiant interne : syndicate
  //
  // Produit automatiquement de l'Influence.
  // =====================================================

  syndicate: {
    name: "Syndicat",
    maxLevel: 10,

    levels: {
      1: createLevel(
        1,
        {
          money: 1200,
          materials: 250,
          influence: 0,
        },
        4 * 60,
        [
          "Production d’Influence : 5 par heure",
        ],
        ["Réseau criminel local"],
        [
          {
            building: "villa",
            level: 4,
            label: "Villa niveau 4",
          },
        ]
      ),

      2: createLevel(
        2,
        {
          money: 2500,
          materials: 500,
          influence: 0,
        },
        10 * 60,
        [
          "Production d’Influence : 10 par heure",
        ]
      ),

      3: createLevel(
        3,
        {
          money: 5500,
          materials: 1100,
          influence: 50,
        },
        25 * 60,
        [
          "Production d’Influence : 18 par heure",
        ],
        ["Contrats locaux"]
      ),

      4: createLevel(
        4,
        {
          money: 11000,
          materials: 2200,
          influence: 120,
        },
        50 * 60,
        [
          "Production d’Influence : 30 par heure",
        ]
      ),

      5: createLevel(
        5,
        {
          money: 22000,
          materials: 4500,
          influence: 250,
        },
        2 * 60 * 60,
        [
          "Production d’Influence : 50 par heure",
        ],
        ["Réseau criminel régional"]
      ),

      6: createLevel(
        6,
        {
          money: 40000,
          materials: 8000,
          influence: 500,
        },
        4 * 60 * 60,
        [
          "Production d’Influence : 80 par heure",
        ]
      ),

      7: createLevel(
        7,
        {
          money: 72000,
          materials: 14000,
          influence: 1000,
        },
        8 * 60 * 60,
        [
          "Production d’Influence : 125 par heure",
        ],
        [
          "Réseau de corruption institutionnelle",
        ]
      ),

      8: createLevel(
        8,
        {
          money: 125000,
          materials: 23000,
          influence: 2000,
        },
        16 * 60 * 60,
        [
          "Production d’Influence : 190 par heure",
        ]
      ),

      9: createLevel(
        9,
        {
          money: 210000,
          materials: 38000,
          influence: 4000,
        },
        28 * 60 * 60,
        [
          "Production d’Influence : 280 par heure",
        ],
        ["Pression politique"]
      ),

      10: createLevel(
        10,
        {
          money: 360000,
          materials: 65000,
          influence: 8000,
        },
        48 * 60 * 60,
        [
          "Production d’Influence : 400 par heure",
          "+10 % d’Influence obtenue lors des missions",
        ],
        ["Réseau criminel national"]
      ),
    },
  },

  // =====================================================
  // USINE
  // Identifiant interne : factory
  //
  // Produit les Équipements utilisés
  // pour renforcer les troupes.
  // =====================================================

  factory: {
    name: "Usine",
    maxLevel: 10,

    levels: {
      1: createLevel(
        1,
        {
          money: 1800,
          materials: 500,
          influence: 0,
        },
        5 * 60,
        [
          "Production d’Équipements : 5 par heure",
        ],
        [
          "Équipements basiques",
          "Amélioration des Hommes de main",
        ],
        [
          {
            building: "villa",
            level: 5,
            label: "Villa niveau 5",
          },
        ]
      ),

      2: createLevel(
        2,
        {
          money: 3800,
          materials: 1000,
          influence: 0,
        },
        12 * 60,
        [
          "Production d’Équipements : 10 par heure",
        ]
      ),

      3: createLevel(
        3,
        {
          money: 8000,
          materials: 2100,
          influence: 100,
        },
        30 * 60,
        [
          "Production d’Équipements : 18 par heure",
        ],
        ["Armement léger"]
      ),

      4: createLevel(
        4,
        {
          money: 16000,
          materials: 4200,
          influence: 250,
        },
        60 * 60,
        [
          "Production d’Équipements : 30 par heure",
        ],
        [
          "Amélioration des protections légères",
        ]
      ),

      5: createLevel(
        5,
        {
          money: 32000,
          materials: 8500,
          influence: 600,
        },
        2 * 60 * 60,
        [
          "Production d’Équipements : 50 par heure",
        ],
        [
          "Équipement des Tireurs",
          "Armement spécialisé",
        ]
      ),

      6: createLevel(
        6,
        {
          money: 58000,
          materials: 15000,
          influence: 1200,
        },
        5 * 60 * 60,
        [
          "Production d’Équipements : 80 par heure",
        ]
      ),

      7: createLevel(
        7,
        {
          money: 100000,
          materials: 26000,
          influence: 2400,
        },
        10 * 60 * 60,
        [
          "Production d’Équipements : 120 par heure",
        ],
        [
          "Équipement des Exécuteurs",
          "Protections renforcées",
        ]
      ),

      8: createLevel(
        8,
        {
          money: 170000,
          materials: 42000,
          influence: 4500,
        },
        18 * 60 * 60,
        [
          "Production d’Équipements : 180 par heure",
        ]
      ),

      9: createLevel(
        9,
        {
          money: 280000,
          materials: 68000,
          influence: 8000,
        },
        30 * 60 * 60,
        [
          "Production d’Équipements : 260 par heure",
        ],
        [
          "Équipements tactiques avancés",
          "Blindages renforcés",
        ]
      ),

      10: createLevel(
        10,
        {
          money: 470000,
          materials: 110000,
          influence: 14000,
        },
        52 * 60 * 60,
        [
          "Production d’Équipements : 380 par heure",
          "+10 % d’efficacité des équipements de troupes",
        ],
        [
          "Équipements d’élite",
          "Équipement des Capos",
        ]
      ),
    },
  },
}

// =====================================================
// FONCTIONS UTILITAIRES
// =====================================================

export function getVillaConstructionSpeedPercent(
  villaLevel: number
) {
  const safeLevel = Math.max(
    1,
    Number(villaLevel) || 1
  )

  return (safeLevel - 1) * 3
}

export function applyVillaConstructionSpeed(
  baseSeconds: number,
  villaLevel: number
) {
  const speedPercent =
    getVillaConstructionSpeedPercent(
      villaLevel
    )

  const speedMultiplier =
    1 + speedPercent / 100

  return Math.max(
    1,
    Math.ceil(
      baseSeconds / speedMultiplier
    )
  )
}

export function getTier(level: number) {
  if (level <= 2) return 1
  if (level <= 4) return 2
  if (level <= 6) return 3
  if (level <= 9) return 4

  return 5
}

export function getLevelProgression(
  type: ProgressionBuildingType,
  targetLevel: number
) {
  return (
    BUILDING_PROGRESSIONS[type]?.levels[
      targetLevel
    ] ?? null
  )
}

export function getNextLevelProgression(
  type: ProgressionBuildingType,
  currentLevel: number
) {
  return getLevelProgression(
    type,
    currentLevel + 1
  )
}

export function getBuildingMaxLevel(
  type: ProgressionBuildingType
) {
  return (
    BUILDING_PROGRESSIONS[type]
      .maxLevel
  )
}