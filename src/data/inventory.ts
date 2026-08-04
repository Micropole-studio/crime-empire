import type {
  Building,
} from "../types/building"

import type {
  InventoryPayload,
  SpeedupScope,
  SpeedupTarget,
} from "../types/inventory"

export type InventoryItemDefinition = {
  key: string
  name: string
  description: string
  icon: string
  category: "loot" | "boost" | "object"
  acceleratorScope?: SpeedupScope
  seconds?: number
}

function createSpeedupDefinition(
  key: string,
  name: string,
  description: string,
  icon: string,
  acceleratorScope: SpeedupScope,
  seconds: number
): InventoryItemDefinition {
  return {
    key,
    name,
    description,
    icon,
    category: "boost",
    acceleratorScope,
    seconds,
  }
}

export const INVENTORY_ITEM_DEFINITIONS: Record<
  string,
  InventoryItemDefinition
> = {
  money_bag: {
    key: "money_bag",
    name: "Sac de billets",
    description:
      "Un butin d'argent récupéré pendant une opération.",
    icon: "💼",
    category: "loot",
  },

  material_crate: {
    key: "material_crate",
    name: "Caisse de matériaux",
    description:
      "Des matériaux utilisables pour les bâtiments et les améliorations.",
    icon: "📦",
    category: "loot",
  },

  materials_crate: {
    key: "materials_crate",
    name: "Caisse de matériaux",
    description:
      "Des matériaux utilisables pour les bâtiments et les améliorations.",
    icon: "📦",
    category: "loot",
  },

  equipment_case: {
    key: "equipment_case",
    name: "Lot d'équipements",
    description:
      "Des équipements destinés au recrutement et aux opérations militaires.",
    icon: "🧰",
    category: "loot",
  },

  influence_files: {
    key: "influence_files",
    name: "Dossiers compromettants",
    description:
      "Des informations pouvant être transformées en Influence.",
    icon: "🗂️",
    category: "loot",
  },

  mixed_loot: {
    key: "mixed_loot",
    name: "Butin d'opération",
    description:
      "Un lot contenant plusieurs ressources différentes.",
    icon: "🎁",
    category: "loot",
  },

  construction_speedup_1m:
    createSpeedupDefinition(
      "construction_speedup_1m",
      "Accélération de construction",
      "Réduit d'une minute le temps restant d'une construction.",
      "🏗️",
      "construction",
      60
    ),

  construction_speedup_5m:
    createSpeedupDefinition(
      "construction_speedup_5m",
      "Accélération de construction",
      "Réduit de cinq minutes le temps restant d'une construction.",
      "🏗️",
      "construction",
      300
    ),

  construction_speedup_1h:
    createSpeedupDefinition(
      "construction_speedup_1h",
      "Accélération de construction",
      "Réduit d'une heure le temps restant d'une construction.",
      "🏗️",
      "construction",
      3600
    ),

  recruitment_speedup_1m:
    createSpeedupDefinition(
      "recruitment_speedup_1m",
      "Accélération de recrutement",
      "Réduit d'une minute le temps restant d'un recrutement.",
      "🕴️",
      "recruitment",
      60
    ),

  recruitment_speedup_5m:
    createSpeedupDefinition(
      "recruitment_speedup_5m",
      "Accélération de recrutement",
      "Réduit de cinq minutes le temps restant d'un recrutement.",
      "🕴️",
      "recruitment",
      300
    ),

  recruitment_speedup_1h:
    createSpeedupDefinition(
      "recruitment_speedup_1h",
      "Accélération de recrutement",
      "Réduit d'une heure le temps restant d'un recrutement.",
      "🕴️",
      "recruitment",
      3600
    ),

  research_speedup_1m:
    createSpeedupDefinition(
      "research_speedup_1m",
      "Accélération de recherche",
      "Réduit d'une minute le temps restant d'une recherche.",
      "🧪",
      "research",
      60
    ),

  research_speedup_5m:
    createSpeedupDefinition(
      "research_speedup_5m",
      "Accélération de recherche",
      "Réduit de cinq minutes le temps restant d'une recherche.",
      "🧪",
      "research",
      300
    ),

  research_speedup_1h:
    createSpeedupDefinition(
      "research_speedup_1h",
      "Accélération de recherche",
      "Réduit d'une heure le temps restant d'une recherche.",
      "🧪",
      "research",
      3600
    ),

  universal_speedup_1m:
    createSpeedupDefinition(
      "universal_speedup_1m",
      "Accélérateur universel",
      "Réduit d'une minute une construction, un recrutement ou une recherche.",
      "⚡",
      "universal",
      60
    ),

  universal_speedup_5m:
    createSpeedupDefinition(
      "universal_speedup_5m",
      "Accélérateur universel",
      "Réduit de cinq minutes une construction, un recrutement ou une recherche.",
      "⚡",
      "universal",
      300
    ),

  universal_speedup_1h:
    createSpeedupDefinition(
      "universal_speedup_1h",
      "Accélérateur universel",
      "Réduit d'une heure une construction, un recrutement ou une recherche.",
      "⚡",
      "universal",
      3600
    ),
}

