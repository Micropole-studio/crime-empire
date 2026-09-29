import { TROOPS } from "./troops"

import {
  getCommanderMilitaryPowerBonusPercent,
} from "./commanderBonuses"

import type {
  CommanderSkills,
} from "../types/commander"

import type {
  HumanDeploymentSelection,
} from "../types/deployment"

import type {
  TroopType,
} from "../types/troop"

export type WorldPowerAssessment =
  | "overwhelming_advantage"
  | "advantage"
  | "balanced"
  | "dangerous"
  | "critical"

/*
 * La puissance d'opération est volontairement différente de la
 * « puissance globale de l'empire ». Elle ne mesure ici que la force
 * de l'escouade réellement envoyée sur la World Map.
 *
 * La formule reste simple pour cette première phase : attaque + défense
 * + 10 % des PV. Elle pourra ensuite être enrichie par l'équipement,
 * les contres d'unités, les véhicules et les bonus de territoire.
 */
export function getTroopOperationUnitPower(
  troopType: TroopType
) {
  const definition = TROOPS[troopType]

  if (!definition) {
    return 0
  }

  return Math.max(
    1,
    Math.round(
      definition.stats.attack +
        definition.stats.defense +
        definition.stats.health * 0.1
    )
  )
}

export function calculateWorldSquadBasePower(
  selection: HumanDeploymentSelection
) {
  return (
    Object.entries(selection) as Array<
      [TroopType, number | undefined]
    >
  ).reduce(
    (total, [troopType, quantity]) => {
      const safeQuantity = Math.max(
        0,
        Math.floor(Number(quantity) || 0)
      )

      return (
        total +
        safeQuantity *
          getTroopOperationUnitPower(
            troopType
          )
      )
    },
    0
  )
}

export function calculateWorldSquadPower(
  selection: HumanDeploymentSelection,
  commanderLevel: number,
  commanderSkills?: Partial<CommanderSkills> | null
) {
  const basePower =
    calculateWorldSquadBasePower(selection)

  const commanderBonusPercent =
    getCommanderMilitaryPowerBonusPercent(
      commanderLevel,
      commanderSkills
    )

  const totalPower = Math.max(
    0,
    Math.round(
      basePower *
        (1 + commanderBonusPercent / 100)
    )
  )

  return {
    basePower,
    commanderBonusPercent,
    totalPower,
  }
}

export function assessWorldPower(
  squadPower: number,
  enemyPower: number
): WorldPowerAssessment {
  const safeEnemyPower = Math.max(
    1,
    Number(enemyPower) || 1
  )

  const ratio =
    Math.max(0, Number(squadPower) || 0) /
    safeEnemyPower

  if (ratio >= 1.4) {
    return "overwhelming_advantage"
  }

  if (ratio >= 1.1) {
    return "advantage"
  }

  if (ratio >= 0.9) {
    return "balanced"
  }

  if (ratio >= 0.7) {
    return "dangerous"
  }

  return "critical"
}

import type {
  WorldCombatResult,
  WorldOperationRewards,
} from "../types/worldOperation"

import type {
  WorldRewardRange,
} from "../types/worldMap"

function createSeededRandom(
  seedText: string
) {
  let seed = 2166136261

  for (let index = 0; index < seedText.length; index += 1) {
    seed ^= seedText.charCodeAt(index)
    seed = Math.imul(seed, 16777619)
  }

  let state = seed >>> 0

  return () => {
    state =
      (Math.imul(state, 1664525) + 1013904223) >>> 0

    return state / 4294967296
  }
}

function randomInteger(
  minimum: number | undefined,
  maximum: number | undefined,
  random: () => number
) {
  const min = Math.max(
    0,
    Math.floor(Number(minimum) || 0)
  )

  const max = Math.max(
    min,
    Math.floor(Number(maximum) || min)
  )

  if (max <= min) {
    return min
  }

  return Math.floor(
    min + random() * (max - min + 1)
  )
}

function createRewards(
  rewards: WorldRewardRange | undefined,
  victory: boolean,
  random: () => number
): WorldOperationRewards {
  const commanderXp = Math.max(
    0,
    Math.floor(Number(rewards?.commanderXp) || 0)
  )

  if (!victory) {
    return {
      money: 0,
      materials: 0,
      equipment: 0,
      influence: 0,
      commanderXp:
        commanderXp > 0
          ? Math.max(5, Math.round(commanderXp * 0.25))
          : 0,
    }
  }

  return {
    money: randomInteger(
      rewards?.moneyMin,
      rewards?.moneyMax,
      random
    ),

    materials: randomInteger(
      rewards?.materialsMin,
      rewards?.materialsMax,
      random
    ),

    equipment: randomInteger(
      rewards?.equipmentMin,
      rewards?.equipmentMax,
      random
    ),

    influence: randomInteger(
      rewards?.influenceMin,
      rewards?.influenceMax,
      random
    ),

    commanderXp,
  }
}

function getCasualtyRate(
  victory: boolean,
  effectiveRatio: number,
  random: () => number
) {
  if (victory) {
    if (effectiveRatio >= 1.6) {
      return 0.04 + random() * 0.06
    }

    if (effectiveRatio >= 1.2) {
      return 0.08 + random() * 0.08
    }

    return 0.14 + random() * 0.11
  }

  if (effectiveRatio >= 0.8) {
    return 0.28 + random() * 0.14
  }

  if (effectiveRatio >= 0.6) {
    return 0.4 + random() * 0.15
  }

  return 0.55 + random() * 0.17
}

export function resolveWorldCombat({
  operationId,
  squadPower,
  enemyPower,
  selection,
  rewardRange,
}: {
  operationId: string
  squadPower: number
  enemyPower: number
  selection: HumanDeploymentSelection
  rewardRange?: WorldRewardRange
}): WorldCombatResult {
  const random = createSeededRandom(
    `${operationId}:combat-v1`
  )

  const attackerPower = Math.max(
    1,
    Math.round(Number(squadPower) || 1)
  )

  const defenderPower = Math.max(
    1,
    Math.round(Number(enemyPower) || 1)
  )

  const attackerEffectivePower = Math.max(
    1,
    Math.round(
      attackerPower * (0.92 + random() * 0.16)
    )
  )

  const enemyEffectivePower = Math.max(
    1,
    Math.round(
      defenderPower * (0.92 + random() * 0.16)
    )
  )

  const victory =
    attackerEffectivePower >= enemyEffectivePower

  const effectiveRatio =
    attackerEffectivePower /
    Math.max(1, enemyEffectivePower)

  const casualtyRate = getCasualtyRate(
    victory,
    effectiveRatio,
    random
  )

  const casualties: HumanDeploymentSelection = {}
  const survivors: HumanDeploymentSelection = {}

  const entries = Object.entries(selection) as Array<
    [TroopType, number | undefined]
  >

  let totalUnits = 0
  let totalCasualties = 0

  for (const [troopType, quantityValue] of entries) {
    const quantity = Math.max(
      0,
      Math.floor(Number(quantityValue) || 0)
    )

    totalUnits += quantity

    if (quantity <= 0) {
      casualties[troopType] = 0
      survivors[troopType] = 0
      continue
    }

    const exactLosses = quantity * casualtyRate
    let losses = Math.floor(exactLosses)

    if (
      random() < exactLosses - losses
    ) {
      losses += 1
    }

    losses = Math.min(
      quantity,
      Math.max(0, losses)
    )

    casualties[troopType] = losses
    survivors[troopType] = quantity - losses
    totalCasualties += losses
  }

  if (
    totalUnits > 0 &&
    totalCasualties === 0 &&
    casualtyRate >= 0.08
  ) {
    const firstAvailable = entries.find(
      ([, quantity]) =>
        Math.max(0, Math.floor(Number(quantity) || 0)) > 0
    )

    if (firstAvailable) {
      const [troopType] = firstAvailable
      casualties[troopType] = 1
      survivors[troopType] = Math.max(
        0,
        Math.floor(Number(selection[troopType]) || 0) - 1
      )
      totalCasualties = 1
    }
  }

  return {
    outcome: victory ? "victory" : "defeat",
    resolvedAt: new Date().toISOString(),
    attackerPower,
    enemyPower: defenderPower,
    attackerEffectivePower,
    enemyEffectivePower,
    casualties,
    survivors,
    casualtyPercent:
      totalUnits > 0
        ? Math.round((totalCasualties / totalUnits) * 100)
        : 0,
    rewards: createRewards(
      rewardRange,
      victory,
      random
    ),
  }
}