export const INVENTORY_SLOTS_BY_HIDEOUT_LEVEL: Record<
  number,
  number
> = {
  0: 5,
  1: 10,
  2: 15,
  3: 20,
  4: 27,
  5: 35,
  6: 45,
  7: 55,
  8: 68,
  9: 82,
  10: 100,
}

const BUILDING_LABELS: Record<
  string,
  string
> = {
  villa: "Villa",
  workshop: "Garage",
  hideout: "Planque",
  wall: "Sécurité",
  laboratory: "Laboratoire",
  syndicate: "Syndicat",
  factory: "Usine",
}

const TROOP_LABELS: Record<
  string,
  string
> = {
  henchman_1:
    "Hommes de main I",
  henchman_2:
    "Hommes de main II",
  henchman_3:
    "Hommes de main III",
  lieutenant_1:
    "Lieutenants I",
}

const RESEARCH_LABELS: Record<
  string,
  string
> = {
  reinforced_training:
    "Entraînement renforcé",
  recruitment_capacity_1:
    "Organisation du recrutement I",
  recruitment_speed_1:
    "Entraînement accéléré I",
  recruitment_capacity_2:
    "Organisation du recrutement II",
  henchman_doctrine:
    "Doctrine des hommes de main",
  second_recruitment_queue:
    "Centre d'entraînement parallèle",
  criminal_command:
    "Commandement criminel",

  underground_accounting_1:
    "Comptabilité parallèle I",
  supplier_network_1:
    "Réseau de fournisseurs I",
  ghost_workshops_1:
    "Ateliers fantômes I",
  influence_network_1:
    "Réseau d'influence I",
  hidden_warehouses_1:
    "Entrepôts dissimulés I",

  clandestine_routes_1:
    "Itinéraires clandestins I",
  clandestine_routes_2:
    "Itinéraires clandestins II",
  loot_organization_1:
    "Organisation du butin I",
  loot_organization_2:
    "Organisation du butin II",
  experienced_teams_1:
    "Équipes expérimentées I",
}

export function getHideoutLevel(
  buildings: Building[]
) {
  return buildings
    .filter(
      (building) =>
        building.type === "hideout"
    )
    .reduce(
      (highestLevel, building) =>
        Math.max(
          highestLevel,
          Number(building.level) || 0
        ),
      0
    )
}

export function getInventorySlotCapacity(
  buildings: Building[]
) {
  const hideoutLevel = Math.min(
    10,
    Math.max(
      0,
      Math.floor(
        getHideoutLevel(buildings)
      )
    )
  )

  return (
    INVENTORY_SLOTS_BY_HIDEOUT_LEVEL[
      hideoutLevel
    ] ??
    INVENTORY_SLOTS_BY_HIDEOUT_LEVEL[0]
  )
}

export function getInventoryItemDefinition(
  itemKey: string
): InventoryItemDefinition {
  return (
    INVENTORY_ITEM_DEFINITIONS[
      itemKey
    ] ?? {
      key: itemKey,
      name: "Objet inconnu",
      description:
        "Cet objet n'a pas encore de définition visuelle.",
      icon: "📦",
      category: "object",
    }
  )
}

export function getSpeedupScope(
  payload?: InventoryPayload | null
): SpeedupScope | null {
  const scope =
    payload?.accelerator_scope

  if (
    scope === "construction" ||
    scope === "recruitment" ||
    scope === "research" ||
    scope === "universal"
  ) {
    return scope
  }

  return null
}

export function getSpeedupSeconds(
  payload?: InventoryPayload | null
) {
  const seconds =
    Math.floor(
      Number(
        payload?.seconds
      ) || 0
    )

  return Math.max(
    0,
    seconds
  )
}

export function isSpeedupPayload(
  payload?: InventoryPayload | null
) {
  return Boolean(
    getSpeedupScope(payload) &&
      getSpeedupSeconds(payload) > 0
  )
}

export function getCompatibleSpeedupTargets(
  targets: SpeedupTarget[],
  scope: SpeedupScope
) {
  if (
    scope === "universal"
  ) {
    return targets
  }

  return targets.filter(
    (target) =>
      target.target_type ===
      scope
  )
}

export function getSpeedupTargetLabel(
  targetType: string,
  key: string,
  details?: string | null
) {
  let label = key

  if (
    targetType ===
    "construction"
  ) {
    label =
      BUILDING_LABELS[key] ??
      key
  }

  if (
    targetType ===
    "recruitment"
  ) {
    label =
      TROOP_LABELS[key] ??
      key
  }

  if (
    targetType ===
    "research"
  ) {
    label =
      RESEARCH_LABELS[key] ??
      key
  }

  return details
    ? `${label} — ${details}`
    : label
}
